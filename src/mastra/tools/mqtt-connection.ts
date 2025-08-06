import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import mqtt, { MqttClient } from 'mqtt';

let mqttClient: MqttClient | null = null;
let connectionConfig: any = null;

const connectionConfigSchema = z.object({
  broker_url: z.string().optional().describe('MQTT broker URL (ws://, wss://, mqtt://, mqtts://) - defaults to HIVEMQ_BROKER_URL'),
  client_id: z.string().optional().describe('Client ID (auto-generated if not provided)'),
  username: z.string().optional().describe('Username for authentication - defaults to HIVEMQ_USERNAME'),
  password: z.string().optional().describe('Password for authentication - defaults to HIVEMQ_PASSWORD'),
  clean_session: z.boolean().optional().default(true).describe('Clean session flag'),
  keep_alive: z.number().optional().default(60).describe('Keep alive interval in seconds'),
  reconnect: z.boolean().optional().default(true).describe('Enable automatic reconnection'),
});

const actionSchema = z.enum(['connect', 'disconnect', 'status']);

export const mqttConnectionTool = createTool({
  id: 'mqtt-connection',
  description: 'Manage MQTT broker connections',
  inputSchema: z.object({
    action: actionSchema,
    config: connectionConfigSchema.optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.string(),
    details: z.record(z.any()).optional(),
  }),
  execute: async ({ context }) => {
    const { action, config } = context;

    switch (action) {
      case 'connect':
        // Use environment variables as defaults if config not provided or missing values
        const effectiveConfig = {
          broker_url: config?.broker_url || process.env.HIVEMQ_BROKER_URL || process.env.MQTT_BROKER_URL,
          client_id: config?.client_id || process.env.MQTT_CLIENT_ID,
          username: config?.username || process.env.HIVEMQ_USERNAME || process.env.MQTT_USERNAME,
          password: config?.password || process.env.HIVEMQ_PASSWORD || process.env.MQTT_PASSWORD,
          clean_session: config?.clean_session ?? (process.env.MQTT_CLEAN_SESSION === 'true'),
          keep_alive: config?.keep_alive ?? parseInt(process.env.MQTT_KEEP_ALIVE || '60'),
          reconnect: config?.reconnect ?? true,
        };

        if (!effectiveConfig.broker_url) {
          return {
            success: false,
            status: 'Broker URL required. Provide in config or set HIVEMQ_BROKER_URL/MQTT_BROKER_URL environment variable',
          };
        }

        if (mqttClient && mqttClient.connected) {
          return {
            success: false,
            status: 'Already connected to broker',
            details: { broker_url: connectionConfig?.broker_url },
          };
        }

        try {
          connectionConfig = effectiveConfig;
          const options: any = {
            clientId: effectiveConfig.client_id || `mastra-iot-${Date.now()}`,
            clean: effectiveConfig.clean_session,
            keepalive: effectiveConfig.keep_alive,
            reconnectPeriod: effectiveConfig.reconnect ? 5000 : 0,
            connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || '30000'),
          };

          if (effectiveConfig.username && effectiveConfig.password) {
            options.username = effectiveConfig.username;
            options.password = effectiveConfig.password;
          }

          return new Promise((resolve) => {
            mqttClient = mqtt.connect(effectiveConfig.broker_url!, options);
            
            // Set connection timeout
            const timeoutId = setTimeout(() => {
              mqttClient?.end(true);
              resolve({
                success: false,
                status: `Connection timeout after ${options.connectTimeout}ms`,
                details: {
                  broker_url: effectiveConfig.broker_url,
                  timeout: options.connectTimeout
                }
              });
            }, options.connectTimeout);

            mqttClient.on('connect', () => {
              clearTimeout(timeoutId);
              console.log(`[MQTT] Connected to ${effectiveConfig.broker_url}`);
              resolve({
                success: true,
                status: 'Connected to MQTT broker',
                details: {
                  broker_url: effectiveConfig.broker_url,
                  client_id: options.clientId,
                },
              });
            });

            mqttClient.on('error', (error: any) => {
              clearTimeout(timeoutId);
              console.error('[MQTT] Connection error:', error.message);
              resolve({
                success: false,
                status: `Connection error: ${error.message}`,
                details: {
                  error_code: error.code || 'UNKNOWN',
                  broker_url: effectiveConfig.broker_url
                }
              });
            });
            
            // Add reconnection event handlers for better monitoring
            mqttClient.on('reconnect', () => {
              console.log('[MQTT] Attempting to reconnect...');
            });
            
            mqttClient.on('offline', () => {
              console.log('[MQTT] Client is offline');
            });
          });
        } catch (error) {
          return {
            success: false,
            status: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }

      case 'disconnect':
        if (!mqttClient) {
          return {
            success: false,
            status: 'No active connection',
          };
        }

        return new Promise((resolve) => {
          mqttClient!.end(false, {}, () => {
            mqttClient = null;
            connectionConfig = null;
            resolve({
              success: true,
              status: 'Disconnected from MQTT broker',
            });
          });
        });

      case 'status':
        return {
          success: true,
          status: mqttClient?.connected ? 'Connected' : 'Disconnected',
          details: {
            connected: mqttClient?.connected || false,
            broker_url: connectionConfig?.broker_url,
            client_id: mqttClient?.options.clientId,
          },
        };

      default:
        return {
          success: false,
          status: 'Invalid action',
        };
    }
  },
});

export function getMqttClient(): MqttClient | null {
  return mqttClient;
}
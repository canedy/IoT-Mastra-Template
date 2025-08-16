import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getMqttClient } from './mqtt-connection.js';

interface PublishQueue {
  topic: string;
  message: string | Buffer;
  options: any;
  timestamp: number;
}

const publishQueue: PublishQueue[] = [];
let queueInterval: NodeJS.Timeout | null = null;

const publishConfigSchema = z.object({
  topic: z.string().describe('MQTT topic to publish to'),
  message: z.union([z.string(), z.record(z.any())]).describe('Message to publish'),
  qos: z.enum(['0', '1', '2']).optional().default('1').describe('QoS level'),
  retain: z.boolean().optional().default(false).describe('Retained message flag'),
  properties: z.object({
    response_topic: z.string().optional(),
    correlation_data: z.string().optional(),
    user_properties: z.record(z.string()).optional(),
  }).optional().describe('MQTT 5.0 properties'),
});

const actionSchema = z.enum(['publish', 'publish_batch', 'publish_retained', 'clear_retained']);

export const mqttPublishTool = createTool({
  id: 'mqtt-publish',
  description: 'Publish messages to MQTT topics',
  inputSchema: z.object({
    action: actionSchema,
    config: publishConfigSchema.optional(),
    messages: z.array(publishConfigSchema).optional().describe('For batch publishing'),
    topic: z.string().optional().describe('Topic for clear_retained action'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.string(),
    details: z.record(z.any()).optional(),
  }),
  execute: async ({ context }) => {
    const { action, config, messages, topic } = context;
    const client = getMqttClient();

    if (!client || !client.connected) {
      // Queue message if disconnected and action is publish
      if ((action === 'publish' || action === 'publish_retained') && config) {
        const message = typeof config.message === 'object' 
          ? JSON.stringify(config.message) 
          : config.message;
        
        publishQueue.push({
          topic: config.topic,
          message,
          options: {
            qos: parseInt(config.qos || '1'),
            retain: config.retain || action === 'publish_retained',
            properties: config.properties,
          },
          timestamp: Date.now(),
        });

        startQueueProcessor();

        return {
          success: true,
          status: 'Message queued (client disconnected)',
          details: {
            queue_size: publishQueue.length,
          },
        };
      }

      return {
        success: false,
        status: 'MQTT client not connected',
      };
    }

    switch (action) {
      case 'publish':
        if (!config) {
          return {
            success: false,
            status: 'Configuration required for publish action',
          };
        }

        return publishMessage(client, config);

      case 'publish_batch':
        if (!messages || messages.length === 0) {
          return {
            success: false,
            status: 'Messages array required for batch publish',
          };
        }

        const results = await Promise.all(
          messages.map(msg => publishMessage(client, msg))
        );

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return {
          success: succeeded > 0,
          status: `Published ${succeeded} message(s), ${failed} failed`,
          details: {
            total: messages.length,
            succeeded,
            failed,
            results: failed > 0 ? results : undefined,
          },
        };

      case 'publish_retained':
        if (!config) {
          return {
            success: false,
            status: 'Configuration required for publish_retained action',
          };
        }

        return publishMessage(client, { ...config, retain: true });

      case 'clear_retained':
        if (!topic) {
          return {
            success: false,
            status: 'Topic required for clear_retained action',
          };
        }

        return new Promise((resolve) => {
          client.publish(topic, '', { retain: true }, (err) => {
            if (err) {
              resolve({
                success: false,
                status: `Failed to clear retained message: ${err.message}`,
              });
            } else {
              resolve({
                success: true,
                status: `Cleared retained message for ${topic}`,
              });
            }
          });
        });

      default:
        return {
          success: false,
          status: 'Invalid action',
        };
    }
  },
});

async function publishMessage(
  client: any,
  config: z.infer<typeof publishConfigSchema>
): Promise<{ success: boolean; status: string; details?: any }> {
  const message = typeof config.message === 'object' 
    ? JSON.stringify(config.message) 
    : config.message;

  // Validate message size (MQTT limit is typically 256MB but we'll use a reasonable limit)
  const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
  if (Buffer.byteLength(message) > MAX_MESSAGE_SIZE) {
    return {
      success: false,
      status: 'Message size exceeds limit (1MB)',
      details: {
        size: Buffer.byteLength(message),
        limit: MAX_MESSAGE_SIZE,
      },
    };
  }

  const options: any = {
    qos: parseInt(config.qos || '1') as 0 | 1 | 2,
    retain: config.retain || false,
  };

  if (config.properties) {
    options.properties = config.properties;
  }

  return new Promise((resolve) => {
    client.publish(config.topic, message, options, (err: any) => {
      if (err) {
        resolve({
          success: false,
          status: `Publish failed: ${err.message}`,
        });
      } else {
        resolve({
          success: true,
          status: `Published to ${config.topic}`,
          details: {
            topic: config.topic,
            size: Buffer.byteLength(message),
            qos: options.qos,
            retained: options.retain,
            timestamp: new Date().toISOString(),
          },
        });
      }
    });
  });
}

function startQueueProcessor() {
  if (queueInterval) return;

  queueInterval = setInterval(() => {
    const client = getMqttClient();
    if (!client || !client.connected || publishQueue.length === 0) {
      if (publishQueue.length === 0 && queueInterval) {
        clearInterval(queueInterval);
        queueInterval = null;
      }
      return;
    }

    // Process queued messages
    const toProcess = publishQueue.splice(0, 10); // Process up to 10 messages at a time
    toProcess.forEach(item => {
      client.publish(item.topic, item.message, item.options, (err: any) => {
        if (err) {
          console.error(`[MQTT] Failed to publish queued message: ${err.message}`);
          // Re-queue if recent
          if (Date.now() - item.timestamp < 300000) { // 5 minutes
            publishQueue.push(item);
          }
        } else {
          console.log(`[MQTT] Published queued message to ${item.topic}`);
        }
      });
    });
  }, 1000);
}
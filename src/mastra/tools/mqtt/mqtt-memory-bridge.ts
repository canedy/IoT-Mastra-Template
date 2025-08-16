import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getMqttClient } from './mqtt-connection.js';
import { addSensorData } from '../utils/shared-memory-tool.js';

// Tool to bridge MQTT messages to agent memory
// When enabled, all MQTT messages are processed through the agent and stored in memory

let bridgeEnabled = false;
let messageHandler: any = null;

export const mqttMemoryBridgeTool = createTool({
  id: 'mqtt-memory-bridge',
  description: 'Enable/disable automatic storage of MQTT messages in agent memory',
  inputSchema: z.object({
    action: z.enum(['enable', 'disable', 'status']).describe('Action to perform'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.string(),
    enabled: z.boolean(),
  }),
  execute: async ({ context, mastra }) => {
    const { action } = context;
    const client = getMqttClient();
    
    switch (action) {
      case 'enable':
        if (!client || !client.connected) {
          return {
            success: false,
            status: 'MQTT client not connected. Connect first.',
            enabled: false,
          };
        }
        
        if (bridgeEnabled) {
          return {
            success: true,
            status: 'Memory bridge already enabled',
            enabled: true,
          };
        }
        
        // Create the message handler that processes through the agent
        messageHandler = async (topic: string, message: Buffer) => {
          try {
            let parsedMessage: any;
            try {
              parsedMessage = JSON.parse(message.toString());
            } catch {
              parsedMessage = message.toString();
            }
            
            // Create a prompt for the agent to process and store
            const prompt = `
              Received MQTT message on topic: ${topic}
              Data: ${JSON.stringify(parsedMessage, null, 2)}
              Timestamp: ${new Date().toISOString()}
              
              Please analyze this sensor reading, identify any important patterns or anomalies, 
              and remember this data for future reference.
            `;
            
            // Process through the agent with consistent thread ID
            if (mastra) {
              const agent = mastra.getAgent('chickenCoopAgent');
              if (agent) {
                const response = await agent.generate([{
                  role: 'user',
                  content: prompt,
                }]);
                
                // Also store in shared memory for cross-thread access
                addSensorData(topic, parsedMessage, response.text);
                
                console.log(`\n💾 Stored in memory: ${topic}`);
                console.log(`   Agent analysis: ${response.text.substring(0, 80)}...`);
              }
            }
          } catch (error) {
            console.error('Error storing MQTT message in memory:', error);
          }
        };
        
        // Attach the handler
        client.on('message', messageHandler);
        bridgeEnabled = true;
        
        return {
          success: true,
          status: 'MQTT messages will now be stored in agent memory',
          enabled: true,
        };
        
      case 'disable':
        if (!bridgeEnabled) {
          return {
            success: true,
            status: 'Memory bridge already disabled',
            enabled: false,
          };
        }
        
        if (client && messageHandler) {
          client.removeListener('message', messageHandler);
        }
        
        bridgeEnabled = false;
        messageHandler = null;
        
        return {
          success: true,
          status: 'MQTT memory storage disabled',
          enabled: false,
        };
        
      case 'status':
        return {
          success: true,
          status: bridgeEnabled ? 'Memory bridge is active' : 'Memory bridge is inactive',
          enabled: bridgeEnabled,
        };
        
      default:
        return {
          success: false,
          status: 'Invalid action',
          enabled: bridgeEnabled,
        };
    }
  },
});
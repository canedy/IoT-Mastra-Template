import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getMqttClient } from '../mqtt/mqtt-connection.js';

// Tool to control the chicken feeder via MQTT commands
export const feederControlTool = createTool({
  id: 'feeder-control',
  description: 'Control the automatic chicken feeder via MQTT commands',
  inputSchema: z.object({
    action: z.enum(['open', 'close', 'status']).describe('Action to perform on the feeder'),
    duration: z.number().optional().default(30).describe('Duration in seconds to keep feeder open'),
    coopId: z.string().optional().default('main').describe('Identifier for the coop'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    command: z.string().optional(),
    topic: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { action, duration, coopId } = context;
    const client = getMqttClient();
    
    if (!client || !client.connected) {
      return {
        success: false,
        message: 'MQTT client not connected. Cannot send feeder commands.',
      };
    }
    
    const topic = `commands/coop/${coopId}/feeder`;
    let command: any;
    let message: string;
    
    switch (action) {
      case 'open':
        command = {
          action: 'open',
          duration: duration,
          timestamp: new Date().toISOString(),
          reason: 'feeding_time',
        };
        message = `Opening feeder for ${duration} seconds`;
        break;
        
      case 'close':
        command = {
          action: 'close',
          timestamp: new Date().toISOString(),
        };
        message = 'Closing feeder immediately';
        break;
        
      case 'status':
        command = {
          action: 'status',
          timestamp: new Date().toISOString(),
        };
        message = 'Requesting feeder status';
        break;
        
      default:
        return {
          success: false,
          message: 'Invalid feeder action',
        };
    }
    
    return new Promise((resolve) => {
      client.publish(topic, JSON.stringify(command), { qos: 1 }, (err) => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to send feeder command: ${err.message}`,
          });
        } else {
          console.log(`📤 Sent feeder command: ${action} to ${topic}`);
          resolve({
            success: true,
            message: `${message}. Command sent to IoT device.`,
            command: JSON.stringify(command),
            topic,
          });
        }
      });
    });
  },
});
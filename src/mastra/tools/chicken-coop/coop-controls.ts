import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getMqttClient } from '../mqtt/mqtt-connection.js';

// Tool to control various coop environmental systems
export const coopControlsTool = createTool({
  id: 'coop-controls',
  description: 'Control coop environmental systems: ventilation, water supply, and shade awning',
  inputSchema: z.object({
    system: z.enum(['ventilation', 'water', 'awning']).describe('System to control'),
    action: z.enum(['on', 'off', 'open', 'close', 'increase', 'decrease', 'status']).describe('Action to perform'),
    level: z.number().min(0).max(100).optional().describe('Level/intensity (0-100) for gradual controls'),
    duration: z.number().default(0).describe('Duration in seconds (0 = indefinite)'),
    coopId: z.string().optional().default('main').describe('Identifier for the coop'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    command: z.string().optional(),
    topic: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { system, action, level, duration, coopId } = context;
    const client = getMqttClient();
    
    if (!client || !client.connected) {
      return {
        success: false,
        message: 'MQTT client not connected. Cannot send coop control commands.',
      };
    }
    
    const topic = `commands/coop/${coopId}/${system}`;
    let command: any;
    let message: string;
    
    // Build command based on system and action
    switch (system) {
      case 'ventilation':
        command = buildVentilationCommand(action, level, duration);
        message = getVentilationMessage(action, level, duration);
        break;
        
      case 'water':
        command = buildWaterCommand(action, level, duration);
        message = getWaterMessage(action, level, duration);
        break;
        
      case 'awning':
        command = buildAwningCommand(action, level, duration);
        message = getAwningMessage(action, level, duration);
        break;
        
      default:
        return {
          success: false,
          message: 'Invalid system specified',
        };
    }
    
    if (!command) {
      return {
        success: false,
        message: `Invalid action '${action}' for system '${system}'`,
      };
    }
    
    // Add common fields
    command.timestamp = new Date().toISOString();
    command.coopId = coopId;
    
    return new Promise((resolve) => {
      client.publish(topic, JSON.stringify(command), { qos: 1 }, (err) => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to send ${system} command: ${err.message}`,
          });
        } else {
          console.log(`📤 Sent ${system} command: ${action} to ${topic}`);
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

// Ventilation system commands
function buildVentilationCommand(action: string, level?: number, duration?: number) {
  switch (action) {
    case 'on':
      return { action: 'start', intensity: level || 50, duration };
    case 'off':
      return { action: 'stop' };
    case 'increase':
      return { action: 'adjust', change: 'increase', amount: level || 25 };
    case 'decrease': 
      return { action: 'adjust', change: 'decrease', amount: level || 25 };
    case 'status':
      return { action: 'status' };
    default:
      return null;
  }
}

function getVentilationMessage(action: string, level?: number, duration?: number): string {
  switch (action) {
    case 'on':
      return `Starting ventilation at ${level || 50}% intensity${duration ? ` for ${duration} seconds` : ''}`;
    case 'off':
      return 'Stopping ventilation system';
    case 'increase':
      return `Increasing ventilation by ${level || 25}%`;
    case 'decrease':
      return `Decreasing ventilation by ${level || 25}%`;
    case 'status':
      return 'Requesting ventilation system status';
    default:
      return 'Invalid ventilation action';
  }
}

// Water system commands
function buildWaterCommand(action: string, level?: number, duration?: number) {
  switch (action) {
    case 'on':
      return { action: 'dispense', amount: level || 100, duration: duration || 30 };
    case 'off':
      return { action: 'stop' };
    case 'open':
      return { action: 'open_valve', duration: duration || 60 };
    case 'close':
      return { action: 'close_valve' };
    case 'status':
      return { action: 'status' };
    default:
      return null;
  }
}

function getWaterMessage(action: string, level?: number, duration?: number): string {
  switch (action) {
    case 'on':
      return `Dispensing ${level || 100}ml of fresh water${duration ? ` over ${duration} seconds` : ''}`;
    case 'off':
      return 'Stopping water dispensing';
    case 'open':
      return `Opening water valve${duration ? ` for ${duration} seconds` : ''}`;
    case 'close':
      return 'Closing water valve';
    case 'status':
      return 'Requesting water system status';
    default:
      return 'Invalid water action';
  }
}

// Awning/shade system commands
function buildAwningCommand(action: string, level?: number, duration?: number) {
  switch (action) {
    case 'open':
      return { action: 'extend', coverage: level || 100, duration };
    case 'close':
      return { action: 'retract', coverage: level || 0 };
    case 'increase':
      return { action: 'adjust', direction: 'extend', amount: level || 25 };
    case 'decrease':
      return { action: 'adjust', direction: 'retract', amount: level || 25 };
    case 'status':
      return { action: 'status' };
    default:
      return null;
  }
}

function getAwningMessage(action: string, level?: number, duration?: number): string {
  switch (action) {
    case 'open':
      return `Extending awning to ${level || 100}% coverage${duration ? ` for ${duration} seconds` : ''}`;
    case 'close':
      return `Retracting awning to ${level || 0}% coverage`;
    case 'increase':
      return `Extending awning by ${level || 25}% more coverage`;
    case 'decrease':
      return `Retracting awning by ${level || 25}% coverage`;
    case 'status':
      return 'Requesting awning system status';
    default:
      return 'Invalid awning action';
  }
}
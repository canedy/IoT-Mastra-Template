import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Universal logging tool for IoT events and agent responses
export const logEventTool = createTool({
  id: 'log-event',
  description: 'Log IoT events and agent responses with different severity levels',
  inputSchema: z.object({
    message: z.string().describe('Message to log'),
    level: z.enum(['info', 'warning', 'error']).optional().default('info'),
    metadata: z.record(z.any()).optional().describe('Additional context data'),
  }),
  outputSchema: z.object({
    logged: z.boolean(),
    timestamp: z.string(),
    level: z.string(),
  }),
  execute: async ({ context }) => {
    const timestamp = new Date().toISOString();
    const { message, level, metadata } = context;
    
    // Console output with formatting based on level
    const prefix = {
      info: '📊',
      warning: '⚠️',
      error: '🔴'
    }[level || 'info'];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    if (metadata) {
      console.log('  Metadata:', JSON.stringify(metadata, null, 2));
    }
    
    return {
      logged: true,
      timestamp,
      level: level || 'info',
    };
  },
});
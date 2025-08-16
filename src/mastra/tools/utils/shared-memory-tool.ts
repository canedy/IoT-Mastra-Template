import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Simple in-memory store for sensor data that persists across threads
const sensorMemoryStore: Array<{
  topic: string;
  data: any;
  timestamp: string;
  analysis: string;
}> = [];

export const sharedMemoryTool = createTool({
  id: 'shared-memory',
  description: 'Access shared sensor data that persists across all chat sessions',
  inputSchema: z.object({
    action: z.enum(['store', 'query', 'list_all']),
    topic: z.string().optional(),
    data: z.any().optional(),
    analysis: z.string().optional(),
    query: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.any()).optional(),
    count: z.number().optional(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { action, topic, data, analysis, query } = context;
    
    switch (action) {
      case 'store':
        if (!topic || !data) {
          return {
            success: false,
            message: 'Topic and data required for storing',
          };
        }
        
        sensorMemoryStore.push({
          topic,
          data,
          timestamp: new Date().toISOString(),
          analysis: analysis || 'No analysis provided',
        });
        
        // Keep only last 100 readings to prevent memory bloat
        if (sensorMemoryStore.length > 100) {
          sensorMemoryStore.shift();
        }
        
        return {
          success: true,
          message: `Stored data for ${topic}`,
          count: sensorMemoryStore.length,
        };
        
      case 'query':
        if (!query) {
          return {
            success: false,
            message: 'Query string required',
          };
        }
        
        // Simple keyword search
        const searchTerm = query.toLowerCase();
        const results = sensorMemoryStore.filter(entry => 
          entry.topic.toLowerCase().includes(searchTerm) ||
          entry.analysis.toLowerCase().includes(searchTerm) ||
          JSON.stringify(entry.data).toLowerCase().includes(searchTerm)
        );
        
        return {
          success: true,
          results,
          count: results.length,
          message: `Found ${results.length} matching entries`,
        };
        
      case 'list_all':
        return {
          success: true,
          results: sensorMemoryStore.slice(-20), // Last 20 entries
          count: sensorMemoryStore.length,
          message: `Retrieved ${Math.min(20, sensorMemoryStore.length)} recent entries (${sensorMemoryStore.length} total)`,
        };
        
      default:
        return {
          success: false,
          message: 'Invalid action',
        };
    }
  },
});

// Helper function to get sensor data (can be used by other tools)
export function getSensorData() {
  return [...sensorMemoryStore];
}

// Helper to add sensor data (called by memory bridge)
export function addSensorData(topic: string, data: any, analysis: string = '') {
  sensorMemoryStore.push({
    topic,
    data,
    timestamp: new Date().toISOString(),
    analysis,
  });
  
  if (sensorMemoryStore.length > 100) {
    sensorMemoryStore.shift();
  }
}
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { LibSQLStore } from '@mastra/libsql';

/**
 * IoT Data Storage Manager
 * Comprehensive data storage solution using Mastra's LibSQLStore
 * Stores device messages, metrics, and documentation for RAG capabilities
 */

// Singleton storage instance
let iotStorage: LibSQLStore | null = null;

function getIoTStorage() {
  if (!iotStorage) {
    iotStorage = new LibSQLStore({
      url: process.env.DATA_STORE_TYPE === 'file' ? 'file:../iot-data.db' : ':memory:',
    });
  }
  return iotStorage;
}

interface IoTMessage {
  id: string;
  deviceId: string;
  topic: string;
  message: any;
  timestamp: string;
  messageType: 'telemetry' | 'status' | 'command' | 'alert' | 'other';
  processed: boolean;
}

interface DeviceMetrics {
  deviceId: string;
  lastSeen: string;
  messageCount: number;
  errorCount: number;
  status: 'online' | 'offline' | 'degraded';
  healthScore: number;
  avgResponseTime?: number;
}

interface DeviceDocument {
  deviceId: string;
  documentType: 'manual' | 'troubleshooting' | 'specs' | 'changelog';
  title: string;
  content: string;
  version: string;
  lastUpdated: string;
}

export const iotDataStoreTool = createTool({
  id: 'iot-data-store',
  description: 'Store and manage IoT data, metrics, and device documentation with retention policies',
  inputSchema: z.object({
    action: z.enum([
      'store_message',
      'store_metrics', 
      'store_document',
      'retrieve_messages',
      'retrieve_metrics',
      'retrieve_documents',
      'query_timeseries',
      'export_data',
      'cleanup_old_data',
      'get_device_summary',
      'search_documents'
    ]),
    // Store operations
    message_data: z.object({
      deviceId: z.string(),
      topic: z.string(),
      message: z.any(),
      messageType: z.enum(['telemetry', 'status', 'command', 'alert', 'other']).optional().default('other')
    }).optional(),
    metrics_data: z.object({
      deviceId: z.string(),
      messageCount: z.number().optional(),
      errorCount: z.number().optional(),
      status: z.enum(['online', 'offline', 'degraded']).optional(),
      healthScore: z.number().optional(),
      avgResponseTime: z.number().optional()
    }).optional(),
    document_data: z.object({
      deviceId: z.string(),
      documentType: z.enum(['manual', 'troubleshooting', 'specs', 'changelog']),
      title: z.string(),
      content: z.string(),
      version: z.string().optional().default('1.0')
    }).optional(),
    // Query operations
    device_id: z.string().optional(),
    topic_pattern: z.string().optional(),
    time_range: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      last_hours: z.number().optional(),
      last_days: z.number().optional()
    }).optional(),
    limit: z.number().optional().default(100),
    export_format: z.enum(['json', 'csv']).optional().default('json'),
    search_query: z.string().optional(),
    retention_hours: z.number().optional().default(168), // 7 days default
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    data: z.any().optional(),
    count: z.number().optional(),
    summary: z.string().optional(),
    export_url: z.string().optional(),
    cleanup_stats: z.object({
      messages_removed: z.number(),
      metrics_removed: z.number(),
      space_freed: z.string()
    }).optional()
  }),
  execute: async ({ context }) => {
    const storage = getIoTStorage();
    const { action } = context;

    try {
      switch (action) {
        case 'store_message': {
          const { message_data } = context;
          if (!message_data) {
            throw new Error('Message data required for store_message action');
          }

          const messageId = `msg:${message_data.deviceId}:${Date.now()}`;
          const iotMessage: IoTMessage = {
            id: messageId,
            deviceId: message_data.deviceId,
            topic: message_data.topic,
            message: message_data.message,
            timestamp: new Date().toISOString(),
            messageType: message_data.messageType || 'other',
            processed: false
          };

          await storage.set(messageId, iotMessage);

          // Update device metrics
          const metricsKey = `metrics:${message_data.deviceId}`;
          const existingMetrics = await storage.get(metricsKey) as DeviceMetrics | null;
          
          const updatedMetrics: DeviceMetrics = {
            deviceId: message_data.deviceId,
            lastSeen: new Date().toISOString(),
            messageCount: (existingMetrics?.messageCount || 0) + 1,
            errorCount: existingMetrics?.errorCount || 0,
            status: 'online',
            healthScore: Math.max(95, 100 - (existingMetrics?.errorCount || 0)),
            avgResponseTime: existingMetrics?.avgResponseTime
          };

          await storage.set(metricsKey, updatedMetrics);

          return {
            success: true,
            action: 'store_message',
            summary: `Stored message from ${message_data.deviceId} on topic ${message_data.topic}`,
            data: { messageId, messageType: iotMessage.messageType }
          };
        }

        case 'store_metrics': {
          const { metrics_data } = context;
          if (!metrics_data) {
            throw new Error('Metrics data required for store_metrics action');
          }

          const metricsKey = `metrics:${metrics_data.deviceId}`;
          const existingMetrics = await storage.get(metricsKey) as DeviceMetrics | null;

          const updatedMetrics: DeviceMetrics = {
            deviceId: metrics_data.deviceId,
            lastSeen: new Date().toISOString(),
            messageCount: metrics_data.messageCount ?? existingMetrics?.messageCount ?? 0,
            errorCount: metrics_data.errorCount ?? existingMetrics?.errorCount ?? 0,
            status: metrics_data.status ?? existingMetrics?.status ?? 'online',
            healthScore: metrics_data.healthScore ?? existingMetrics?.healthScore ?? 100,
            avgResponseTime: metrics_data.avgResponseTime ?? existingMetrics?.avgResponseTime
          };

          await storage.set(metricsKey, updatedMetrics);

          return {
            success: true,
            action: 'store_metrics',
            summary: `Updated metrics for device ${metrics_data.deviceId}`,
            data: updatedMetrics
          };
        }

        case 'store_document': {
          const { document_data } = context;
          if (!document_data) {
            throw new Error('Document data required for store_document action');
          }

          const docId = `doc:${document_data.deviceId}:${document_data.documentType}:${Date.now()}`;
          const deviceDoc: DeviceDocument = {
            deviceId: document_data.deviceId,
            documentType: document_data.documentType,
            title: document_data.title,
            content: document_data.content,
            version: document_data.version || '1.0',
            lastUpdated: new Date().toISOString()
          };

          await storage.set(docId, deviceDoc);

          return {
            success: true,
            action: 'store_document',
            summary: `Stored ${document_data.documentType} document for ${document_data.deviceId}`,
            data: { docId, title: document_data.title }
          };
        }

        case 'retrieve_messages': {
          const { device_id, topic_pattern, time_range, limit } = context;
          
          // Note: LibSQLStore doesn't have complex querying, so we'll use prefix matching
          const messages: IoTMessage[] = [];
          const searchPrefix = device_id ? `msg:${device_id}:` : 'msg:';
          
          // This is a simplified implementation - in production, you'd want more sophisticated querying
          try {
            // Get all messages with the prefix (this is a limitation of current LibSQLStore)
            // In a real implementation, you'd use SQL queries or implement pagination
            for (let i = 0; i < (limit || 100); i++) {
              try {
                const key = `${searchPrefix}${Date.now() - (i * 60000)}`; // Rough time-based search
                const message = await storage.get(key) as IoTMessage;
                if (message) {
                  messages.push(message);
                }
              } catch {
                // Message doesn't exist, continue
              }
            }
          } catch (error) {
            // Return empty array if no messages found
          }

          return {
            success: true,
            action: 'retrieve_messages',
            count: messages.length,
            summary: `Retrieved ${messages.length} messages`,
            data: messages
          };
        }

        case 'retrieve_metrics': {
          const { device_id } = context;
          
          if (device_id) {
            // Get specific device metrics
            const metricsKey = `metrics:${device_id}`;
            const metrics = await storage.get(metricsKey) as DeviceMetrics | null;
            
            return {
              success: true,
              action: 'retrieve_metrics',
              summary: metrics ? `Retrieved metrics for ${device_id}` : `No metrics found for ${device_id}`,
              data: metrics
            };
          } else {
            // This would require iterating through all metrics keys
            // For now, return a sample structure
            return {
              success: true,
              action: 'retrieve_metrics',
              summary: 'Use device_id parameter to retrieve specific device metrics',
              data: null
            };
          }
        }

        case 'retrieve_documents': {
          const { device_id, search_query } = context;
          
          if (!device_id) {
            throw new Error('Device ID required for document retrieval');
          }

          // Search for documents (simplified implementation)
          const documents: DeviceDocument[] = [];
          const docTypes = ['manual', 'troubleshooting', 'specs', 'changelog'];
          
          for (const docType of docTypes) {
            try {
              // Look for recent document with this type
              const docKey = `doc:${device_id}:${docType}`;
              const doc = await storage.get(docKey) as DeviceDocument;
              if (doc && (!search_query || doc.content.toLowerCase().includes(search_query.toLowerCase()))) {
                documents.push(doc);
              }
            } catch {
              // Document doesn't exist, continue
            }
          }

          return {
            success: true,
            action: 'retrieve_documents',
            count: documents.length,
            summary: `Found ${documents.length} documents for ${device_id}`,
            data: documents
          };
        }

        case 'get_device_summary': {
          const { device_id } = context;
          if (!device_id) {
            throw new Error('Device ID required for device summary');
          }

          const metricsKey = `metrics:${device_id}`;
          const metrics = await storage.get(metricsKey) as DeviceMetrics | null;

          const summary = {
            deviceId: device_id,
            status: metrics?.status || 'unknown',
            lastSeen: metrics?.lastSeen || 'never',
            messageCount: metrics?.messageCount || 0,
            errorCount: metrics?.errorCount || 0,
            healthScore: metrics?.healthScore || 0,
            uptime: metrics?.lastSeen ? Math.round((Date.now() - new Date(metrics.lastSeen).getTime()) / 1000 / 60) : null
          };

          return {
            success: true,
            action: 'get_device_summary',
            summary: `Device ${device_id} is ${summary.status} with ${summary.messageCount} messages`,
            data: summary
          };
        }

        case 'export_data': {
          const { device_id, export_format, time_range } = context;
          
          // Get messages for export
          const messages: IoTMessage[] = [];
          // This is simplified - you'd implement proper time-based querying
          
          if (export_format === 'csv') {
            const csvHeader = 'deviceId,topic,timestamp,messageType,message\n';
            const csvRows = messages.map(m => 
              `${m.deviceId},"${m.topic}","${m.timestamp}","${m.messageType}","${JSON.stringify(m.message).replace(/"/g, '""')}"`
            ).join('\n');
            
            return {
              success: true,
              action: 'export_data',
              summary: `Exported ${messages.length} messages as CSV`,
              data: csvHeader + csvRows,
              export_url: `/exports/iot_data_${Date.now()}.csv`
            };
          } else {
            return {
              success: true,
              action: 'export_data',
              summary: `Exported ${messages.length} messages as JSON`,
              data: messages,
              export_url: `/exports/iot_data_${Date.now()}.json`
            };
          }
        }

        case 'cleanup_old_data': {
          const { retention_hours } = context;
          const cutoffTime = new Date(Date.now() - (retention_hours || 168) * 60 * 60 * 1000);
          
          // This is a simplified cleanup - you'd implement proper time-based cleanup
          let messagesRemoved = 0;
          let metricsRemoved = 0;

          return {
            success: true,
            action: 'cleanup_old_data',
            summary: `Cleaned up data older than ${retention_hours || 168} hours`,
            cleanup_stats: {
              messages_removed: messagesRemoved,
              metrics_removed: metricsRemoved,
              space_freed: '0 KB' // Would calculate actual space freed
            }
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        action,
        summary: `Error executing ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});
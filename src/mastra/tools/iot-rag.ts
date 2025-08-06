import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { iotDataStoreTool } from './iot-data-store.js';

/**
 * IoT RAG (Retrieval-Augmented Generation) Tool
 * Provides intelligent document search and context-aware answers
 * for IoT device troubleshooting, manuals, and technical documentation
 * 
 * Targets "Best RAG template" category with IoT-specific knowledge base
 */

// Sample IoT documentation that can be stored in the data store
const sampleDocuments = [
  {
    deviceId: 'sensor-001',
    documentType: 'manual' as const,
    title: 'Temperature Sensor Configuration Guide',
    content: `
# Temperature Sensor Configuration Guide

## Overview
The IoT temperature sensor provides accurate environmental monitoring with MQTT connectivity.

## Configuration Steps
1. Connect to power (3.3V or 5V)
2. Configure WiFi credentials via web interface (192.168.4.1)
3. Set MQTT broker details:
   - Broker URL: your-broker.com:1883
   - Topic pattern: sensors/{location}/temperature
   - QoS: 1 (recommended for reliability)

## Troubleshooting
- **No data received**: Check WiFi connection and MQTT broker connectivity
- **Inaccurate readings**: Allow 5-minute warm-up period, check for direct sunlight
- **Connection drops**: Verify power supply stability, check network signal strength
- **High error rate**: Update firmware, check message frequency (max 1/second)

## MQTT Message Format
\`\`\`json
{
  "temperature": 23.5,
  "humidity": 45.2,
  "timestamp": "2024-01-15T10:30:00Z",
  "battery": 85,
  "signal_strength": -45
}
\`\`\`
`,
    version: '2.1'
  },
  {
    deviceId: 'actuator-001',
    documentType: 'troubleshooting' as const,
    title: 'Smart Actuator Troubleshooting Guide',
    content: `
# Smart Actuator Troubleshooting Guide

## Common Issues

### Actuator Not Responding to Commands
1. Check MQTT connection status
2. Verify command topic: devices/{device_id}/commands
3. Ensure proper JSON format:
   \`\`\`json
   {
     "command": "set_position",
     "value": 50,
     "timestamp": "2024-01-15T10:30:00Z"
   }
   \`\`\`

### High Error Rate (>5%)
- **Possible causes**: Network congestion, power fluctuations, mechanical binding
- **Solutions**: 
  - Reduce command frequency (max 1 command/5 seconds)
  - Check physical mounting and alignment
  - Verify power supply meets specifications (24V ±10%)

### Intermittent Connection Issues
- **Symptoms**: Device appears offline/online randomly
- **Diagnosis**: Check signal strength in status messages
- **Solutions**:
  - Move closer to WiFi access point
  - Use MQTT keep-alive of 60 seconds
  - Enable MQTT persistence (clean_session=false)

## Performance Optimization
- Use QoS 1 for commands (reliability)
- Use QoS 0 for status updates (speed)
- Implement exponential backoff for failed commands
- Monitor device temperature (overheating indicator)
`,
    version: '1.3'
  },
  {
    deviceId: 'gateway-001',
    documentType: 'specs' as const,
    title: 'IoT Gateway Technical Specifications',
    content: `
# IoT Gateway Technical Specifications

## Hardware Specifications
- **Processor**: ARM Cortex-A72 quad-core 1.5GHz
- **Memory**: 4GB LPDDR4, 32GB eMMC storage
- **Connectivity**: 
  - WiFi 802.11ac dual-band
  - Ethernet 10/100/1000
  - Bluetooth 5.0 LE
  - Optional: 4G LTE modem

## MQTT Capabilities
- **Concurrent connections**: Up to 1000 devices
- **Message throughput**: 10,000 messages/second
- **Topics supported**: Unlimited with wildcard support
- **QoS levels**: 0, 1, 2 (full support)
- **Retained messages**: Up to 10,000
- **Message size**: Max 256KB per message

## Environmental Specifications
- **Operating temperature**: -10°C to +60°C
- **Humidity**: 5% to 95% non-condensing
- **Power consumption**: 15W typical, 25W maximum
- **Enclosure rating**: IP54 (dust and water resistant)

## Network Configuration
Default MQTT broker settings:
- Port 1883 (unencrypted)
- Port 8883 (TLS encrypted)
- Port 8884 (WebSocket + TLS)
- Keep-alive: 60 seconds
- Clean session: configurable
- Username/password authentication supported

## Monitoring Endpoints
- Health check: /api/health
- Metrics: /api/metrics
- Device count: /api/devices/count
- Message statistics: /api/stats/messages
`,
    version: '3.0'
  },
  {
    deviceId: 'general',
    documentType: 'troubleshooting' as const,
    title: 'General IoT Troubleshooting Guide',
    content: `
# General IoT Troubleshooting Guide

## Connection Issues

### Device Won't Connect to MQTT Broker
1. **Check network connectivity**
   - Ping the broker hostname/IP
   - Verify firewall rules (ports 1883, 8883, 8884)
   - Check DNS resolution

2. **Verify MQTT credentials**
   - Username and password correct
   - Client ID unique and valid
   - Check broker access control lists (ACLs)

3. **Protocol issues**
   - MQTT version compatibility (3.1, 3.1.1, 5.0)
   - Certificate validation (for TLS connections)
   - Keep-alive timeout settings

### High Message Loss
- **Symptoms**: Expected messages not received
- **Causes**: Network congestion, broker overload, incorrect QoS
- **Solutions**:
  - Use QoS 1 or 2 for important messages
  - Implement message acknowledgment
  - Check broker capacity and scaling

## Performance Issues

### Slow Message Delivery
- Check network latency to broker
- Verify broker processing capacity
- Review message serialization format (JSON vs binary)
- Consider message batching for high-frequency data

### Memory Issues on Devices
- Monitor heap usage on embedded devices
- Implement message queuing with size limits
- Use lightweight JSON libraries
- Clear retained messages when not needed

## Security Best Practices
- Always use TLS encryption (port 8883)
- Implement certificate-based authentication
- Regular credential rotation
- Network segmentation for IoT devices
- Monitor for unauthorized access attempts

## Common Error Codes
- **Connection refused (5)**: Bad credentials
- **Connection timeout**: Network/firewall issue
- **Protocol error**: MQTT version mismatch
- **Topic not authorized**: ACL permission denied
`,
    version: '1.0'
  }
];

export const iotRAGTool = createTool({
  id: 'iot-rag',
  description: 'Intelligent document search and context-aware answers for IoT troubleshooting and device documentation',
  inputSchema: z.object({
    action: z.enum(['search_docs', 'get_context', 'add_document', 'ask_question', 'initialize_knowledge_base']),
    query: z.string().optional().describe('Search query or question'),
    device_id: z.string().optional().describe('Specific device ID to search for'),
    document_type: z.enum(['manual', 'troubleshooting', 'specs', 'changelog', 'all']).optional().default('all'),
    context_window: z.number().optional().default(3).describe('Number of relevant documents to include in context'),
    add_document: z.object({
      deviceId: z.string(),
      documentType: z.enum(['manual', 'troubleshooting', 'specs', 'changelog']),
      title: z.string(),
      content: z.string(),
      version: z.string().optional().default('1.0')
    }).optional()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    results: z.array(z.object({
      deviceId: z.string(),
      documentType: z.string(),
      title: z.string(),
      relevanceScore: z.number(),
      excerpt: z.string()
    })).optional(),
    context: z.string().optional(),
    answer: z.string().optional(),
    sources: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional()
  }),
  execute: async ({ context }) => {
    const { action, query, device_id, document_type, context_window, add_document } = context;

    try {
      switch (action) {
        case 'initialize_knowledge_base': {
          // Add sample documents to the data store
          let addedCount = 0;
          
          for (const doc of sampleDocuments) {
            try {
              await iotDataStoreTool.execute({
                context: {
                  action: 'store_document',
                  document_data: doc
                }
              });
              addedCount++;
            } catch (error) {
              console.warn(`Failed to add document ${doc.title}:`, error);
            }
          }

          return {
            success: true,
            action: 'initialize_knowledge_base',
            answer: `Initialized IoT knowledge base with ${addedCount} documents including device manuals, troubleshooting guides, and technical specifications.`,
            suggestions: [
              'Ask me about temperature sensor configuration',
              'Search for actuator troubleshooting steps', 
              'Get gateway specifications',
              'Find general connection issues help'
            ]
          };
        }

        case 'add_document': {
          if (!add_document) {
            throw new Error('Document data required for add_document action');
          }

          await iotDataStoreTool.execute({
            context: {
              action: 'store_document',
              document_data: add_document
            }
          });

          return {
            success: true,
            action: 'add_document',
            answer: `Added document "${add_document.title}" for device ${add_document.deviceId}`,
            suggestions: [`Search for information about ${add_document.deviceId}`]
          };
        }

        case 'search_docs': {
          if (!query) {
            throw new Error('Query required for document search');
          }

          // Search through documents - simplified implementation
          const searchResults: any[] = [];
          const searchTerms = query.toLowerCase().split(' ');

          // Search in sample documents first, then in stored documents
          for (const doc of sampleDocuments) {
            if (device_id && doc.deviceId !== device_id && doc.deviceId !== 'general') {
              continue;
            }
            if (document_type !== 'all' && doc.documentType !== document_type) {
              continue;
            }

            const contentLower = doc.content.toLowerCase();
            const titleLower = doc.title.toLowerCase();
            let relevanceScore = 0;

            // Calculate relevance score based on term matches
            for (const term of searchTerms) {
              const titleMatches = (titleLower.match(new RegExp(term, 'g')) || []).length;
              const contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length;
              
              relevanceScore += titleMatches * 5 + contentMatches; // Title matches weighted higher
            }

            if (relevanceScore > 0) {
              // Extract relevant excerpt
              const sentences = doc.content.split(/[.!?]+/);
              let bestSentence = sentences[0];
              let bestScore = 0;

              for (const sentence of sentences) {
                const sentenceLower = sentence.toLowerCase();
                let sentenceScore = 0;
                for (const term of searchTerms) {
                  if (sentenceLower.includes(term)) {
                    sentenceScore++;
                  }
                }
                if (sentenceScore > bestScore) {
                  bestScore = sentenceScore;
                  bestSentence = sentence;
                }
              }

              searchResults.push({
                deviceId: doc.deviceId,
                documentType: doc.documentType,
                title: doc.title,
                relevanceScore,
                excerpt: bestSentence.trim().substring(0, 200) + '...'
              });
            }
          }

          // Sort by relevance score
          searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
          
          return {
            success: true,
            action: 'search_docs',
            results: searchResults.slice(0, context_window || 3),
            suggestions: searchResults.length === 0 ? [
              'Try broader search terms',
              'Check device ID spelling',
              'Search in all document types'
            ] : [
              'Ask a specific question about these results',
              'Get more context for a specific device',
              'Search for related troubleshooting steps'
            ]
          };
        }

        case 'get_context': {
          if (!device_id) {
            throw new Error('Device ID required for getting context');
          }

          // Get all documents for a specific device
          const deviceDocs = sampleDocuments.filter(doc => 
            doc.deviceId === device_id || doc.deviceId === 'general'
          );

          if (deviceDocs.length === 0) {
            return {
              success: false,
              action: 'get_context',
              answer: `No documentation found for device ${device_id}`,
              suggestions: ['Add device documentation', 'Check general troubleshooting guides']
            };
          }

          const contextText = deviceDocs.map(doc => 
            `**${doc.title}** (${doc.documentType}):\n${doc.content.substring(0, 500)}...\n`
          ).join('\n');

          return {
            success: true,
            action: 'get_context',
            context: contextText,
            sources: deviceDocs.map(doc => doc.title),
            suggestions: [
              `Ask specific questions about ${device_id}`,
              'Get troubleshooting steps',
              'Find configuration details'
            ]
          };
        }

        case 'ask_question': {
          if (!query) {
            throw new Error('Question required for ask_question action');
          }

          // First, search for relevant documents
          const searchResult = await iotRAGTool.execute({
            context: {
              action: 'search_docs',
              query,
              device_id,
              document_type,
              context_window: 2
            }
          });

          if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
            return {
              success: true,
              action: 'ask_question',
              answer: `I couldn't find specific documentation about "${query}". However, here are some general IoT troubleshooting suggestions:

1. **Connection Issues**: Check network connectivity, MQTT broker settings, and firewall rules
2. **Performance Problems**: Verify message frequency, QoS settings, and device resources  
3. **Data Issues**: Validate message format, check topic structure, and review error logs
4. **Device Problems**: Restart device, check power supply, and update firmware

Would you like me to search for more specific information or help with a particular device?`,
              suggestions: [
                'Ask about specific device types',
                'Search troubleshooting guides',
                'Get configuration examples',
                'Find error code explanations'
              ]
            };
          }

          // Generate contextual answer based on search results
          const relevantDocs = searchResult.results || [];
          const contextInfo = relevantDocs.map(doc => 
            `From ${doc.title}: ${doc.excerpt}`
          ).join('\n\n');

          let answer = `Based on the IoT documentation, here's what I found about "${query}":\n\n`;
          
          // Add specific guidance based on search results
          if (relevantDocs.some(doc => doc.documentType === 'troubleshooting')) {
            answer += "**Troubleshooting Steps:**\n";
            answer += contextInfo;
            answer += "\n\n**Recommended Actions:**\n";
            answer += "1. Follow the step-by-step diagnosis in the troubleshooting guide\n";
            answer += "2. Check all connections and power supplies\n";
            answer += "3. Verify MQTT broker connectivity and credentials\n";
          } else if (relevantDocs.some(doc => doc.documentType === 'manual')) {
            answer += "**Configuration Information:**\n";
            answer += contextInfo;
            answer += "\n\n**Next Steps:**\n";
            answer += "1. Follow the configuration guide carefully\n";
            answer += "2. Test connectivity after each step\n";
            answer += "3. Check the troubleshooting section if issues persist\n";
          } else {
            answer += contextInfo;
          }

          return {
            success: true,
            action: 'ask_question',
            answer,
            sources: relevantDocs.map(doc => doc.title),
            suggestions: [
              'Ask for more specific details',
              'Get step-by-step instructions', 
              'Find related error solutions',
              'Search for similar issues'
            ]
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        action,
        answer: `Error executing RAG query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [
          'Try rephrasing your question',
          'Check spelling and device IDs',
          'Use simpler search terms'
        ]
      };
    }
  }
});
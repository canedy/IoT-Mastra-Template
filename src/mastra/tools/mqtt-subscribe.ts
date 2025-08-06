import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getMqttClient } from './mqtt-connection.js';

interface Subscription {
  topic: string;
  qos: 0 | 1 | 2;
  filter?: Record<string, any>;
  paused?: boolean;
}

const subscriptions = new Map<string, Subscription>();

const subscriptionConfigSchema = z.object({
  topics: z.union([z.string(), z.array(z.string())]).describe('Topic(s) to subscribe to'),
  qos: z.enum(['0', '1', '2']).optional().default('1').describe('QoS level for subscription'),
  filter: z.record(z.any()).optional().describe('Message filtering criteria'),
});

const actionSchema = z.enum(['subscribe', 'unsubscribe', 'list_subscriptions', 'pause', 'resume']);

export const mqttSubscribeTool = createTool({
  id: 'mqtt-subscribe',
  description: 'Subscribe to MQTT topics and manage subscriptions',
  inputSchema: z.object({
    action: actionSchema,
    config: subscriptionConfigSchema.optional(),
    topic: z.string().optional().describe('Topic for unsubscribe/pause/resume actions'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.string(),
    details: z.record(z.any()).optional(),
  }),
  execute: async ({ context }) => {
    const { action, config, topic } = context;
    const client = getMqttClient();

    if (!client || !client.connected) {
      return {
        success: false,
        status: 'MQTT client not connected',
      };
    }

    switch (action) {
      case 'subscribe':
        if (!config) {
          return {
            success: false,
            status: 'Configuration required for subscribe action',
          };
        }

        const topics = Array.isArray(config.topics) ? config.topics : [config.topics];
        const qos = parseInt(config.qos) as 0 | 1 | 2;
        const subscribed: string[] = [];
        const failed: string[] = [];

        return new Promise((resolve) => {
          let remaining = topics.length;

          topics.forEach((topicStr) => {
            client.subscribe(topicStr, { qos }, (err) => {
              if (err) {
                failed.push(topicStr);
              } else {
                subscribed.push(topicStr);
                subscriptions.set(topicStr, {
                  topic: topicStr,
                  qos,
                  filter: config.filter,
                  paused: false,
                });
                
                // Log filter setup for debugging
                if (config.filter) {
                  console.log(`[MQTT] Filter applied to ${topicStr}:`, config.filter);
                }
              }

              remaining--;
              if (remaining === 0) {
                if (!client.listenerCount('message')) {
                  client.on('message', handleMessage);
                }

                resolve({
                  success: subscribed.length > 0,
                  status: `Subscribed to ${subscribed.length} topic(s)`,
                  details: {
                    subscribed,
                    failed: failed.length > 0 ? failed : undefined,
                    total_subscriptions: subscriptions.size,
                  },
                });
              }
            });
          });
        });

      case 'unsubscribe':
        if (!topic) {
          return {
            success: false,
            status: 'Topic required for unsubscribe action',
          };
        }

        return new Promise((resolve) => {
          client.unsubscribe(topic, (err) => {
            if (err) {
              resolve({
                success: false,
                status: `Failed to unsubscribe: ${err.message}`,
              });
            } else {
              subscriptions.delete(topic);
              resolve({
                success: true,
                status: `Unsubscribed from ${topic}`,
                details: {
                  remaining_subscriptions: subscriptions.size,
                },
              });
            }
          });
        });

      case 'list_subscriptions':
        const subs = Array.from(subscriptions.entries()).map(([topic, sub]) => ({
          topic,
          qos: sub.qos,
          paused: sub.paused,
          has_filter: !!sub.filter,
        }));

        return {
          success: true,
          status: `${subs.length} active subscription(s)`,
          details: {
            subscriptions: subs,
          },
        };

      case 'pause':
        if (!topic) {
          return {
            success: false,
            status: 'Topic required for pause action',
          };
        }

        const pauseSub = subscriptions.get(topic);
        if (!pauseSub) {
          return {
            success: false,
            status: 'Subscription not found',
          };
        }

        pauseSub.paused = true;
        return {
          success: true,
          status: `Paused subscription to ${topic}`,
        };

      case 'resume':
        if (!topic) {
          return {
            success: false,
            status: 'Topic required for resume action',
          };
        }

        const resumeSub = subscriptions.get(topic);
        if (!resumeSub) {
          return {
            success: false,
            status: 'Subscription not found',
          };
        }

        resumeSub.paused = false;
        return {
          success: true,
          status: `Resumed subscription to ${topic}`,
        };

      default:
        return {
          success: false,
          status: 'Invalid action',
        };
    }
  },
});

function handleMessage(topic: string, message: Buffer) {
  // Find matching subscriptions (considering wildcards)
  const matchingSubscriptions = Array.from(subscriptions.entries()).filter(
    ([subTopic]) => topicMatches(topic, subTopic)
  );

  matchingSubscriptions.forEach(([_, subscription]) => {
    if (subscription.paused) return;

    try {
      // Parse message
      let parsedMessage: any;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch {
        parsedMessage = message.toString();
      }

      // Apply filter if present
      if (subscription.filter && typeof parsedMessage === 'object') {
        const filterMatches = Object.entries(subscription.filter).every(
          ([key, value]) => parsedMessage[key] === value
        );
        if (!filterMatches) {
          // Log filtered messages for debugging
          console.log(`[MQTT] Filtered out message on ${topic} (didn't match filter):`, {
            message: parsedMessage,
            filter: subscription.filter,
            reason: 'Filter criteria not met'
          });
          return;
        }
      }

      // Simple message logging
      console.log(`[MQTT] Received on ${topic}:`, parsedMessage);
    } catch (error) {
      console.error(`[MQTT] Error processing message on ${topic}:`, error);
    }
  });
}

function topicMatches(actualTopic: string, subscriptionTopic: string): boolean {
  const actualParts = actualTopic.split('/');
  const subParts = subscriptionTopic.split('/');

  for (let i = 0; i < subParts.length; i++) {
    if (subParts[i] === '#') return true;
    if (subParts[i] === '+') continue;
    if (i >= actualParts.length || subParts[i] !== actualParts[i]) return false;
  }

  return actualParts.length === subParts.length;
}


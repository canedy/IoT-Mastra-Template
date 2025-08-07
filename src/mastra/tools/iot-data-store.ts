import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * IoT Message Storage
 * Simple in-memory storage for MQTT messages
 */

// Simple in-memory storage for MQTT messages
const messageStorage = new Map<string, IoTMessage>();

interface IoTMessage {
  id: string;
  deviceId: string;
  topic: string;
  message: any;
  timestamp: string;
  messageType: "telemetry" | "status" | "command" | "alert" | "other";
  processed: boolean;
}

// Helper function for direct storage access (used by mqtt-subscribe)
export function storeMessage(
  deviceId: string,
  topic: string,
  message: any,
  messageType: "telemetry" | "status" | "command" | "alert" | "other" = "other"
): boolean {
  try {
    const messageId = `${deviceId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;
    const iotMessage: IoTMessage = {
      id: messageId,
      deviceId,
      topic,
      message,
      timestamp: new Date().toISOString(),
      messageType,
      processed: false,
    };

    messageStorage.set(messageId, iotMessage);
    console.log(`[DataStore] Stored ${messageType} message from ${deviceId}`);
    return true;
  } catch (error) {
    console.error(`[DataStore] Failed to store message:`, error);
    return false;
  }
}

// Helper function to get stored messages for a device (used by voice response tool)
export function getStoredMessages(deviceId: string, limit: number = 10): IoTMessage[] {
  const allMessages = Array.from(messageStorage.values());
  
  // Filter by device ID if specified
  const filteredMessages = deviceId 
    ? allMessages.filter((message: IoTMessage) => message.deviceId === deviceId)
    : allMessages;
  
  // Sort by timestamp (most recent first) and limit
  return filteredMessages
    .sort((a: IoTMessage, b: IoTMessage) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export const iotDataStoreTool = createTool({
  id: "iot-data-store",
  description: "Simple IoT message storage - store and retrieve MQTT messages",
  inputSchema: z.object({
    action: z.enum(["store_message", "retrieve_messages"]),
    // Store operation (only used for store_message action)
    message_data: z
      .object({
        deviceId: z.string().optional(),
        topic: z.string().optional(),
        message: z.any(),
        messageType: z
          .enum(["telemetry", "status", "command", "alert", "other"])
          .optional()
          .default("other"),
      })
      .optional()
      .describe("Required for store_message action only"),
    // Retrieve operation (only used for retrieve_messages action)
    device_id: z
      .string()
      .optional()
      .describe("Filter by device ID (for retrieve_messages action)"),
    limit: z
      .number()
      .optional()
      .default(100)
      .describe("Max messages to retrieve (for retrieve_messages action)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    data: z.any().optional(),
    count: z.number().optional(),
    summary: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { action } = context;

    try {
      switch (action) {
        case "store_message": {
          const { message_data } = context;
          if (!message_data) {
            throw new Error("Message data required for store_message action");
          }

          // Validate required fields for storage
          if (!message_data.deviceId || !message_data.topic) {
            throw new Error("deviceId and topic are required for storing messages");
          }
          
          const messageId = `msg:${message_data.deviceId}:${Date.now()}`;
          const iotMessage: IoTMessage = {
            id: messageId,
            deviceId: message_data.deviceId,
            topic: message_data.topic,
            message: message_data.message,
            timestamp: new Date().toISOString(),
            messageType: message_data.messageType || "other",
            processed: false,
          };

          messageStorage.set(messageId, iotMessage);

          return {
            success: true,
            action: "store_message",
            summary: `Stored message from ${message_data.deviceId} on topic ${message_data.topic}`,
            data: { messageId, messageType: iotMessage.messageType },
          };
        }

        case "retrieve_messages": {
          const { device_id, limit } = context;

          const messages: IoTMessage[] = [];
          const allDeviceIds = new Set<string>();

          // Filter messages by device ID if specified
          for (const [, message] of messageStorage.entries()) {
            allDeviceIds.add(message.deviceId);
            if (device_id && message.deviceId !== device_id) {
              continue;
            }
            messages.push(message);
            if (messages.length >= (limit || 100)) {
              break;
            }
          }

          // Sort by timestamp (most recent first)
          messages.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          const summary = device_id
            ? `Retrieved ${
                messages.length
              } messages for ${device_id}. Available devices: [${Array.from(
                allDeviceIds
              ).join(", ")}]`
            : `Retrieved ${messages.length} messages from ${allDeviceIds.size} devices`;

          return {
            success: true,
            action: "retrieve_messages",
            count: messages.length,
            summary,
            data: messages.slice(0, limit || 100),
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        action,
        summary: `Error executing ${action}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

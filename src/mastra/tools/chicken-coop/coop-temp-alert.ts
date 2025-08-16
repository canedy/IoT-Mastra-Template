import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getMqttClient } from "../mqtt/mqtt-connection.js";
import { getSensorData } from "../utils/shared-memory-tool.js";

// Lab 3 - Tool 1: CoopTempAlert
// Reads latest coop temperature and provides safety recommendations

// Cache for recent temperature readings
interface TempReading {
  temperature: number;
  timestamp: Date;
  source: string;
}

const tempCache = new Map<string, TempReading>();
const STALE_DATA_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const RATE_LIMIT_INTERVAL = 5 * 1000; // 5 seconds

let lastCallTime = 0;

export const coopTempAlertTool = createTool({
  id: "coop-temp-alert",
  description:
    "Check chicken coop temperature against safe ranges and provide recommendations",
  inputSchema: z.object({
    minSafe: z
      .number()
      .optional()
      .default(35)
      .describe("Minimum safe temperature in Fahrenheit"),
    maxSafe: z
      .number()
      .optional()
      .default(95)
      .describe("Maximum safe temperature in Fahrenheit"),
    coopId: z
      .string()
      .optional()
      .default("main")
      .describe("Identifier for the coop"),
  }),
  outputSchema: z.object({
    current: z.number().describe("Current temperature in Fahrenheit"),
    status: z
      .enum(["OK", "LOW", "HIGH", "STALE"])
      .describe("Temperature status"),
    message: z.string().describe("Recommendation message"),
    timestamp: z.string().describe("Reading timestamp"),
  }),
  execute: async ({
    context,
  }): Promise<{
    current: number;
    status: "OK" | "LOW" | "HIGH" | "STALE";
    message: string;
    timestamp: string;
  }> => {
    const { minSafe, maxSafe, coopId } = context;

    // Rate limiting check
    const now = Date.now();
    if (now - lastCallTime < RATE_LIMIT_INTERVAL) {
      const waitTime = Math.ceil(
        (RATE_LIMIT_INTERVAL - (now - lastCallTime)) / 1000
      );
      throw new Error(
        `Rate limit: Please wait ${waitTime} seconds before checking again`
      );
    }
    lastCallTime = now;

    // Get the latest temperature reading
    const reading = await getLatestTemperature(coopId);

    // Check if data is stale
    const dataAge = now - reading.timestamp.getTime();
    if (dataAge > STALE_DATA_THRESHOLD) {
      return {
        current: reading.temperature,
        status: "STALE",
        message: `⚠️ Warning: Temperature data is ${Math.floor(
          dataAge / 1000
        )} seconds old. Check sensor connection.`,
        timestamp: reading.timestamp.toISOString(),
      };
    }

    // Determine status and message
    let status: "OK" | "LOW" | "HIGH" | "STALE";
    let message: string;

    if (reading.temperature < minSafe) {
      status = "LOW";
      const diff = minSafe - reading.temperature;
      message =
        `🥶 ALERT: Temperature is ${diff.toFixed(1)}°F below safe minimum! ` +
        `Actions needed: 1) Check heating system 2) Add insulation 3) Check for drafts ` +
        `4) Consider heat lamp if below 20°F`;
    } else if (reading.temperature > maxSafe) {
      status = "HIGH";
      const diff = reading.temperature - maxSafe;
      message =
        `🔥 ALERT: Temperature is ${diff.toFixed(1)}°F above safe maximum! ` +
        `Actions needed: 1) Increase ventilation 2) Provide fresh water 3) Add shade ` +
        `4) Consider misting system if above 100°F`;
    } else {
      status = "OK";
      const optimal = (minSafe + maxSafe) / 2;
      const deviation = Math.abs(reading.temperature - optimal);

      if (deviation < 5) {
        message = `✅ Temperature is optimal for chicken comfort and egg production`;
      } else if (reading.temperature < optimal) {
        message = `✅ Temperature is safe but slightly cool. Chickens are comfortable.`;
      } else {
        message = `✅ Temperature is safe but slightly warm. Ensure adequate water supply.`;
      }
    }

    return {
      current: reading.temperature,
      status,
      message,
      timestamp: reading.timestamp.toISOString(),
    };
  },
});

/**
 * Get the latest temperature reading from cache or MQTT
 */
async function getLatestTemperature(coopId: string): Promise<TempReading> {
  // Check cache first
  const cached = tempCache.get(coopId);
  const now = new Date();

  if (cached && now.getTime() - cached.timestamp.getTime() < 30000) {
    // 30 second cache
    return cached;
  }

  // Try to get from MQTT retained message or recent messages
  // For the workshop, we'll simulate this with realistic data
  const reading = (await fetchFromSharedMemory(coopId)) || generateSimulatedReading();

  // Update cache
  tempCache.set(coopId, reading);

  return reading;
}

/**
 * Attempt to fetch temperature from shared memory (MQTT data)
 */
async function fetchFromSharedMemory(coopId: string): Promise<TempReading | null> {
  const sensorData = getSensorData();
  
  // Look for recent temperature readings from MQTT
  const tempReadings = sensorData
    .filter(entry => 
      entry.topic.includes('temp') && 
      (entry.data.temperature !== undefined)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (tempReadings.length === 0) {
    console.log("No temperature data found in shared memory");
    return null;
  }
  
  // Get the most recent temperature reading
  const latest = tempReadings[0];
  console.log(`Found temperature from shared memory: ${latest.data.temperature}°F from ${latest.topic}`);
  
  return {
    temperature: latest.data.temperature,
    timestamp: new Date(latest.timestamp),
    source: 'mqtt-shared-memory',
  };
}

/**
 * Generate realistic simulated temperature data for workshop
 */
function generateSimulatedReading(): TempReading {
  const hour = new Date().getHours();
  let baseTemp = 70;

  // Simulate daily temperature variation
  if (hour >= 6 && hour < 10) {
    baseTemp = 65 + Math.random() * 10; // Morning: 65-75°F
  } else if (hour >= 10 && hour < 16) {
    baseTemp = 75 + Math.random() * 15; // Afternoon: 75-90°F
  } else if (hour >= 16 && hour < 20) {
    baseTemp = 70 + Math.random() * 10; // Evening: 70-80°F
  } else {
    baseTemp = 60 + Math.random() * 10; // Night: 60-70°F
  }

  // Add some random variation
  baseTemp += (Math.random() - 0.5) * 5;

  return {
    temperature: Math.round(baseTemp * 10) / 10, // Round to 1 decimal
    timestamp: new Date(),
    source: "simulated",
  };
}

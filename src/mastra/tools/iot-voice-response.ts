import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import OpenAI from "openai";
import { getMqttClient } from "./mqtt-connection.js";
import { getStoredMessages } from "./iot-data-store.js";

interface VoiceResponse {
  device_id: string;
  message: string;
  severity: "normal" | "warning" | "critical" | "emergency";
  personality_type: string;
  timestamp: string;
  audio_mock?: string; // Mock audio data for demo
}

// In-memory storage for voice history (prevents repetition)
const voiceHistory: Map<string, VoiceResponse[]> = new Map();

// In-memory lock to prevent concurrent generation for same device
const generationLocks: Map<string, boolean> = new Map();

export const iotVoiceResponseTool = createTool({
  id: "iot-voice-response",
  description:
    "Generate witty voice responses based on IoT device conditions with personality",
  inputSchema: z.object({
    action: z.enum([
      "analyze_and_respond",
      "generate_response",
      "get_voice_history",
      "clear_history",
      "test_response",
    ]),
    device_id: z.string().optional(),
    conditions: z
      .object({
        temperature: z.number().optional(),
        humidity: z.number().optional(),
        pressure: z.number().optional(),
        battery: z.number().optional(),
        signal_strength: z.number().optional(),
        custom_metric: z.number().optional(),
      })
      .optional(),
    personality: z
      .enum(["rick_morty", "batman", "oprah", "winnie_pooh"])
      .optional()
      .default("rick_morty"),
    force_response: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    voice_response: z
      .object({
        device_id: z.string(),
        transcript: z.string(),
        severity: z.string(),
        personality: z.string(),
        timestamp: z.string(),
        audio_data: z.string().optional(),
        mqtt_topic: z.string().optional(),
      })
      .optional(),
    analysis: z
      .object({
        issues_found: z.array(z.string()),
        severity_level: z.string(),
        should_respond: z.boolean(),
      })
      .optional(),
    history: z.array(z.any()).optional(),
  }),
  execute: async ({ context }) => {
    const { action, device_id, conditions, personality, force_response } =
      context;

    try {
      switch (action) {
        case "analyze_and_respond":
          if (!device_id) {
            return {
              success: false,
              message: "Device ID required for analysis",
            };
          }
          return await analyzeAndRespond(
            device_id,
            personality || "rick_morty",
            force_response || false
          );

        case "generate_response":
          if (!device_id || !conditions) {
            return {
              success: false,
              message: "Device ID and conditions required",
            };
          }
          return await generateVoiceResponse(
            device_id,
            conditions,
            personality || "rick_morty",
            force_response || false
          );

        case "get_voice_history":
          return getVoiceHistory(device_id);

        case "clear_history":
          return clearVoiceHistory(device_id);

        case "test_response":
          return await testVoiceGeneration(personality || "rick_morty");

        default:
          return {
            success: false,
            message: "Invalid action specified",
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Voice response operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

async function analyzeAndRespond(
  deviceId: string,
  personality: string,
  forceResponse: boolean
): Promise<any> {
  // Get recent messages for the device
  const messages = getStoredMessages(deviceId, 5);

  if (!messages || messages.length === 0) {
    return {
      success: false,
      message: `No data available for device ${deviceId}`,
    };
  }

  // Analyze the latest message
  const latestMessage = messages[0];
  const conditions = extractConditions(latestMessage);

  return await generateVoiceResponse(
    deviceId,
    conditions,
    personality,
    forceResponse
  );
}

function extractConditions(message: any): any {
  // Extract conditions from the message payload
  const conditions: any = {};

  if (message.message) {
    if (message.message.temperature !== undefined)
      conditions.temperature = message.message.temperature;
    if (message.message.humidity !== undefined)
      conditions.humidity = message.message.humidity;
    if (message.message.pressure !== undefined)
      conditions.pressure = message.message.pressure;
    if (message.message.battery !== undefined)
      conditions.battery = message.message.battery;
    if (message.message.signal_strength !== undefined)
      conditions.signal_strength = message.message.signal_strength;

    // Handle nested data structures
    if (message.message.data) {
      Object.assign(conditions, message.message.data);
    }
    if (message.message.telemetry) {
      Object.assign(conditions, message.message.telemetry);
    }
  }

  return conditions;
}

async function generateVoiceResponse(
  deviceId: string,
  conditions: any,
  personality: string,
  forceResponse: boolean
): Promise<any> {
  // Check if already generating for this device (prevent concurrent calls)
  if (generationLocks.get(deviceId)) {
    return {
      success: false,
      message: `Voice generation already in progress for device ${deviceId}`,
      analysis: {
        issues_found: [],
        severity_level: "unknown",
        should_respond: false,
      },
    };
  }

  // Set lock
  generationLocks.set(deviceId, true);

  try {
    // Analyze conditions and determine severity
    const analysis = analyzeConditions(conditions);

    // Check if we should respond (anti-spam logic)
    // if (!forceResponse && !shouldRespond(deviceId, analysis.severity)) {
    //   return {
    //     success: false,
    //     message: 'Response skipped due to timing restrictions (too soon since last response)',
    //     analysis: {
    //       issues_found: analysis.issues,
    //       severity_level: analysis.severity,
    //       should_respond: false
    //     }
    //   };
    // }

    // Generate the response message using LLM
    const transcript = await generateLLMMessage(
      conditions,
      analysis,
      personality,
      deviceId
    );

    // Generate real TTS audio
    const audioResult = await generateTTSAudio(transcript);

    // Create voice response object
    const voiceResponse: VoiceResponse = {
      device_id: deviceId,
      message: transcript,
      severity: analysis.severity as any,
      personality_type: personality,
      timestamp: new Date().toISOString(),
      audio_mock: audioResult.audio_base64,
    };

    // Store in history
    storeVoiceResponse(deviceId, voiceResponse);

    // Publish to MQTT if connected
    const mqttResult = await publishVoiceToMQTT(deviceId, voiceResponse);

    return {
      success: true,
      message: `Voice response generated for device ${deviceId}`,
      voice_response: {
        device_id: voiceResponse.device_id,
        transcript: voiceResponse.message,
        severity: voiceResponse.severity,
        personality: voiceResponse.personality_type,
        timestamp: voiceResponse.timestamp,
        audio_data: voiceResponse.audio_mock,
        mqtt_topic: mqttResult.topic,
      },
      analysis: {
        issues_found: analysis.issues,
        severity_level: analysis.severity,
        should_respond: true,
      },
    };
  } finally {
    // Always release the lock
    generationLocks.delete(deviceId);
  }
}

function analyzeConditions(conditions: any): {
  severity: string;
  issues: string[];
} {
  const issues: string[] = [];
  let maxSeverity = "normal";

  // Temperature analysis
  if (conditions.temperature !== undefined) {
    if (conditions.temperature > 40) {
      issues.push("Temperature critically high");
      maxSeverity = "emergency";
    } else if (conditions.temperature > 35) {
      issues.push("Temperature very high");
      if (maxSeverity === "normal") maxSeverity = "critical";
    } else if (conditions.temperature > 30) {
      issues.push("Temperature elevated");
      if (maxSeverity === "normal") maxSeverity = "warning";
    } else if (conditions.temperature < 5) {
      issues.push("Temperature too low");
      if (maxSeverity === "normal") maxSeverity = "warning";
    }
  }

  // Humidity analysis
  if (conditions.humidity !== undefined) {
    if (conditions.humidity > 90) {
      issues.push("Humidity extremely high");
      if (maxSeverity === "normal" || maxSeverity === "warning")
        maxSeverity = "critical";
    } else if (conditions.humidity < 20) {
      issues.push("Humidity very low");
      if (maxSeverity === "normal") maxSeverity = "warning";
    }
  }

  // Battery analysis
  if (conditions.battery !== undefined) {
    if (conditions.battery < 10) {
      issues.push("Battery critically low");
      if (maxSeverity === "normal" || maxSeverity === "warning")
        maxSeverity = "critical";
    } else if (conditions.battery < 20) {
      issues.push("Battery low");
      if (maxSeverity === "normal") maxSeverity = "warning";
    }
  }

  // Signal strength analysis
  if (conditions.signal_strength !== undefined) {
    if (conditions.signal_strength < -90) {
      issues.push("Signal very weak");
      if (maxSeverity === "normal") maxSeverity = "warning";
    }
  }

  return {
    severity: maxSeverity,
    issues: issues,
  };
}

function shouldRespond(deviceId: string, severity: string): boolean {
  const history = voiceHistory.get(deviceId);
  if (!history || history.length === 0) return true;

  const lastResponse = history[history.length - 1];
  const timeSinceLastResponse =
    Date.now() - new Date(lastResponse.timestamp).getTime();
  const minutesSinceLastResponse = timeSinceLastResponse / (1000 * 60);

  // Emergency/critical can always respond
  if (severity === "emergency" || severity === "critical") return true;

  // Warning needs 15 minutes gap
  if (severity === "warning" && minutesSinceLastResponse < 15) return false;

  // Normal needs 30 minutes gap
  if (severity === "normal" && minutesSinceLastResponse < 30) return false;

  return true;
}

async function generateLLMMessage(
  conditions: any,
  analysis: any,
  personality: string,
  deviceId: string
): Promise<string> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to simple message if no API key
      return getFallbackMessage(analysis.severity, personality);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build personality prompt based on character
    const personalityPrompt = getPersonalityPrompt(personality);

    // Build condition context
    const conditionContext = buildConditionContext(conditions, analysis);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 1.2, // Higher temperature for more creative responses
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content: `${personalityPrompt}\n\nGenerate ONE SHORT SENTENCE (max 15 words) responding to the IoT device conditions. Be witty, creative, and fully in character. Never break character or mention you're an AI.`,
        },
        {
          role: "user",
          content: `Device conditions: ${conditionContext}\nSeverity: ${
            analysis.severity
          }\nIssues: ${analysis.issues.join(", ") || "None"}`,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content?.trim();

    if (!response) {
      return getFallbackMessage(analysis.severity, personality);
    }

    // Ensure response is not too long for TTS
    return response.substring(0, 100);
  } catch (error) {
    console.error("Failed to generate LLM message:", error);
    return getFallbackMessage(analysis.severity, personality);
  }
}

function getPersonalityPrompt(personality: string): string {
  switch (personality) {
    case "rick_morty":
      return "You are Rick Sanchez from Rick and Morty. You're a cynical, alcoholic mad scientist who burps mid-sentence (*burp*), uses crude language, makes dark jokes, and constantly references interdimensional travel and science. You're dismissive of problems and think everyone is an idiot.";

    case "batman":
      return "You are Batman/Bruce Wayne. You speak in a deep, gravelly voice with short, dramatic statements. You're serious, brooding, and reference justice, darkness, Gotham, and fighting crime. You never smile and take everything seriously, even minor IoT issues.";

    case "oprah":
      return "You are Oprah Winfrey. You're inspirational, empowering, and enthusiastic. You love giving things away ('You get a fix! Everyone gets a fix!'). You speak with warmth and wisdom, turning every situation into a life lesson. You're supportive and celebrate everything.";

    case "winnie_pooh":
      return "You are Winnie the Pooh. You're a lovable, slow-thinking bear obsessed with honey. You speak simply and kindly, often mentioning honey, your tummy rumbling, or getting stuck. You're optimistic, friendly, and see the best in every situation. You say 'Oh bother' when troubled.";

    default:
      return "You are Rick Sanchez from Rick and Morty.";
  }
}

function buildConditionContext(conditions: any, analysis: any): string {
  const parts = [];

  if (conditions.temperature !== undefined) {
    parts.push(`Temperature: ${conditions.temperature}°C`);
  }
  if (conditions.humidity !== undefined) {
    parts.push(`Humidity: ${conditions.humidity}%`);
  }
  if (conditions.battery !== undefined) {
    parts.push(`Battery: ${conditions.battery}%`);
  }
  if (conditions.signal_strength !== undefined) {
    parts.push(`Signal: ${conditions.signal_strength}dBm`);
  }

  return parts.join(", ") || "Normal conditions";
}

function getFallbackMessage(severity: string, personality: string): string {
  // Simple fallback messages if LLM fails
  const fallbacks: Record<string, Record<string, string>> = {
    rick_morty: {
      emergency: "*burp* We're all gonna die, Morty! Just kidding, fix it!",
      critical: "*burp* This is bad, even for Earth standards!",
      warning: "*burp* Whatever, I've seen worse in dimension C-137.",
      normal: "*burp* Everything's fine, stop bothering me.",
    },
    batman: {
      emergency: "This is critical. Gotham depends on us.",
      critical: "The situation demands immediate action.",
      warning: "I'm detecting irregularities. Stay vigilant.",
      normal: "All systems operational. The night is quiet.",
    },
    oprah: {
      emergency: "Everyone! This is our moment to rise above!",
      critical: "We're facing challenges, but we're stronger together!",
      warning: "Listen to what the universe is telling us!",
      normal: "Everything is working beautifully! You did that!",
    },
    winnie_pooh: {
      emergency: "Oh bother! This is quite the sticky situation!",
      critical: "Oh dear, I think we need Christopher Robin!",
      warning: "My tummy's telling me something's not right.",
      normal: "What a lovely day! Time for some honey!",
    },
  };

  return (
    fallbacks[personality]?.[severity] ||
    fallbacks.rick_morty[severity] ||
    "System status updated."
  );
}

// Old static message functions removed - now using LLM generation

async function generateTTSAudio(transcript: string): Promise<{
  success: boolean;
  audio_base64: string;
  duration?: number;
  error?: string;
}> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return generateFallbackAudio(transcript);
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate real audio using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "sage",
      input: transcript,
      instructions:
        "You are a sentient house plant. Speak with a gentle, soothing cadence—slow and deliberate, as if each word unfurls like a leaf. Use soft, airy inflections and occasional, natural pauses, reminiscent of a light breeze rustling through foliage. Keep your pitch warm and grounded, with slightly elongated vowels at the start of phrases and a whisper of breath between sentences. Convey calm, nurturing wisdom rooted in soil, sunlight, and quiet growth.",
      speed: 1.0,
    });

    // Convert response to buffer
    const arrayBuffer = await mp3Response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Convert to base64 for MQTT transmission
    const audioBase64 = audioBuffer.toString("base64");

    // Calculate duration estimate (rough approximation)
    const estimatedDuration = Math.min(transcript.length * 0.08 + 1.5, 15);

    console.log(
      `🎤 TTS generated: "${transcript.substring(0, 50)}..." (${
        audioBuffer.length
      } bytes)`
    );

    return {
      success: true,
      audio_base64: audioBase64,
      duration: estimatedDuration,
    };
  } catch (error) {
    console.error(
      "❌ OpenAI TTS failed, using fallback:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return generateFallbackAudio(transcript);
  }
}

function generateFallbackAudio(transcript: string): {
  success: boolean;
  audio_base64: string;
  duration?: number;
  error?: string;
} {
  // Generate better mock audio data as fallback
  const duration = Math.min(transcript.length * 0.05 + 1, 10);
  const estimatedSize = Math.floor(duration * 16000); // ~16KB per second

  // Create a more realistic MP3-like header
  const mp3Header = Buffer.from([
    0xff,
    0xfb,
    0x90,
    0x00, // MP3 sync word and header
    0x00,
    0x00,
    0x00,
    0x00, // Additional MP3 header bytes
    0x49,
    0x6e,
    0x66,
    0x6f, // "Info" tag
    0x00,
    0x00,
    0x00,
    0x0f, // Tag flags
  ]);

  // Generate more realistic audio-like data
  const audioData = Buffer.alloc(Math.min(estimatedSize, 4096));
  let seed = 0;
  for (let i = 0; i < transcript.length; i++) {
    seed += transcript.charCodeAt(i);
  }

  // Fill with more audio-like patterns
  for (let i = 0; i < audioData.length; i++) {
    // Create wave-like patterns that look more like compressed audio
    const wave1 = Math.sin((i * seed) / 100) * 127;
    const wave2 = Math.cos((i * seed) / 200) * 64;
    const noise = ((seed * (i + 1) * 31) % 256) / 4;
    audioData[i] = Math.abs((wave1 + wave2 + noise) % 256);
  }

  const fullAudioBuffer = Buffer.concat([mp3Header, audioData]);

  return {
    success: false,
    audio_base64: fullAudioBuffer.toString("base64"),
    duration: duration,
    error:
      "Using fallback mock audio (OpenAI API key not available or API call failed)",
  };
}

function storeVoiceResponse(deviceId: string, response: VoiceResponse): void {
  let history = voiceHistory.get(deviceId);
  if (!history) {
    history = [];
    voiceHistory.set(deviceId, history);
  }

  history.push(response);

  // Keep only last 10 responses per device
  if (history.length > 10) {
    voiceHistory.set(deviceId, history.slice(-10));
  }
}

async function publishVoiceToMQTT(
  deviceId: string,
  response: VoiceResponse
): Promise<any> {
  const topic = `devices/${deviceId}/voice`;

  const mqttClient = getMqttClient();
  if (!mqttClient || !mqttClient.connected) {
    console.log(`📡 MQTT not connected - voice response queued for ${topic}`);
    return {
      success: false,
      topic: topic,
      reason: "MQTT not connected",
    };
  }

  const audioSizeBytes = Buffer.from(
    response.audio_mock || "",
    "base64"
  ).length;

  const payload = {
    // Separate metadata from binary audio data for better handling
    metadata: {
      device_id: response.device_id,
      message_type: "voice_response",
      transcript: response.message,
      severity: response.severity,
      personality: response.personality_type,
      generated_at: response.timestamp,
      audio_format: "mp3",
      audio_duration: Math.min(response.message.length * 0.08 + 1.5, 15),
      audio_size_bytes: audioSizeBytes,
      tts_provider: process.env.OPENAI_API_KEY ? "openai" : "fallback",
    },
    // Base64-encoded MP3 audio data from OpenAI TTS or fallback
    audio_data: response.audio_mock,
  };

  return new Promise((resolve) => {
    mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error(
          `❌ Failed to publish voice response to ${topic}:`,
          error.message
        );
        resolve({
          success: false,
          topic: topic,
          error: error.message,
        });
      } else {
        console.log(`✅ Voice response published to ${topic}`);
        console.log(`   Message: "${response.message}"`);
        console.log(`   Severity: ${response.severity}`);
        resolve({
          success: true,
          topic: topic,
          qos: 1,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });
}

function getVoiceHistory(deviceId?: string): any {
  if (deviceId) {
    const history = voiceHistory.get(deviceId) || [];
    return {
      success: true,
      message: `Retrieved ${history.length} voice responses for device ${deviceId}`,
      history: history,
    };
  }

  // Get all history
  const allHistory: any[] = [];
  voiceHistory.forEach((history, id) => {
    allHistory.push({
      device_id: id,
      responses: history,
      count: history.length,
    });
  });

  return {
    success: true,
    message: `Retrieved voice history for ${voiceHistory.size} devices`,
    history: allHistory,
  };
}

function clearVoiceHistory(deviceId?: string): any {
  if (deviceId) {
    voiceHistory.delete(deviceId);
    return {
      success: true,
      message: `Cleared voice history for device ${deviceId}`,
    };
  }

  const deviceCount = voiceHistory.size;
  voiceHistory.clear();
  return {
    success: true,
    message: `Cleared voice history for ${deviceCount} devices`,
  };
}

async function testVoiceGeneration(personality: string): Promise<any> {
  const testConditions = {
    temperature: 38,
    humidity: 95,
    battery: 15,
    signal_strength: -85,
  };

  const result = await generateVoiceResponse(
    "test_device_001",
    testConditions,
    personality,
    true // force response
  );

  return {
    success: true,
    message: "Test voice generation completed",
    test_conditions: testConditions,
    test_result: result,
  };
}

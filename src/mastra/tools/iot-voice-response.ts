import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';
import { getMqttClient } from './mqtt-connection.js';
import { getStoredMessages } from './iot-data-store.js';

interface VoiceResponse {
  device_id: string;
  message: string;
  severity: 'normal' | 'warning' | 'critical' | 'emergency';
  personality_type: string;
  timestamp: string;
  audio_mock?: string; // Mock audio data for demo
}

// In-memory storage for voice history (prevents repetition)
const voiceHistory: Map<string, VoiceResponse[]> = new Map();

export const iotVoiceResponseTool = createTool({
  id: 'iot-voice-response',
  description: 'Generate witty voice responses based on IoT device conditions with personality',
  inputSchema: z.object({
    action: z.enum([
      'analyze_and_respond',
      'generate_response', 
      'get_voice_history',
      'clear_history',
      'test_response'
    ]),
    device_id: z.string().optional(),
    conditions: z.object({
      temperature: z.number().optional(),
      humidity: z.number().optional(),
      pressure: z.number().optional(),
      battery: z.number().optional(),
      signal_strength: z.number().optional(),
      custom_metric: z.number().optional()
    }).optional(),
    personality: z.enum(['sassy', 'professional', 'friendly', 'dramatic']).optional().default('sassy'),
    force_response: z.boolean().optional().default(false)
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    voice_response: z.object({
      device_id: z.string(),
      transcript: z.string(),
      severity: z.string(),
      personality: z.string(),
      timestamp: z.string(),
      audio_data: z.string().optional(),
      mqtt_topic: z.string().optional()
    }).optional(),
    analysis: z.object({
      issues_found: z.array(z.string()),
      severity_level: z.string(),
      should_respond: z.boolean()
    }).optional(),
    history: z.array(z.any()).optional()
  }),
  execute: async ({ context }) => {
    const { action, device_id, conditions, personality, force_response } = context;

    try {
      switch (action) {
        case 'analyze_and_respond':
          if (!device_id) {
            return {
              success: false,
              message: 'Device ID required for analysis'
            };
          }
          return await analyzeAndRespond(device_id, personality || 'sassy', force_response || false);

        case 'generate_response':
          if (!device_id || !conditions) {
            return {
              success: false,
              message: 'Device ID and conditions required'
            };
          }
          return await generateVoiceResponse(device_id, conditions, personality || 'sassy', force_response || false);

        case 'get_voice_history':
          return getVoiceHistory(device_id);

        case 'clear_history':
          return clearVoiceHistory(device_id);

        case 'test_response':
          return await testVoiceGeneration(personality || 'sassy');

        default:
          return {
            success: false,
            message: 'Invalid action specified'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Voice response operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      message: `No data available for device ${deviceId}`
    };
  }

  // Analyze the latest message
  const latestMessage = messages[0];
  const conditions = extractConditions(latestMessage);
  
  return await generateVoiceResponse(deviceId, conditions, personality, forceResponse);
}

function extractConditions(message: any): any {
  // Extract conditions from the message payload
  const conditions: any = {};
  
  if (message.message) {
    if (message.message.temperature !== undefined) conditions.temperature = message.message.temperature;
    if (message.message.humidity !== undefined) conditions.humidity = message.message.humidity;
    if (message.message.pressure !== undefined) conditions.pressure = message.message.pressure;
    if (message.message.battery !== undefined) conditions.battery = message.message.battery;
    if (message.message.signal_strength !== undefined) conditions.signal_strength = message.message.signal_strength;
    
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
  // Analyze conditions and determine severity
  const analysis = analyzeConditions(conditions);
  
  // Check if we should respond (anti-spam logic)
  if (!forceResponse && !shouldRespond(deviceId, analysis.severity)) {
    return {
      success: false,
      message: 'Response skipped due to timing restrictions',
      analysis: {
        issues_found: analysis.issues,
        severity_level: analysis.severity,
        should_respond: false
      }
    };
  }

  // Generate the response message
  const transcript = generateMessage(conditions, analysis, personality, deviceId);
  
  // Generate real TTS audio
  const audioResult = await generateTTSAudio(transcript);
  
  // Create voice response object
  const voiceResponse: VoiceResponse = {
    device_id: deviceId,
    message: transcript,
    severity: analysis.severity as any,
    personality_type: personality,
    timestamp: new Date().toISOString(),
    audio_mock: audioResult.audio_base64
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
      mqtt_topic: mqttResult.topic
    },
    analysis: {
      issues_found: analysis.issues,
      severity_level: analysis.severity,
      should_respond: true
    }
  };
}

function analyzeConditions(conditions: any): { severity: string; issues: string[] } {
  const issues: string[] = [];
  let maxSeverity = 'normal';

  // Temperature analysis
  if (conditions.temperature !== undefined) {
    if (conditions.temperature > 40) {
      issues.push('Temperature critically high');
      maxSeverity = 'emergency';
    } else if (conditions.temperature > 35) {
      issues.push('Temperature very high');
      if (maxSeverity === 'normal') maxSeverity = 'critical';
    } else if (conditions.temperature > 30) {
      issues.push('Temperature elevated');
      if (maxSeverity === 'normal') maxSeverity = 'warning';
    } else if (conditions.temperature < 5) {
      issues.push('Temperature too low');
      if (maxSeverity === 'normal') maxSeverity = 'warning';
    }
  }

  // Humidity analysis
  if (conditions.humidity !== undefined) {
    if (conditions.humidity > 90) {
      issues.push('Humidity extremely high');
      if (maxSeverity === 'normal' || maxSeverity === 'warning') maxSeverity = 'critical';
    } else if (conditions.humidity < 20) {
      issues.push('Humidity very low');
      if (maxSeverity === 'normal') maxSeverity = 'warning';
    }
  }

  // Battery analysis
  if (conditions.battery !== undefined) {
    if (conditions.battery < 10) {
      issues.push('Battery critically low');
      if (maxSeverity === 'normal' || maxSeverity === 'warning') maxSeverity = 'critical';
    } else if (conditions.battery < 20) {
      issues.push('Battery low');
      if (maxSeverity === 'normal') maxSeverity = 'warning';
    }
  }

  // Signal strength analysis
  if (conditions.signal_strength !== undefined) {
    if (conditions.signal_strength < -90) {
      issues.push('Signal very weak');
      if (maxSeverity === 'normal') maxSeverity = 'warning';
    }
  }

  return {
    severity: maxSeverity,
    issues: issues
  };
}

function shouldRespond(deviceId: string, severity: string): boolean {
  const history = voiceHistory.get(deviceId);
  if (!history || history.length === 0) return true;

  const lastResponse = history[history.length - 1];
  const timeSinceLastResponse = Date.now() - new Date(lastResponse.timestamp).getTime();
  const minutesSinceLastResponse = timeSinceLastResponse / (1000 * 60);

  // Emergency/critical can always respond
  if (severity === 'emergency' || severity === 'critical') return true;

  // Warning needs 15 minutes gap
  if (severity === 'warning' && minutesSinceLastResponse < 15) return false;

  // Normal needs 30 minutes gap
  if (severity === 'normal' && minutesSinceLastResponse < 30) return false;

  return true;
}

function generateMessage(
  conditions: any, 
  analysis: any,
  personality: string,
  deviceId: string
): string {
  const history = voiceHistory.get(deviceId);
  const usedMessages = new Set(history?.map(h => h.message) || []);

  switch (personality) {
    case 'sassy':
      return generateSassyMessage(conditions, analysis, usedMessages);
    case 'professional':
      return generateProfessionalMessage(conditions, analysis);
    case 'friendly':
      return generateFriendlyMessage(conditions, analysis, usedMessages);
    case 'dramatic':
      return generateDramaticMessage(conditions, analysis, usedMessages);
    default:
      return generateSassyMessage(conditions, analysis, usedMessages);
  }
}

function generateSassyMessage(conditions: any, analysis: any, usedMessages: Set<string>): string {
  const messages: string[] = [];

  if (analysis.severity === 'emergency') {
    messages.push(
      "Oh HELL no! This is NOT a drill, people!",
      "Emergency! Drop everything and fix this NOW!",
      "Code red! I repeat, CODE RED!",
      "Houston, we have a MAJOR problem!"
    );
  } else if (analysis.severity === 'critical') {
    if (conditions.temperature > 35) {
      messages.push(
        "I'm hotter than a jalapeño in July!",
        "It's like a sauna in here, and NOT in a good way!",
        "Turn down the heat before I melt!",
        "Is this a device or a toaster oven?!"
      );
    }
    if (conditions.battery < 20) {
      messages.push(
        "Battery's running on fumes here!",
        "I'm hungrier than a teenager - FEED ME POWER!",
        "Running on empty like your promises to maintain me!",
        "Battery critical - this is your final warning!"
      );
    }
    if (conditions.humidity > 90) {
      messages.push(
        "It's wetter than a car wash in here!",
        "Humidity's higher than my sass levels!",
        "I'm not a submarine, you know!",
        "Did someone turn this place into a rainforest?"
      );
    }
  } else if (analysis.severity === 'warning') {
    messages.push(
      "Hey, not to be dramatic, but we've got a situation brewing",
      "Yellow alert - things are getting spicy",
      "I don't mean to nag, but... actually, yes I do",
      "Attention required - and I mean NOW, not later",
      "Warning bells are ringing, are you listening?"
    );
  } else {
    messages.push(
      "Everything's smoother than butter on silk",
      "All systems running like a dream",
      "Perfection achieved - you're welcome",
      "Status: Fabulous as always",
      "Running smoother than your pickup lines"
    );
  }

  // Filter out recently used messages
  const availableMessages = messages.filter(m => !usedMessages.has(m));
  const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
  
  return finalMessages[Math.floor(Math.random() * finalMessages.length)];
}

function generateProfessionalMessage(conditions: any, analysis: any): string {
  let message = `Device status: ${analysis.severity.toUpperCase()}. `;
  
  if (analysis.issues.length > 0) {
    message += `Issues detected: ${analysis.issues.join(', ')}. `;
    message += 'Immediate attention recommended.';
  } else {
    message += 'All parameters within normal operating range.';
  }
  
  return message;
}

function generateFriendlyMessage(conditions: any, analysis: any, usedMessages: Set<string>): string {
  const messages: string[] = [];

  if (analysis.severity === 'critical' || analysis.severity === 'emergency') {
    messages.push(
      "Oh dear, we need some help over here!",
      "Excuse me, but this needs your attention please!",
      "Hi friend, we have a bit of an urgent situation",
      "Sorry to bother you, but this is important!"
    );
  } else if (analysis.severity === 'warning') {
    messages.push(
      "Just a heads up - might want to check on this",
      "Friendly reminder: attention needed here",
      "Hey there! Got a small issue to report",
      "Hi! Just letting you know about a minor concern"
    );
  } else {
    messages.push(
      "Everything's looking great! Keep up the good work!",
      "All good here! Having a wonderful day!",
      "Status update: Everything's perfect!",
      "Happy to report all is well!",
      "Smooth sailing! No problems detected!"
    );
  }

  const availableMessages = messages.filter(m => !usedMessages.has(m));
  const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
  
  return finalMessages[Math.floor(Math.random() * finalMessages.length)];
}

function generateDramaticMessage(conditions: any, analysis: any, usedMessages: Set<string>): string {
  const messages: string[] = [];

  if (analysis.severity === 'emergency') {
    messages.push(
      "THE END IS NIGH! CATASTROPHE IMMINENT!",
      "This is it! The apocalypse we've been training for!",
      "DEFCON 1! All hands on deck!",
      "The prophecy foretold this dark hour!"
    );
  } else if (analysis.severity === 'critical') {
    messages.push(
      "Darkness falls upon our humble device!",
      "The forces of chaos are winning!",
      "Our darkest hour has arrived!",
      "The balance of power shifts toward disaster!"
    );
  } else if (analysis.severity === 'warning') {
    messages.push(
      "Storm clouds gather on the horizon...",
      "The winds of change blow ill tidings...",
      "A disturbance in the force, I sense...",
      "The fates whisper warnings in my circuits..."
    );
  } else {
    messages.push(
      "Peace reigns supreme in our digital kingdom!",
      "Harmony and balance restored to the realm!",
      "The sun shines upon our glorious success!",
      "Victory! Our systems triumph once more!",
      "Behold! Perfection in its purest form!"
    );
  }

  const availableMessages = messages.filter(m => !usedMessages.has(m));
  const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
  
  return finalMessages[Math.floor(Math.random() * finalMessages.length)];
}

async function generateTTSAudio(transcript: string): Promise<{ success: boolean; audio_base64: string; duration?: number; error?: string }> {
  console.log(`🎤 Generating OpenAI TTS audio for: "${transcript}"`);
  
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not found, using fallback audio');
      return generateFallbackAudio(transcript);
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Generate real audio using OpenAI TTS
    console.log('   🔄 Calling OpenAI TTS API...');
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx", // Deep, authoritative voice perfect for sassy responses
      input: transcript,
      speed: 1.0
    });

    // Convert response to buffer
    console.log('   🔄 Converting audio to buffer...');
    const arrayBuffer = await mp3Response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    
    // Convert to base64 for MQTT transmission
    const audioBase64 = audioBuffer.toString('base64');
    
    // Calculate duration estimate (rough approximation)
    const estimatedDuration = Math.min(transcript.length * 0.08 + 1.5, 15);
    
    console.log(`   ✅ OpenAI TTS audio generated successfully!`);
    console.log(`   📊 Audio size: ${audioBuffer.length} bytes`);
    console.log(`   ⏱️ Estimated duration: ${estimatedDuration.toFixed(1)}s`);
    
    return {
      success: true,
      audio_base64: audioBase64,
      duration: estimatedDuration
    };
    
  } catch (error) {
    console.error('❌ OpenAI TTS generation failed:', error);
    
    // Fallback to mock data if TTS fails
    console.log('   🔄 Falling back to mock audio data...');
    return generateFallbackAudio(transcript);
  }
}

function generateFallbackAudio(transcript: string): { success: boolean; audio_base64: string; duration?: number; error?: string } {
  // Generate better mock audio data as fallback
  const duration = Math.min(transcript.length * 0.05 + 1, 10);
  const estimatedSize = Math.floor(duration * 16000); // ~16KB per second
  
  // Create a more realistic MP3-like header
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 sync word and header
    0x00, 0x00, 0x00, 0x00, // Additional MP3 header bytes
    0x49, 0x6E, 0x66, 0x6F, // "Info" tag
    0x00, 0x00, 0x00, 0x0F, // Tag flags
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
    audio_base64: fullAudioBuffer.toString('base64'),
    duration: duration,
    error: 'Using fallback mock audio (OpenAI API key not available or API call failed)'
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

async function publishVoiceToMQTT(deviceId: string, response: VoiceResponse): Promise<any> {
  const topic = `devices/${deviceId}/voice`;
  
  const mqttClient = getMqttClient();
  if (!mqttClient || !mqttClient.connected) {
    console.log(`📡 MQTT not connected - voice response queued for ${topic}`);
    return {
      success: false,
      topic: topic,
      reason: 'MQTT not connected'
    };
  }

  const audioSizeBytes = Buffer.from(response.audio_mock || '', 'base64').length;
  
  const payload = {
    // Separate metadata from binary audio data for better handling
    metadata: {
      device_id: response.device_id,
      message_type: 'voice_response',
      transcript: response.message,
      severity: response.severity,
      personality: response.personality_type,
      generated_at: response.timestamp,
      audio_format: 'mp3',
      audio_duration: Math.min(response.message.length * 0.08 + 1.5, 15),
      audio_size_bytes: audioSizeBytes,
      tts_provider: process.env.OPENAI_API_KEY ? 'openai' : 'fallback'
    },
    // Base64-encoded MP3 audio data from OpenAI TTS or fallback
    audio_data: response.audio_mock
  };

  return new Promise((resolve) => {
    mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error(`❌ Failed to publish voice response to ${topic}:`, error.message);
        resolve({
          success: false,
          topic: topic,
          error: error.message
        });
      } else {
        console.log(`✅ Voice response published to ${topic}`);
        console.log(`   Message: "${response.message}"`);
        console.log(`   Severity: ${response.severity}`);
        resolve({
          success: true,
          topic: topic,
          qos: 1,
          timestamp: new Date().toISOString()
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
      history: history
    };
  }

  // Get all history
  const allHistory: any[] = [];
  voiceHistory.forEach((history, id) => {
    allHistory.push({
      device_id: id,
      responses: history,
      count: history.length
    });
  });

  return {
    success: true,
    message: `Retrieved voice history for ${voiceHistory.size} devices`,
    history: allHistory
  };
}

function clearVoiceHistory(deviceId?: string): any {
  if (deviceId) {
    voiceHistory.delete(deviceId);
    return {
      success: true,
      message: `Cleared voice history for device ${deviceId}`
    };
  }

  const deviceCount = voiceHistory.size;
  voiceHistory.clear();
  return {
    success: true,
    message: `Cleared voice history for ${deviceCount} devices`
  };
}

async function testVoiceGeneration(personality: string): Promise<any> {
  const testConditions = {
    temperature: 38,
    humidity: 95,
    battery: 15,
    signal_strength: -85
  };

  const result = await generateVoiceResponse(
    'test_device_001',
    testConditions,
    personality,
    true // force response
  );

  return {
    success: true,
    message: 'Test voice generation completed',
    test_conditions: testConditions,
    test_result: result
  };
}
# IoT Integration Template for Mastra

A comprehensive, production-ready template for integrating IoT devices with the Mastra AI framework through MQTT brokers. This template provides foundational tools, workflows, and an AI-powered coordinator agent that developers can customize for their specific IoT use cases.

## 🎯 Unique Value Proposition

This template uniquely combines:

- **Real-time IoT data streaming** with MQTT protocol support
- **AI-powered monitoring** with dynamic health score calculation using Mastra agents
- **Automated workflows** for scheduled monitoring with real tool execution
- **Intelligent message filtering** with debug capabilities
- **Non-blocking task execution** preventing system overload
- **Character-driven voice responses** featuring Rick Sanchez, Batman, Oprah, and Winnie the Pooh
- **Dual AI integration** - GPT-4 Mini for personalities + OpenAI TTS for voice synthesis

Perfect for: Smart agriculture, industrial IoT, home automation, environmental monitoring, and any MQTT-based IoT ecosystem.

## Overview

This template demonstrates:

- Connecting Mastra applications to any MQTT broker (HiveMQ, AWS IoT, etc.)
- Subscribing to and processing IoT data streams with wildcard support
- Publishing commands back to IoT devices with QoS guarantees
- Implementing scheduled workflows for automated monitoring
- Managing IoT data with configurable retention policies
- AI-powered health monitoring with dynamic scoring

## Prerequisites

- Node.js >= 20.9.0
- pnpm (recommended) or npm
- Access to an MQTT broker (cloud or self-hosted)

## Quick Start

### 1. Clone the template

```bash
# Using this as a template (recommended)
git clone https://github.com/canedy/IoT-Mastra-Template.git
cd IoT-Mastra-Template
```

### 2. Install dependencies

```bash
pnpm install
# or npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your MQTT broker details
```

For testing, you can use the free HiveMQ public broker:

```env
MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
# No username/password required for public broker
```

### 4. Start the application

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start
```

### 5. Access the Mastra playground

Open http://localhost:4112 to interact with tools and workflows

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# HiveMQ Cloud (takes precedence if set)
HIVEMQ_BROKER_URL=wss://your-cluster.hivemq.cloud:8884/mqtt
HIVEMQ_USERNAME=your-hivemq-username
HIVEMQ_PASSWORD=your-hivemq-password

# Alternative MQTT Broker (fallback)
MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password

# Connection Settings
MQTT_CLIENT_ID=mastra-iot-template
MQTT_KEEP_ALIVE=60              # seconds
MQTT_CONNECT_TIMEOUT=30000      # milliseconds
MQTT_CLEAN_SESSION=true

# OpenAI Configuration (for voice responses)
OPENAI_API_KEY=your-openai-api-key  # Required for real TTS audio

# Storage & Scheduling
DATA_STORE_TYPE=memory           # or 'file' for persistence
ENABLE_SCHEDULING=true           # Enable automated monitoring
AUTO_INIT=false                  # Auto-connect on startup
```

## ✨ Key Features

### 🎯 Dynamic Health Scoring

The template calculates real-time health scores based on:

- Connection status and stability
- Active device count and activity
- Data quality and anomalies
- Message processing errors
- System resource utilization

### 📊 Automated Reporting & Analytics

- Executive summaries for stakeholders
- Technical analysis reports for engineers
- Compliance audit documentation
- Performance metrics with trends
- Fun facts and insights with personality

### 🤖 AI Agent with Personality (IOTOR)

- Enthusiastic IoT coordinator with humor
- IoT puns and friendly error messages
- Technical expertise with approachable communication
- Comprehensive tool integration
- Memory-enabled conversations

### 🔧 Intelligent MQTT Management

- Filter messages by any JSON field with debug logging
- Support for wildcards (+, #) in topics
- Pause/resume subscriptions without disconnecting
- Non-blocking scheduled tasks preventing cron warnings
- Production-ready error handling with automatic reconnection

## Core Components

### Tools

1. **MQTT Connection** (`mqtt-connection`)

   - Establish and manage broker connections with WebSocket and TCP support
   - **Actions:** `connect`, `disconnect`, `status`
   - **Configuration options:**
     - `clean_session`: Controls session persistence (default: true). When false, broker maintains subscriptions and queued messages during disconnections
     - `keep_alive`: Ping interval in seconds to maintain connection (default: 60)
     - `reconnect`: Enable automatic reconnection on connection loss (default: true)
   - Automatic reconnection with configurable timeout handling
   - Connection status monitoring with event logging

2. **MQTT Subscribe** (`mqtt-subscribe`)

   - Subscribe to topics with wildcard support (+, #)
   - **Actions:** `subscribe`, `unsubscribe`, `list_subscriptions`, `pause`, `resume`
   - **Configuration options:**
     - `qos`: Quality of Service level (0, 1, or 2) - controls message delivery guarantees
     - `filter`: JSON object for message filtering - only processes messages matching all specified field values
   - **Pause/Resume:** Temporarily stop processing messages without unsubscribing (useful for debugging)
   - Debug logging shows filtered-out messages with reasons
   - Non-blocking message storage in background

3. **MQTT Publish** (`mqtt-publish`)

   - Publish messages with QoS support (0: at most once, 1: at least once, 2: exactly once)
   - **Actions:** `publish`, `publish_batch`, `publish_retained`, `clear_retained`
   - JSON and string message support with automatic serialization
   - Topic validation and error handling
   - Batch publishing for efficient bulk operations

4. **IoT Report Generator** (`iot-report-generator`)

   - Automated executive summaries and technical reports
   - Anomaly detection reports with recommendations
   - Compliance audit documentation
   - Performance metrics analysis
   - Export formats: Markdown, JSON, HTML, PDF-ready

5. **IoT Voice Response** (`iot-voice-response`)
   - **Actions:** `analyze_and_respond`, `generate_response`, `get_voice_history`, `clear_history`, `test_response`
   - **Character personalities powered by LLM:**
     - `rick_morty`: Cynical mad scientist with burps and dark humor
     - `batman`: Dark, brooding vigilante with dramatic intensity
     - `oprah`: Inspirational and empowering with life lessons
     - `winnie_pooh`: Lovable bear obsessed with honey
   - Uses OpenAI GPT-4 Mini to generate unique, character-specific responses
   - Anti-spam logic prevents message overload (15-30 min intervals)
   - Automatic severity detection (normal, warning, critical, emergency)
   - Publishes voice responses back to MQTT topics for device playback
   - **Dual AI integration:** OpenAI GPT for text generation + TTS for voice synthesis

### Workflows

1. **IoT Monitoring Workflow** (`iotMonitoringWorkflow`)
   - Four monitoring types: routine, connectivity, data quality, daily summary
   - Dynamic health score calculation (0-100)
   - Issue detection and recommendations
   - Automated scheduling with non-blocking execution
   - Configurable via environment variables

### Agent

**IOTOR - Your Friendly IoT Coordinator** (`iotCoordinatorAgent`)

- AI-powered assistant with personality and humor 🤖
- Expert in MQTT protocols and IoT troubleshooting
- Generates automated reports with insights and fun facts
- Provides recommendations with enthusiasm and IoT puns

## Usage Examples

### Basic MQTT Connection

```javascript
// The MQTT tools are used by the IoT coordinator agent
// You can interact with them through the agent in the Mastra playground
// Example agent prompt:
"Connect to MQTT broker and check status";

// The agent will use the mqtt-connection tool with actions:
// - connect: Establish broker connection
// - disconnect: Close connection
// - status: Check current connection state
```

### Subscribe to Topics

```javascript
// Through the IoT coordinator agent:
"Subscribe to sensors/+/temperature with QoS 1 and filter for warehouse location";

// Available subscribe actions:
// - subscribe: Subscribe to topics with wildcards
// - unsubscribe: Remove subscription
// - list_subscriptions: Show active subscriptions
// - pause: Temporarily stop processing messages
// - resume: Resume processing messages

// The agent handles the tool execution internally
```

### Publish Commands

```javascript
// Through the IoT coordinator agent:
"Publish a restart command to device123";

// Available publish actions:
// - publish: Send single message
// - publish_batch: Send multiple messages
// - publish_retained: Publish with retain flag
// - clear_retained: Clear retained message
```

### Execute Monitoring Workflow

```javascript
// The monitoring workflow runs automatically when ENABLE_SCHEDULING=true
// Schedule:
// - Routine: every 30 minutes - Agent checks MQTT status and analyzes messages
// - Connectivity: every hour - Agent tests broker connection
// - Data quality: every 2 hours - Agent analyzes data patterns
// - Daily summary: 8 AM daily - Agent generates executive report

// How it works:
// 1. Cron job triggers the monitoring task
// 2. System calls the IoT Coordinator Agent with specific prompts
// 3. Agent uses its tools (mqtt-connection, iot-data-store, etc.) to gather data
// 4. Agent generates a response with real monitoring insights
// 5. System logs the results with health scores and metrics
```

## Common Patterns

### Device Telemetry Collection

```javascript
// Use the IoT coordinator agent to manage subscriptions:

// Example 1: Subscribe to all device telemetry
"Subscribe to devices/+/telemetry with QoS 1";

// Example 2: Subscribe with filtering
"Subscribe to sensors/# and filter for warehouse location with active status";

// The agent will handle wildcard patterns:
// + matches any single level
// # matches multiple levels
```

### Message Filtering and Monitoring

```javascript
// Through the IoT coordinator agent:

// Subscribe with filtering for critical alerts
"Subscribe to alerts/# with QoS 2 and filter for critical severity that are not acknowledged";

// Pause subscription for maintenance
"Pause the subscription to sensors/+/temperature";

// List active subscriptions
"List all active MQTT subscriptions";
// Returns: topic, qos, paused status, and filter info

// Resume after maintenance
"Resume the subscription to sensors/+/temperature";
```

### Health Monitoring & Reporting

```javascript
// Interact with IOTOR through the Mastra playground:

// Check system health
"Check MQTT connection status and analyze system health";

// Generate reports
"Generate an executive summary report for the last 24 hours";

// Available report types:
// - executive_summary: High-level overview
// - technical_analysis: Detailed technical report
// - anomaly_report: Focus on anomalies
// - compliance_audit: Compliance documentation
// - performance_metrics: Performance analysis
```

### Voice Response System

```javascript
// Through the IoT coordinator agent:

// Analyze device data and generate witty response
"Analyze the latest data from device123 and generate a sassy voice response";

// Test different character personalities
"Generate a Rick and Morty voice response for high temperature conditions";
"Create a Batman voice message for security breach warning";
"Generate an Oprah response for system recovery";
"Create a Winnie the Pooh message for low battery";

// The agent will:
// 1. Analyze device conditions (temperature, humidity, battery, etc.)
// 2. Determine severity level (normal, warning, critical, emergency)
// 3. Use OpenAI GPT-4 Mini to generate character-specific message
// 4. Convert message to audio using OpenAI TTS (onyx voice)
// 5. Publish voice response to devices/{device_id}/voice topic

// Voice responses are published to MQTT topics like:
// devices/sensor123/voice
// Payload structure:
// {
//   metadata: { transcript, severity, personality, audio_format, duration },
//   audio_data: "base64-encoded-audio-bytes" // Mock binary audio data for demo
// }
//
// Note: Requires OPENAI_API_KEY for both:
// - GPT-4 Mini: Generates character-specific messages
// - TTS API: Converts messages to MP3 audio
// Falls back to predefined messages and mock audio if API key not set
```

## Supported MQTT Brokers

### Cloud Brokers

- HiveMQ Cloud
- AWS IoT Core
- Azure IoT Hub
- Google Cloud IoT Core

### Self-Hosted

- Eclipse Mosquitto
- EMQX
- VerneMQ
- RabbitMQ (with MQTT plugin)

## Development

### Project Structure

```
src/mastra/
├── index.ts                    # Main Mastra configuration
├── tools/
│   ├── mqtt-connection.ts      # MQTT broker connection management
│   ├── mqtt-subscribe.ts       # Topic subscription with filtering
│   ├── mqtt-publish.ts         # Message publishing with QoS
│   ├── iot-data-store.ts       # In-memory IoT message storage
│   ├── iot-report-generator.ts # Automated IoT reporting system
│   └── iot-voice-response.ts   # AI-powered voice responses with OpenAI TTS
├── workflows/
│   └── scheduled-monitoring.ts # IoT monitoring workflow with scheduling
└── agents/
    └── iot-coordinator.ts      # IOTOR - Friendly AI coordinator with personality
```

### Running Tests

```bash
# Note: test:mqtt is a placeholder script
# To test MQTT, start the dev server and use the playground:
pnpm dev

# Type checking
pnpm type-check

# Run all checks
pnpm test && pnpm type-check
```

### Testing Your Setup

1. **Start the Development Server:**

```bash
pnpm dev
```

2. **Access Mastra Playground:**
   Open http://localhost:4112 in your browser

3. **Test with the IoT Coordinator Agent:**
   In the playground, interact with IOTOR:

   - "Connect to MQTT broker"
   - "Check connection status"
   - "Subscribe to test/+/data"
   - "Publish a test message to test/device1/data"
   - "List all active subscriptions"
   - "Analyze device data and generate a sassy voice response"
   - "Test voice response with different personalities"

4. **Monitor Scheduled Tasks:**
   When ENABLE_SCHEDULING=true, automated monitoring runs:

   - Routine monitoring: Every 30 minutes
   - Connectivity check: Every hour
   - Data quality check: Every 2 hours
   - Daily summary: 8 AM daily

   Check the console logs for monitoring execution and health scores.

## Production Deployment

### Docker

```bash
docker build -t mastra-iot .
docker run -p 3000:3000 --env-file .env mastra-iot
```

### Environment Variables for Production

- Use secure credential storage
- Enable TLS/SSL connections
- Configure appropriate retention policies
- Set up monitoring and alerting

## Security Best Practices

1. **Authentication**

   - Use strong passwords or certificates
   - Rotate credentials regularly
   - Store secrets securely

2. **Encryption**

   - Always use TLS/SSL (wss://, mqtts://)
   - Validate server certificates
   - Encrypt sensitive message payloads

3. **Access Control**
   - Implement topic-level ACLs
   - Use least privilege principle
   - Audit all operations

## Troubleshooting

### Connection Issues

- Check broker URL format and port
- Verify credentials
- Ensure network connectivity
- Check firewall rules

### Message Processing

- Monitor processor statistics
- Check error logs
- Verify topic patterns
- Validate message formats

### Performance

- Adjust batch sizes
- Configure retention policies
- Monitor memory usage
- Optimize message processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This template is provided under the MIT License. See LICENSE file for details.

## Recent Enhancements

### 🎭 Character-Driven Voice Responses

- **Dynamic personality generation** using GPT-4 Mini for unique responses every time
- **Four iconic characters**: Rick Sanchez (_burp_), Batman (dark & brooding), Oprah (inspirational), Winnie the Pooh (honey-obsessed)
- **Dual AI system**: LLM for text generation + TTS for voice synthesis
- **Anti-spam protection**: Prevents message flooding with smart timing restrictions

### 🔧 Production-Ready Monitoring

- **Agent-based execution**: Uses `mastra.getAgent()` and `agent.generate()` per official API
- **Real tool integration**: Agent uses mqtt-connection, iot-data-store for actual monitoring
- **Non-blocking cron jobs**: Prevents system freezes with proper async handling
- **Graceful fallbacks**: Mock data when services unavailable

### 🛠️ Technical Improvements

- **Concurrency locks**: Prevents duplicate voice generation for same device
- **Optimized logging**: Reduced verbosity while maintaining debugging capability
- **Fixed workflow execution**: Bypassed browser-specific APIs for Node.js compatibility
- **Enhanced error handling**: Try-finally blocks ensure resource cleanup

## Support

- Documentation: [Mastra Docs](https://docs.mastra.ai)

# IoT Integration Template for Mastra

A comprehensive, production-ready template for integrating IoT devices with the Mastra AI framework through MQTT brokers. This template provides foundational tools, workflows, and an AI-powered coordinator agent that developers can customize for their specific IoT use cases.

## 🎯 Unique Value Proposition

This template uniquely combines:

- **Real-time IoT data streaming** with MQTT protocol support
- **AI-powered monitoring** with dynamic health score calculation
- **Automated workflows** for scheduled monitoring and data processing
- **Intelligent message filtering** with debug capabilities
- **Non-blocking task execution** preventing system overload
- **Voice response system** with personality-driven audio feedback

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
gh repo create my-iot-project --template mastra-iot-template
cd my-iot-project

# Or clone directly
git clone <repository-url>
cd template-hackathon-v2
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
   - **Personality types:** `sassy`, `professional`, `friendly`, `dramatic`
   - Analyzes incoming device data and generates witty audio responses
   - Anti-spam logic prevents message overload (15-30 min intervals)
   - Automatic severity detection (normal, warning, critical, emergency)
   - Publishes voice responses back to MQTT topics for device playback
   - **Real OpenAI TTS integration** with "onyx" voice for authentic audio generation (falls back to mock data if API key not provided)

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
"Connect to MQTT broker and check status"

// The agent will use the mqtt-connection tool with actions:
// - connect: Establish broker connection
// - disconnect: Close connection
// - status: Check current connection state
```

### Subscribe to Topics

```javascript
// Through the IoT coordinator agent:
"Subscribe to sensors/+/temperature with QoS 1 and filter for warehouse location"

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
"Publish a restart command to device123"

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
// - Routine: every 30 minutes
// - Connectivity: every hour
// - Data quality: every 2 hours  
// - Daily summary: 8 AM daily

// The workflow can be triggered through the Mastra playground
// or will run automatically based on the schedule
```

## Common Patterns

### Device Telemetry Collection

```javascript
// Use the IoT coordinator agent to manage subscriptions:

// Example 1: Subscribe to all device telemetry
"Subscribe to devices/+/telemetry with QoS 1"

// Example 2: Subscribe with filtering
"Subscribe to sensors/# and filter for warehouse location with active status"

// The agent will handle wildcard patterns:
// + matches any single level
// # matches multiple levels
```

### Message Filtering and Monitoring

```javascript
// Through the IoT coordinator agent:

// Subscribe with filtering for critical alerts
"Subscribe to alerts/# with QoS 2 and filter for critical severity that are not acknowledged"

// Pause subscription for maintenance
"Pause the subscription to sensors/+/temperature"

// List active subscriptions
"List all active MQTT subscriptions"
// Returns: topic, qos, paused status, and filter info

// Resume after maintenance
"Resume the subscription to sensors/+/temperature"
```

### Health Monitoring & Reporting

```javascript
// Interact with IOTOR through the Mastra playground:

// Check system health
"Check MQTT connection status and analyze system health"

// Generate reports
"Generate an executive summary report for the last 24 hours"

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
"Analyze the latest data from device123 and generate a sassy voice response"

// Test different personalities
"Generate a dramatic voice response for high temperature conditions"
"Create a friendly voice message for low battery warning"
"Generate a professional status update for normal conditions"

// The agent will:
// 1. Analyze device conditions (temperature, humidity, battery, etc.)
// 2. Determine severity level (normal, warning, critical, emergency)
// 3. Generate personality-driven message
// 4. Publish voice response to devices/{device_id}/voice topic
// 5. Include mock audio data for demonstration

// Voice responses are published to MQTT topics like:
// devices/sensor123/voice
// Payload structure:
// {
//   metadata: { transcript, severity, personality, audio_format, duration },
//   audio_data: "base64-encoded-audio-bytes" // Mock binary audio data for demo
// }
// 
// Note: audio_data contains real MP3 audio from OpenAI TTS (if API key provided)
// Falls back to mock audio data if OPENAI_API_KEY is not set
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

## Support

- Documentation: [Mastra Docs](https://docs.mastra.ai)

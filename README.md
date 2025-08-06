# IoT Integration Template for Mastra

A comprehensive, production-ready template for integrating IoT devices with the Mastra AI framework through MQTT brokers. This template provides foundational tools, workflows, and an AI-powered coordinator agent that developers can customize for their specific IoT use cases.

## 🎯 Unique Value Proposition

This template uniquely combines:
- **Real-time IoT data streaming** with MQTT protocol support
- **AI-powered monitoring** with dynamic health score calculation
- **Automated workflows** for scheduled monitoring and data processing
- **Intelligent message filtering** with debug capabilities
- **Non-blocking task execution** preventing system overload

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

# Storage & Scheduling
DATA_STORE_TYPE=memory           # or 'file' for persistence
ENABLE_SCHEDULING=true           # Enable automated monitoring
AUTO_INIT=false                  # Auto-connect on startup
```

## ✨ Key Features

### Dynamic Health Scoring
The template calculates real-time health scores based on:
- Connection status and stability
- Active device count and activity
- Data quality and anomalies
- Message processing errors
- System resource utilization

### Intelligent Message Filtering
- Filter messages by any JSON field
- Debug mode shows filtered messages
- Support for wildcards (+, #) in topics
- Pause/resume subscriptions without disconnecting

### Non-blocking Scheduled Tasks
- Prevents node-cron execution warnings
- Concurrent task prevention
- Graceful error handling
- Configurable intervals via environment

### Production-Ready Error Handling
- Automatic reconnection with exponential backoff
- Message queuing during disconnections
- Comprehensive error logging
- Graceful degradation

## Core Components

### Tools

1. **MQTT Connection** (`mqtt-connection`)
   - Establish and manage broker connections
   - Support for WebSocket and TCP connections
   - Automatic reconnection with timeout handling
   - Connection status monitoring

2. **MQTT Subscribe** (`mqtt-subscribe`)
   - Subscribe to topics with wildcard support (+, #)
   - Message filtering by JSON field values
   - Pause/resume functionality
   - Debug logging for filtered messages
   - List active subscriptions

3. **MQTT Publish** (`mqtt-publish`)
   - Publish messages with QoS support (0, 1, 2)
   - JSON and string message support
   - Topic validation
   - Batch publishing capabilities

### Workflows

1. **IoT Monitoring Workflow** (`iotMonitoringWorkflow`)
   - Four monitoring types: routine, connectivity, data quality, daily summary
   - Dynamic health score calculation (0-100)
   - Issue detection and recommendations
   - Automated scheduling with non-blocking execution
   - Configurable via environment variables

### Agent

**IoT Coordinator Agent** (`iot-coordinator`)
- AI-powered assistant for IoT management
- Helps with configuration and troubleshooting
- Provides insights and recommendations

## Usage Examples

### Basic MQTT Connection

```javascript
// Connect to broker
const result = await mastra.getTool('mqtt-connection').execute({
  context: {
    action: 'connect',
    config: {
      broker_url: 'wss://broker.hivemq.com:8884/mqtt',
      username: 'user',
      password: 'pass'
    }
  }
});
```

### Subscribe to Topics

```javascript
// Subscribe to temperature sensors
await mastra.getTool('mqtt-subscribe').execute({
  context: {
    action: 'subscribe',
    config: {
      topics: 'sensors/+/temperature',
      qos: '1'
    }
  }
});
```

### Publish Commands

```javascript
// Send command to device
await mastra.getTool('mqtt-publish').execute({
  context: {
    action: 'publish',
    config: {
      topic: 'devices/device123/commands',
      message: { command: 'restart', timestamp: Date.now() }
    }
  }
});
```

### Execute Monitoring Workflow

```javascript
// Run monitoring workflow
const workflow = mastra.getWorkflow('iotMonitoringWorkflow');
const result = await workflow.execute({
  check_type: 'routine_monitoring', // or 'connectivity_check', 'data_quality_check', 'daily_summary'
  output_format: 'summary'
});

// Scheduled monitoring runs automatically when ENABLE_SCHEDULING=true
// - Routine: every 10 minutes
// - Connectivity: every hour  
// - Data quality: every 2 hours
// - Daily summary: 8 AM
```

## Common Patterns

### Device Telemetry Collection
```javascript
// Subscribe to all device telemetry with wildcards
await mastra.getTool('mqtt-subscribe').execute({
  context: {
    action: 'subscribe',
    config: {
      topics: 'devices/+/telemetry',  // + matches any single level
      qos: '1'
    }
  }
});

// Subscribe with filtering
await mastra.getTool('mqtt-subscribe').execute({
  context: {
    action: 'subscribe',
    config: {
      topics: 'sensors/#',  // # matches multiple levels
      filter: {
        location: 'warehouse',
        status: 'active'
      }
    }
  }
});
```

### Message Filtering and Monitoring
```javascript
// Pause specific subscription
await mastra.getTool('mqtt-subscribe').execute({
  context: {
    action: 'pause',
    topic: 'sensors/+/temperature'
  }
});

// List all active subscriptions
const subs = await mastra.getTool('mqtt-subscribe').execute({
  context: { action: 'list_subscriptions' }
});
console.log(subs.details.subscriptions);
```

### Health Monitoring
```javascript
// Check system health with AI agent
const agent = mastra.getAgent('iotCoordinatorAgent');
const health = await agent.generate([{
  role: 'user',
  content: 'Check MQTT connection status and analyze system health'
}]);

// Run scheduled monitoring workflow
const workflow = mastra.getWorkflow('iotMonitoringWorkflow');
const result = await workflow.execute({
  check_type: 'connectivity_check',
  filters: {
    devices: ['sensor1', 'sensor2'],
    severity: 'high'
  }
});
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
│   └── mqtt-publish.ts         # Message publishing with QoS
├── workflows/              
│   └── scheduled-monitoring.ts # IoT monitoring workflow with scheduling
└── agents/                 
    └── iot-coordinator.ts      # AI-powered IoT system coordinator
```

### Running Tests
```bash
# Test MQTT connection
pnpm test:mqtt

# Type checking
pnpm type-check

# Run all checks
pnpm test && pnpm type-check
```

### Testing Your Setup

1. **Test MQTT Connection:**
```javascript
// In Mastra playground or your code
const result = await mastra.getTool('mqtt-connection').execute({
  context: { action: 'status' }
});
console.log(result); // Should show connection status
```

2. **Test Subscribe & Publish:**
```javascript
// Subscribe to test topic
await mastra.getTool('mqtt-subscribe').execute({
  context: {
    action: 'subscribe',
    config: { topics: 'test/+/data' }
  }
});

// Publish test message
await mastra.getTool('mqtt-publish').execute({
  context: {
    action: 'publish',
    config: {
      topic: 'test/device1/data',
      message: { value: 42, timestamp: Date.now() }
    }
  }
});
```

3. **Test Scheduled Monitoring:**
The template includes automated monitoring that runs:
- Routine monitoring: Every 10 minutes
- Connectivity check: Every hour
- Data quality check: Every 2 hours
- Daily summary: 8 AM daily

Check logs for monitoring results showing dynamic health scores.

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
- Issues: [GitHub Issues](https://github.com/mastra/templates)
- Community: [Discord](https://discord.gg/mastra)
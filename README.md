# IoT Integration Template for Mastra

A generic, production-ready template for integrating IoT devices with the Mastra AI framework through MQTT brokers. This template provides foundational tools and workflows that developers can customize for their specific IoT use cases.

## Overview

This template demonstrates:
- Connecting Mastra applications to MQTT brokers
- Subscribing to and processing IoT data streams
- Publishing commands back to IoT devices
- Implementing scheduled workflows for automated monitoring
- Managing IoT data with configurable retention policies

## Prerequisites

- Node.js >= 20.9.0
- pnpm (recommended) or npm
- Access to an MQTT broker (cloud or self-hosted)

## Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd template-hackathon-v2
pnpm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your MQTT broker details
```

3. **Start the application:**
```bash
pnpm dev
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# MQTT Broker (Required)
MQTT_BROKER_URL=wss://your-broker-url:8884/mqtt
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password

# Optional Settings
MQTT_CLIENT_ID=mastra-iot-template
MQTT_KEEP_ALIVE=60
MQTT_CONNECT_TIMEOUT=30000
MQTT_CLEAN_SESSION=true

# Data Configuration
DATA_STORE_TYPE=memory
DATA_RETENTION_HOURS=24
MAX_RECORDS_PER_DEVICE=1000

# System Control
AUTO_INIT=false
```

## Core Components

### Tools

1. **MQTT Connection** (`mqtt-connection`)
   - Establish and manage broker connections
   - Support for WebSocket and TCP connections
   - Automatic reconnection with backoff

2. **MQTT Subscribe** (`mqtt-subscribe`)
   - Subscribe to topics with wildcard support
   - Message filtering and routing
   - Pause/resume functionality

3. **MQTT Publish** (`mqtt-publish`)
   - Publish messages with QoS support
   - Batch publishing capabilities
   - Message queuing when offline

4. **Data Store** (`data-store`)
   - Store IoT data with retention policies
   - Query and aggregate historical data
   - Export data in JSON/CSV formats

5. **Message Processor** (`message-processor`)
   - Register custom message handlers
   - Transform, filter, and enrich data
   - Alert generation based on conditions

### Workflows

1. **Scheduled Monitoring** (`scheduled-monitoring`)
   - Periodic data collection and analysis
   - Metric calculation and alerting
   - Automated report generation

2. **Data Processing** (`data-processing`)
   - Batch processing of IoT data
   - Aggregation, transformation, filtering
   - Result publishing to output topics

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

### Schedule Monitoring

```javascript
// Start monitoring every 5 minutes
import { startScheduledMonitoring } from './src/mastra/workflows/scheduled-monitoring.js';

startScheduledMonitoring('*/5 * * * *', {
  metrics: ['message_rate', 'device_availability'],
  alert_thresholds: {
    error_rate: 10
  }
});
```

## Common Patterns

### Device Telemetry Collection
```javascript
// Subscribe to all device telemetry
subscriber.subscribe('devices/+/telemetry');

// Process with automatic storage
processor.register({
  id: 'telemetry-processor',
  topic_pattern: 'devices/+/telemetry',
  handler_type: 'store'
});
```

### Real-time Alerts
```javascript
// Configure alert conditions
processor.register({
  id: 'temperature-alerts',
  topic_pattern: 'sensors/+/temperature',
  handler_type: 'alert',
  config: {
    conditions: [{
      field: 'value',
      operator: 'gt',
      value: 40,
      severity: 'high'
    }]
  }
});
```

### Data Aggregation
```javascript
// Hourly aggregation workflow
workflow.execute({
  source_topic: 'sensors/+/data',
  processing_type: 'aggregate',
  processing_rules: {
    group_by: 'sensor_id',
    metrics: ['temperature', 'humidity']
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
├── index.ts                 # Main configuration
├── tools/                   # MQTT and data tools
├── workflows/              # Automated workflows
└── agents/                 # AI coordinator
```

### Running Tests
```bash
pnpm test
pnpm test:mqtt  # Test MQTT connection
```

### Type Checking
```bash
pnpm type-check
```

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
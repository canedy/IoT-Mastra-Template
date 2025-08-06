# Template Submission Information

## Template Details

**Template Name:** IoT Integration Template for Mastra

**Author Name:** [Your Name]

**Author Email:** [Your Email]

**GitHub Repository URL:** https://github.com/[YOUR_USERNAME]/mastra-iot-template

## Description

A comprehensive, production-ready template for integrating IoT devices with the Mastra AI framework through MQTT brokers. This template uniquely combines real-time IoT data streaming, AI-powered health monitoring, and automated workflows with non-blocking execution.

### Key Features:
- **Dynamic Health Scoring**: Real-time calculation based on connection status, device activity, data quality, and system metrics
- **Intelligent Message Filtering**: Debug-enabled filtering with wildcard support
- **Non-blocking Scheduled Tasks**: Prevents node-cron warnings with concurrent task prevention
- **Production-Ready Error Handling**: Automatic reconnection, message queuing, comprehensive logging
- **AI-Powered Monitoring**: IoT Coordinator agent with actual tool implementations

### Use Cases:
- Smart Agriculture (sensor monitoring, irrigation control)
- Industrial IoT (equipment monitoring, predictive maintenance)
- Home Automation (device control, energy management)
- Environmental Monitoring (weather stations, air quality)
- Healthcare IoT (patient monitoring, equipment tracking)

## Technical Compliance

✅ **Code Organization**: Properly structured in `src/mastra/` directory
✅ **TypeScript Configuration**: Standard tsconfig with strict typing
✅ **Environment Variables**: Comprehensive `.env.example` with all settings
✅ **Error Handling**: Try-catch blocks, timeout handling, graceful degradation
✅ **Zod Validation**: All tools and workflows use Zod schemas
✅ **Documentation**: Detailed README with setup, usage, and examples
✅ **Testing**: Comprehensive test suite in `examples/test-setup.ts`

## Innovation & Uniqueness

1. **First MQTT/IoT Template**: Fills a gap in Mastra's template ecosystem
2. **Dynamic Health Scoring**: Not just hardcoded values but actual system analysis
3. **Real-world Ready**: Handles disconnections, filtering, scheduling issues
4. **Educational Value**: Shows advanced patterns like non-blocking execution, message filtering
5. **Extensible Design**: Easy to customize for specific IoT use cases

## Setup Instructions

1. Clone as template: `gh repo create my-iot-project --template mastra-iot-template`
2. Install dependencies: `pnpm install`
3. Configure environment: `cp .env.example .env`
4. Start development: `pnpm dev`
5. Run tests: `pnpm tsx examples/test-setup.ts`

## Demo Screenshots

### Mastra Playground
Access at http://localhost:4112 to interact with tools and workflows

### Console Output
```
🕐 Initializing IoT scheduled monitoring tasks...
✅ IoT scheduled monitoring tasks initialized
   - Routine monitoring: every 10 minutes
   - Connectivity check: every hour
   - Data quality check: every 2 hours
   - Daily summary: 8 AM daily
[MQTT] Connected to wss://broker.hivemq.com:8884/mqtt
[MQTT] Filter applied to sensors/+/temperature: {unit: "celsius"}
[MQTT] Received on sensors/device1/temperature: {temperature: 25, unit: "celsius"}
✅ routine_monitoring completed at 2025-08-06T02:00:33.282Z
   Devices checked: 3
   Messages analyzed: 5
   Issues found: 0
   Health score: 85
```

## GitHub Repository Settings

To configure as a template repository:
1. Go to Settings → General
2. Check "Template repository"
3. Add topics: `mastra`, `iot`, `mqtt`, `typescript`, `ai`

## Community Contribution

This template contributes to the Mastra community by:
- Providing the first IoT/MQTT integration example
- Demonstrating advanced workflow patterns
- Showing proper error handling and monitoring
- Offering production-ready code that can be deployed immediately
- Teaching best practices for real-time data processing

## Support & Maintenance

- Will maintain the template and respond to issues
- Available on Mastra Discord for support
- Planning future enhancements (more broker examples, dashboard UI)
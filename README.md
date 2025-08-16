# MQTT-Mastra Integration Template

A production-ready template showcasing seamless MQTT integration with Mastra AI agents and tools. This template demonstrates how to build intelligent IoT systems that combine real-time MQTT messaging with AI-powered decision making.

## 🎯 Key Integration Features

### MQTT + AI Agent Integration
- 📡 **Real-time MQTT Communication**: Bi-directional messaging with any MQTT broker
- 🤖 **AI-Powered Processing**: Intelligent agents that respond to IoT data streams
- 🔄 **Auto-Memory Bridge**: Automatic storage of MQTT messages in agent memory
- 🛠️ **Modular Tool System**: Reusable MQTT tools for any IoT use case
- 💾 **Persistent Memory**: SQLite-backed memory for historical data analysis
- 👤 **Human-in-the-Loop**: Approval workflows for critical IoT actions

### Technical Capabilities
- **MQTT Protocol Support**: Full MQTT 3.1.1/5.0 with QoS levels
- **Topic Wildcards**: Support for `+` and `#` wildcards in subscriptions
- **Connection Management**: Auto-reconnect with exponential backoff
- **Message Bridge**: Automatic MQTT → Agent memory synchronization
- **Tool Composition**: Chain multiple tools for complex IoT workflows

## Prerequisites

- Node.js >= 20.9.0
- pnpm package manager
- MQTT Broker (HiveMQ Cloud recommended - free tier available)
- OpenAI API key (for AI agent functionality)

## Quick Start

### 1. Clone the template

```bash
git clone <your-repo-url>
cd mqtt-mastra-template
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your MQTT broker details
```

## Environment Requirements

Create a `.env` file based on `.env.example`:

```
# OpenAI API Key (optional, for voice features)
OPENAI_API_KEY=your-openai-api-key

# =============================================================================
# MQTT BROKER CONFIGURATION
# =============================================================================

HIVEMQ_BROKER_URL=your_hivemq_url
HIVEMQ_USERNAME=your_username
HIVEMQ_PASSWORD=your_password
```

### 4. Start the application

1. Start Mastra playground: `pnpm run dev`
2. Open browser to playground URL
3. Login to HiveMQ to simulate the IOT device messages

## MQTT Integration Architecture

### How It Works

1. **MQTT Messages** arrive via broker subscriptions
2. **Memory Bridge** automatically stores messages in shared memory
3. **AI Agent** processes data using specialized tools
4. **Actions** are executed via MQTT publish commands
5. **Human Approval** required for critical operations

### Example: Chicken Coop IoT Demo

The template includes a fully-functional chicken coop management system demonstrating:
- Temperature monitoring with safety thresholds
- Automated feeding schedules
- Environmental control systems
- Pattern detection from historical data

### MQTT Tool Showcase

#### Connection Management
```javascript
// Automatic connection with retry logic
await mqttConnectionTool.execute({ 
  action: 'connect',
  broker: process.env.HIVEMQ_BROKER_URL 
});
```

#### Subscribe with Memory Bridge
```javascript
// Messages automatically stored in agent memory
await mqttSubscribeTool.execute({ 
  topic: 'sensors/+/temperature',
  qos: 1 
});
```

#### Intelligent Processing
```javascript
// Agent analyzes MQTT data and takes action
if (temperature > threshold) {
  await agent.execute('Activate cooling systems');
}
```

## Getting Started with MQTT Integration

### Step 1: Configure Your MQTT Broker

Set up your MQTT connection in `.env`:
```bash
HIVEMQ_BROKER_URL=wss://your-cluster.hivemq.cloud:8884/mqtt
HIVEMQ_USERNAME=your-username
HIVEMQ_PASSWORD=your-password
```

### Step 2: Launch Mastra Playground

```bash
pnpm dev
# Open http://localhost:3000 in your browser
```

### Step 3: Test MQTT Integration

1. **Connect to Broker**: Use the playground UI to establish MQTT connection
2. **Subscribe to Topics**: Set up subscriptions like `sensors/+/data`
3. **Send Test Messages**: Use your MQTT client to publish test data
4. **Watch AI Response**: See the agent process and respond to MQTT messages

### Step 4: Extend with Your Use Case

1. **Create Custom Tools**: Build tools specific to your IoT devices
2. **Define Agent Logic**: Customize agent instructions for your domain
3. **Add Workflows**: Implement scheduled tasks and batch processing
4. **Scale Up**: Deploy to production with environment-specific configs

## MQTT Message Examples

### Generic IoT Sensor Data
```json
// Topic: sensors/{device-id}/telemetry
{
  "device_id": "sensor-001",
  "type": "temperature",
  "value": 72.5,
  "unit": "fahrenheit",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Command Messages
```json
// Topic: devices/{device-id}/commands
{
  "command": "activate",
  "target": "cooling-system",
  "parameters": {
    "intensity": 75,
    "duration": 3600
  }
}
```

### Status Updates
```json
// Topic: devices/{device-id}/status
{
  "device_id": "actuator-001",
  "status": "online",
  "battery": 85,
  "last_action": "cooling_activated"
}
```

## Resources & Documentation

### Framework & Tools

- **[Mastra AI Framework](https://mastra.ai/docs)** - Core framework for building AI agents and workflows

  - [Getting Started Guide](https://mastra.ai/docs/quickstart)
  - [Agent Development](https://mastra.ai/docs/agents)
  - [Tool Creation](https://mastra.ai/docs/tools)
  - [Memory & Persistence](https://mastra.ai/docs/memory)

- **[HiveMQ Cloud](https://www.hivemq.com/docs/)** - MQTT broker for IoT communication

  - [MQTT Essentials](https://www.hivemq.com/mqtt-essentials/)
  - [Cloud Setup Guide](https://www.hivemq.com/docs/hivemq-cloud/introduction.html)

- **[OpenAI API](https://platform.openai.com/docs)** - AI models for agent intelligence
  - [GPT-4 Models](https://platform.openai.com/docs/models/gpt-4)
  - [Text-to-Speech](https://platform.openai.com/docs/guides/text-to-speech)

### IoT & MQTT Resources

- **[MQTT Protocol](https://mqtt.org/)** - Lightweight messaging protocol for IoT
- **[Node.js MQTT Client](https://github.com/mqttjs/MQTT.js)** - JavaScript client library

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs, feature requests, or improvements.

By contributing to this project, you agree that your contributions will be licensed under the MIT License alongside the original project. Contributors retain copyright to their contributions and are added to the list of contributors.

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 Bruce Canedy and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Attribution

When using this project, please provide attribution by:

1. Including the copyright notice in your project
2. Linking back to this repository
3. Mentioning the use of the Mastra framework and HiveMQ for MQTT connectivity

## Use Cases & Applications

This MQTT-Mastra integration template can be adapted for:

### 🏭 Industrial IoT
- Equipment monitoring and predictive maintenance
- Production line optimization
- Quality control systems

### 🏠 Smart Home/Building
- Environmental control systems
- Security and access management
- Energy optimization

### 🌾 Agriculture
- Greenhouse automation
- Irrigation control
- Livestock monitoring

### 🏥 Healthcare
- Patient monitoring systems
- Medical equipment management
- Environmental compliance

### 🚗 Transportation
- Fleet management
- Vehicle telemetry
- Route optimization

## Project Structure

```
src/mastra/
├── index.ts                    # Mastra instance configuration
├── agents/
│   └── chicken-coop-agent.ts   # Example IoT agent implementation
└── tools/
    ├── mqtt/                    # Core MQTT Integration Tools
    │   ├── mqtt-connection.ts   # Broker connection with auto-reconnect
    │   ├── mqtt-subscribe.ts    # Topic subscription management
    │   ├── mqtt-publish.ts      # Message publishing with QoS
    │   └── mqtt-memory-bridge.ts # Automatic MQTT→Memory sync
    ├── utils/                   # Reusable Utility Tools
    │   ├── shared-memory-tool.ts # Cross-tool data sharing
    │   ├── approval-request.ts  # Human-in-the-loop workflows
    │   └── log-event.ts         # Structured event logging
    └── chicken-coop/            # Example Domain-Specific Tools
        ├── coop-temp-alert.ts   # Temperature monitoring
        ├── feed-schedule.ts     # Schedule management
        ├── feeder-control.ts    # Device control via MQTT
        └── coop-controls.ts     # Environmental systems
```

## Building Your Own IoT Integration

### 1. Define Your MQTT Topics
```javascript
const topics = [
  'sensors/+/temperature',  // Wildcard for all temperature sensors
  'devices/+/status',       // Device status updates
  'commands/+/execute'      // Command execution
];
```

### 2. Create Domain-Specific Tools
```javascript
export const myCustomTool = createTool({
  id: 'my-custom-tool',
  description: 'Process IoT data for my use case',
  inputSchema: z.object({
    deviceId: z.string(),
    action: z.string()
  }),
  execute: async ({ deviceId, action }) => {
    // Your custom logic here
  }
});
```

### 3. Configure Your Agent
```javascript
const myAgent = new Agent({
  name: 'My IoT Assistant',
  instructions: 'Monitor and control my IoT devices...',
  tools: {
    mqttConnect: mqttConnectionTool,
    mqttSubscribe: mqttSubscribeTool,
    myCustomTool: myCustomTool
  }
});
```

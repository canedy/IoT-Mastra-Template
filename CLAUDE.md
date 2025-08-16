# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development mode with Mastra playground
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Test MQTT connection
pnpm test:mqtt

# Type checking (no built-in script, use TypeScript directly)
npx tsc --noEmit
```

## Architecture

Chicken Coop IoT system built on Mastra framework for managing chicken coop environmental monitoring and control via MQTT.

### Core Structure

**Mastra Configuration** (`src/mastra/index.ts`): Central orchestration hub defining agents and storage configuration.

**Chicken Coop Agent** (`src/mastra/agents/chicken-coop-agent.ts`): Production-ready AI agent with GPT-4o-mini that manages coop operations including temperature monitoring, feeding schedules, environmental controls, and human-in-the-loop approvals.

### Tool Categories

**MQTT Tools** (`src/mastra/tools/mqtt/`):
- `mqtt-connection.ts`: Broker connection management with HiveMQ support
- `mqtt-subscribe.ts`: Topic subscription with auto-memory storage
- `mqtt-publish.ts`: Message publishing with QoS levels
- `mqtt-memory-bridge.ts`: Bridges MQTT data to shared memory

**Chicken Coop Tools** (`src/mastra/tools/chicken-coop/`):
- `coop-temp-alert.ts`: Temperature monitoring (35-95°F safe range)
- `feed-schedule.ts`: 12-hour feeding schedule management
- `feeder-control.ts`: IoT feeder control via MQTT commands
- `coop-controls.ts`: Environmental controls (ventilation, water, awning)

**Utility Tools** (`src/mastra/tools/utils/`):
- `shared-memory-tool.ts`: Cross-thread sensor data access
- `approval-request.ts`: Human-in-the-loop approval system
- `log-event.ts`: Event logging with severity levels

### Key Patterns

- **Tool Structure**: All tools use `createTool` with Zod schemas
- **Memory Integration**: Agent uses LibSQL for persistent memory storage
- **MQTT Topics**: Standard IoT pattern `sensors/coop/{type}` for data ingestion
- **Human Approval**: Critical actions require explicit user confirmation
- **Environmental Response**: Temperature-based automatic control recommendations

### Environment Configuration

Required `.env` variables:
- `HIVEMQ_BROKER_URL`: HiveMQ cloud broker URL (wss://...)
- `HIVEMQ_USERNAME`: HiveMQ authentication username
- `HIVEMQ_PASSWORD`: HiveMQ authentication password
- `OPENAI_API_KEY`: Optional for voice features
- `ENABLE_SCHEDULING`: Enable/disable automated monitoring

### Testing Flow

1. Start Mastra playground: `pnpm dev`
2. Connect to MQTT broker via playground UI
3. Subscribe to `sensors/coop/temp`
4. Publish test data via HiveMQ console
5. Interact with Chicken Coop Manager agent

### Agent Capabilities

- **Temperature Monitoring**: Real-time alerts for unsafe conditions
- **Feeding Management**: Schedule tracking with approval for unusual intervals
- **Environmental Control**: Automated recommendations for ventilation, water, shade
- **Memory Persistence**: Historical data tracking for pattern detection
- **Human-in-the-Loop**: Approval requests for critical actions
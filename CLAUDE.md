# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Build and run the application:
```bash
# Development mode with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Test MQTT connection
pnpm test:mqtt

# Type checking
pnpm type-check
```

## Architecture

This is a Mastra framework IoT integration template that provides tools and workflows for connecting to MQTT brokers and processing IoT data streams.

### Core Components

1. **Mastra Instance** (`src/mastra/index.ts`): Central configuration that orchestrates all IoT tools, workflows, and agents. Includes auto-initialization logic for MQTT connections and scheduled tasks.

2. **MQTT Tools** (`src/mastra/tools/`):
   - **mqtt-connection.ts**: Manages MQTT broker connections with automatic reconnection
   - **mqtt-subscribe.ts**: Handles topic subscriptions with wildcard support and message filtering
   - **mqtt-publish.ts**: Publishes messages with QoS support and offline queuing
   - **data-store.ts**: Stores IoT data with retention policies and indexing
   - **message-processor.ts**: Configurable message processing pipeline

3. **Workflows** (`src/mastra/workflows/`):
   - **scheduled-monitoring.ts**: Periodic monitoring with cron scheduling, metrics calculation, and alerting
   - **data-processing.ts**: Batch processing workflows for aggregation, transformation, and filtering

4. **IoT Coordinator Agent** (`src/mastra/agents/iot-coordinator.ts`): AI-powered assistant for IoT system management and troubleshooting

### Key Patterns

- **Tool Creation**: All tools use `createTool` with Zod schemas for validation
- **MQTT Patterns**: Support for wildcards (+, #) in topic subscriptions
- **Data Management**: In-memory storage with configurable retention and indexing
- **Error Handling**: Graceful degradation with offline queuing and reconnection
- **Scheduling**: Cron-based workflows with timezone support

### Configuration

- **Environment Variables**: All configuration via .env file (see .env.example)
- **MQTT Settings**: Broker URL, credentials, QoS, keep-alive settings
- **Data Retention**: Configurable per-device limits and time-based cleanup
- **Scheduling**: Enable/disable with ENABLE_SCHEDULING flag

### External Dependencies

- **MQTT Library**: mqtt@^5.14.0 for broker communication
- **Scheduling**: node-cron@^3.0.3 for workflow scheduling
- **Validation**: zod@^3.25.76 for runtime type checking

### Message Flow

1. MQTT messages arrive via subscriptions
2. Message processors filter and transform data
3. Processed data stored with retention policies
4. Workflows analyze and aggregate data periodically
5. Results published back to MQTT or stored

### Best Practices

- Always check MQTT connection status before operations
- Use appropriate QoS levels for reliability vs performance
- Implement message deduplication for QoS > 0
- Monitor memory usage with large data volumes
- Use topic hierarchies for efficient routing

### Server Lifecycle & Scheduling

- **Server Hooks** (`src/mastra/server.ts`): Manages startup/shutdown lifecycle
- **Scheduled Monitoring**: Runs automatically when `ENABLE_SCHEDULING=true`
  - Routine monitoring: Every 30 minutes
  - Connectivity check: Every hour
  - Data quality check: Every 2 hours
  - Daily summary: 8 AM daily
- **Auto-initialization**: MQTT connection and subscriptions on server start
- **Graceful Shutdown**: Stops all scheduled tasks and closes MQTT connections

### Recent Updates

- Fixed workflow execution context to include all required parameters
- Implemented proper server lifecycle hooks for scheduling
- HiveMQ environment variables now take precedence over generic MQTT variables
- Removed unused environment variables to reduce configuration complexity
- Agent tools now use actual implementations instead of placeholders
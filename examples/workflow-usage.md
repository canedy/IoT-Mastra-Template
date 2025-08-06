# IoT Monitoring Workflow Usage Examples

This template provides both **scheduled execution** and **manual execution** of IoT monitoring workflows.

## Automatic Scheduled Execution

When `ENABLE_SCHEDULING=true` in your `.env` file, the following monitoring tasks run automatically:

- **Routine Monitoring**: Every 30 minutes
- **Connectivity Check**: Every hour  
- **Data Quality Check**: Every 2 hours
- **Daily Summary**: 8 AM daily

## Manual Workflow Execution

You can also trigger monitoring tasks manually using the Mastra workflow system:

### Using the Agent in Playground

```javascript
// Basic routine monitoring
await iotCoordinatorAgent.executeWorkflow('iot-monitoring-workflow', {
  check_type: "routine_monitoring"
});

// Custom monitoring with specific focus
await iotCoordinatorAgent.executeWorkflow('iot-monitoring-workflow', {
  check_type: "device_health_check",
  custom_instructions: "Focus on temperature sensors that haven't reported in the last hour",
  focus_areas: ["mqtt_connection", "device_status"],
  filters: {
    topics: ["sensors/+/temperature", "devices/+/status"],
    severity: "medium"
  },
  output_format: "detailed"
});

// Time-based analysis
await iotCoordinatorAgent.executeWorkflow('iot-monitoring-workflow', {
  check_type: "connectivity_check",
  time_range: {
    duration: "2h"
  },
  filters: {
    devices: ["device001", "device002", "device003"],
    severity: "high"
  }
});

// Comprehensive monitoring with all options
await iotCoordinatorAgent.executeWorkflow('iot-monitoring-workflow', {
  check_type: "comprehensive_audit",
  custom_instructions: "Perform a complete system audit before maintenance window",
  focus_areas: ["mqtt_connection", "message_flow", "device_status", "data_quality"],
  time_range: {
    start: "2024-01-01T00:00:00Z",
    end: "2024-01-01T23:59:59Z"
  },
  filters: {
    topics: ["sensors/#", "devices/#", "alerts/#"],
    severity: "low"
  },
  output_format: "json"
});
```

### Using Mastra Directly

```javascript
// Execute workflow directly through Mastra instance
const result = await mastra.executeWorkflow('iot-monitoring-workflow', {
  check_type: "routine_monitoring"
});

console.log('Workflow Results:', {
  summary: result.summary,
  notifications: result.notifications_sent,
  follow_up_actions: result.follow_up_actions
});
```

### Using the Agent for Individual Tasks

```javascript
// Use the agent to perform specific MQTT operations
await iotCoordinatorAgent.tools.mqttConnection.execute({
  action: "status"
});

await iotCoordinatorAgent.tools.mqttSubscribe.execute({
  action: "list_subscriptions"
});

await iotCoordinatorAgent.tools.mqttPublish.execute({
  action: "publish",
  config: {
    topic: "system/test",
    message: { test: "Hello World", timestamp: Date.now() }
  }
});
```

## Available Check Types

### Predefined Types
- `"routine_monitoring"` - General system health check
- `"connectivity_check"` - MQTT connection and device connectivity analysis  
- `"data_quality_check"` - Message flow and subscription performance analysis
- `"daily_summary"` - Comprehensive 24-hour system report

### Custom Types
You can use any string as a `check_type` for custom monitoring scenarios:
- `"device_health_check"` - Focus on specific device health
- `"network_performance"` - Analyze network connectivity and performance
- `"security_audit"` - Security-focused monitoring
- `"pre_maintenance_check"` - Pre-maintenance system validation
- Or any custom type that describes your monitoring needs

## Input Parameters

- **`check_type`** (required): String - Type of monitoring check to perform
- **`custom_instructions`** (optional): String - Additional specific instructions
- **`focus_areas`** (optional): Array - Areas to focus on (e.g., `['mqtt_connection', 'message_flow', 'device_status']`)
- **`time_range`** (optional): Object - Time range for analysis
  - `start`: ISO string - Start time
  - `end`: ISO string - End time  
  - `duration`: String - Duration (e.g., '30m', '2h', '1d')
- **`filters`** (optional): Object - Filters to apply
  - `topics`: Array - Specific MQTT topics to monitor
  - `devices`: Array - Specific device IDs to focus on
  - `severity`: String - Minimum severity level ('low', 'medium', 'high', 'critical')
- **`output_format`** (optional): String - Output detail level ('summary', 'detailed', 'json')

## Workflow Output

Each workflow execution returns:

```typescript
{
  summary: string,              // Brief description of what was completed
  notifications_sent: number,   // Number of alerts/notifications sent
  follow_up_actions: string[]   // List of recommended actions
}
```

This gives you flexibility to use IoT monitoring both as automated background tasks and on-demand troubleshooting tools!
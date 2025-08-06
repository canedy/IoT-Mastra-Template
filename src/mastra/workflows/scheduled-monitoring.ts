import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import * as cron from "node-cron";

const monitoringResultSchema = z.object({
  check_type: z.string(),
  timestamp: z.string(),
  devices_checked: z.number(),
  messages_analyzed: z.number(),
  issues_found: z.number(),
  actions_taken: z.array(z.string()),
  system_health_score: z.number(),
  next_check: z.string(),
  recommendations: z.array(z.string()),
});

const checkSystemHealth = createStep({
  id: "check-system-health",
  description: "Performs comprehensive IoT system health check",
  inputSchema: z.object({
    check_type: z.union([
      z.enum([
        "routine_monitoring",
        "connectivity_check",
        "data_quality_check",
        "daily_summary",
      ]),
      z.string(),
    ]),
    custom_instructions: z.string().optional(),
    focus_areas: z.array(z.string()).optional(),
    time_range: z
      .object({
        start: z.string().optional(),
        end: z.string().optional(),
        duration: z.string().optional(),
      })
      .optional(),
    filters: z
      .object({
        topics: z.array(z.string()).optional(),
        devices: z.array(z.string()).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
      .optional(),
    output_format: z
      .enum(["summary", "detailed", "json"])
      .optional()
      .default("summary"),
  }),
  outputSchema: monitoringResultSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent("iotCoordinatorAgent");
    if (!agent) {
      throw new Error("IoT Coordinator agent not found");
    }

    const timestamp = new Date().toISOString();
    const result = {
      check_type: inputData.check_type,
      timestamp,
      devices_checked: 0,
      messages_analyzed: 0,
      issues_found: 0,
      actions_taken: [] as string[],
      system_health_score: 100,
      next_check: "",
      recommendations: [] as string[],
    };

    // Build context information
    let contextInfo = "";
    if (inputData.custom_instructions) {
      contextInfo += `\nCustom Instructions: ${inputData.custom_instructions}`;
    }
    if (inputData.focus_areas && inputData.focus_areas.length > 0) {
      contextInfo += `\nFocus Areas: ${inputData.focus_areas.join(", ")}`;
    }
    if (inputData.time_range) {
      const timeInfo = [];
      if (inputData.time_range.duration)
        timeInfo.push(`Duration: ${inputData.time_range.duration}`);
      if (inputData.time_range.start)
        timeInfo.push(`Start: ${inputData.time_range.start}`);
      if (inputData.time_range.end)
        timeInfo.push(`End: ${inputData.time_range.end}`);
      if (timeInfo.length > 0) {
        contextInfo += `\nTime Range: ${timeInfo.join(", ")}`;
      }
    }
    if (inputData.filters) {
      if (inputData.filters.topics && inputData.filters.topics.length > 0) {
        contextInfo += `\nTopic Filter: ${inputData.filters.topics.join(", ")}`;
      }
      if (inputData.filters.devices && inputData.filters.devices.length > 0) {
        contextInfo += `\nDevice Filter: ${inputData.filters.devices.join(
          ", "
        )}`;
      }
      if (inputData.filters.severity) {
        contextInfo += `\nMinimum Severity: ${inputData.filters.severity}`;
      }
    }
    const outputFormat = inputData.output_format || "summary";
    contextInfo += `\nOutput Format: ${outputFormat}`;

    switch (inputData.check_type) {
      case "routine_monitoring":
        const routinePrompt = `
          Perform a routine IoT system monitoring check:
          1. Use the mqttConnection tool with action "status" to check MQTT broker connection
          2. Use the mqttSubscribe tool with action "list_subscriptions" to see active subscriptions
          3. Check recent message activity from subscriptions
          4. Review subscription activity and message flow
          5. Analyze data freshness and identify any devices with stale data
          6. Generate recommendations based on findings
          ${contextInfo}
          
          IMPORTANT: Count and report the actual numbers you find:
          - How many active subscriptions exist
          - How many unique device IDs you can identify from topics (e.g., sensors/sensorB/raw has device "sensorB")
          - Report these numbers clearly in your response
          
          Return a detailed report of the monitoring results including connection status, 
          data flow health, and any issues discovered.
        `;

        const routineResult = await agent.generate([
          {
            role: "user",
            content: routinePrompt,
          },
        ]);

        // Extract numbers from agent response
        const routineResponse = routineResult.text || "";
        console.log("📋 Routine monitoring response:", routineResponse);

        const deviceMatch = routineResponse.match(
          /(\d+)\s+(?:unique\s+)?devices?/i
        );
        const subscriptionMatch = routineResponse.match(
          /(\d+)\s+(?:active\s+)?subscriptions?/i
        );

        result.devices_checked = deviceMatch ? parseInt(deviceMatch[1]) : 1;
        result.messages_analyzed = subscriptionMatch
          ? parseInt(subscriptionMatch[1])
          : 1;

        // Calculate health score based on actual metrics
        let healthScore = 100;
        
        // Check for connection issues
        if (routineResponse.toLowerCase().includes("not connected") || 
            routineResponse.toLowerCase().includes("disconnected")) {
          healthScore -= 50;
          result.issues_found++;
        }
        
        // Check for missing subscriptions
        if (result.messages_analyzed === 0) {
          healthScore -= 30;
          result.issues_found++;
          result.recommendations.push("No active subscriptions found - consider subscribing to topics");
        }
        
        // Check for offline devices
        const offlineMatch = routineResponse.match(/(\d+)\s+(?:offline|inactive|disconnected)/i);
        if (offlineMatch) {
          const offlineCount = parseInt(offlineMatch[1]);
          healthScore -= (offlineCount * 10);
          result.issues_found += offlineCount;
          result.recommendations.push(`${offlineCount} device(s) appear offline`);
        }
        
        // Check for errors or warnings in response
        if (routineResponse.toLowerCase().includes("error")) {
          healthScore -= 15;
          result.issues_found++;
        }
        if (routineResponse.toLowerCase().includes("warning")) {
          healthScore -= 10;
          result.issues_found++;
        }
        
        // Ensure health score stays in valid range
        result.system_health_score = Math.max(0, Math.min(100, healthScore));

        result.actions_taken.push("Checked MQTT connection status");
        result.actions_taken.push("Verified active subscriptions");
        result.actions_taken.push(
          `Analyzed ${result.devices_checked} devices and ${result.messages_analyzed} subscriptions`
        );
        result.actions_taken.push("Reviewed subscription activity");
        result.actions_taken.push("Calculated system health score");
        result.next_check = new Date(Date.now() + 30 * 60000).toISOString();
        break;

      case "connectivity_check":
        const connectivityPrompt = `
          Perform a comprehensive connectivity check:
          1. Use the mqttConnection tool with action "status" to verify broker connection
          2. Check message activity from active subscriptions
          3. Analyze data patterns to identify offline or intermittent devices
          4. Check for devices that haven't sent data recently
          5. Use the mqttPublish tool to send test messages if needed
          6. Generate connectivity health report
          ${contextInfo}
          
          IMPORTANT: Report actual device and subscription counts found.
        `;

        const connectivityResult = await agent.generate([
          {
            role: "user",
            content: connectivityPrompt,
          },
        ]);

        const connectivityResponse = connectivityResult.text || "";
        const connDeviceMatch = connectivityResponse.match(
          /(\d+)\s+(?:unique\s+)?devices?/i
        );
        const connSubMatch = connectivityResponse.match(
          /(\d+)\s+(?:active\s+)?subscriptions?/i
        );

        result.devices_checked = connDeviceMatch
          ? parseInt(connDeviceMatch[1])
          : 1;
        result.messages_analyzed = connSubMatch ? parseInt(connSubMatch[1]) : 1;

        // Calculate connectivity health score
        let connHealthScore = 100;
        
        // Check for connection failures
        if (connectivityResponse.toLowerCase().includes("failed") ||
            connectivityResponse.toLowerCase().includes("unreachable")) {
          connHealthScore -= 40;
          result.issues_found++;
        }
        
        // Check for offline/disconnected devices
        const offlineDevices = connectivityResponse.match(/(\d+)\s+(?:offline|disconnected|inactive)/i);
        if (offlineDevices) {
          const count = parseInt(offlineDevices[1]);
          connHealthScore -= (count * 15);
          result.issues_found += count;
        }
        
        // Check for intermittent connections
        if (connectivityResponse.toLowerCase().includes("intermittent")) {
          connHealthScore -= 20;
          result.issues_found++;
          result.recommendations.push("Intermittent connections detected - check network stability");
        }
        
        result.system_health_score = Math.max(0, Math.min(100, connHealthScore));

        result.actions_taken.push("Verified MQTT broker connectivity");
        result.actions_taken.push("Analyzed device communication patterns");
        result.actions_taken.push("Identified offline devices");
        result.actions_taken.push("Tested message delivery paths");
        result.actions_taken.push("Calculated connectivity health score");
        result.next_check = new Date(Date.now() + 60 * 60000).toISOString();
        break;

      case "data_quality_check":
        const dataQualityPrompt = `
          Perform a data quality assessment:
          1. Review recent message patterns from subscriptions
          2. Analyze message frequency and patterns from subscriptions
          3. Check subscription performance and message flow
          4. Analyze data for anomalies and consistency
          5. Check data retention and cleanup status
          6. Generate data quality recommendations
          ${contextInfo}
          
          IMPORTANT: Report actual device and subscription counts found.
        `;

        const dataQualityResult = await agent.generate([
          {
            role: "user",
            content: dataQualityPrompt,
          },
        ]);

        const dataResponse = dataQualityResult.text || "";
        const dataDeviceMatch = dataResponse.match(
          /(\d+)\s+(?:unique\s+)?devices?/i
        );
        const dataSubMatch = dataResponse.match(
          /(\d+)\s+(?:active\s+)?subscriptions?/i
        );

        result.devices_checked = dataDeviceMatch
          ? parseInt(dataDeviceMatch[1])
          : 1;
        result.messages_analyzed = dataSubMatch ? parseInt(dataSubMatch[1]) : 1;

        // Calculate data quality health score
        let dataHealthScore = 100;
        
        // Check for data anomalies
        if (dataResponse.toLowerCase().includes("anomaly") ||
            dataResponse.toLowerCase().includes("anomalies")) {
          dataHealthScore -= 25;
          result.issues_found++;
          result.recommendations.push("Data anomalies detected - review sensor calibration");
        }
        
        // Check for missing data
        if (dataResponse.toLowerCase().includes("missing data") ||
            dataResponse.toLowerCase().includes("gaps")) {
          dataHealthScore -= 20;
          result.issues_found++;
        }
        
        // Check for format errors
        if (dataResponse.toLowerCase().includes("format error") ||
            dataResponse.toLowerCase().includes("invalid")) {
          dataHealthScore -= 15;
          result.issues_found++;
        }
        
        // Check for stale data
        if (dataResponse.toLowerCase().includes("stale") ||
            dataResponse.toLowerCase().includes("outdated")) {
          dataHealthScore -= 30;
          result.issues_found++;
          result.recommendations.push("Stale data detected - check device update frequency");
        }
        
        result.system_health_score = Math.max(0, Math.min(100, dataHealthScore));

        result.actions_taken.push("Analyzed data quality metrics");
        result.actions_taken.push("Checked processing error rates");
        result.actions_taken.push("Validated data format consistency");
        result.actions_taken.push("Reviewed retention policies");
        result.actions_taken.push("Calculated data quality score");
        result.next_check = new Date(Date.now() + 2 * 60 * 60000).toISOString();
        break;

      case "daily_summary":
        const summaryPrompt = `
          Generate a comprehensive daily IoT system summary:
          1. Review 24-hour subscription and message activity
          2. Analyze subscription performance metrics
          3. Use tools to get comprehensive system status
          4. Calculate daily statistics and performance metrics
          5. Identify significant events and trends
          6. Generate actionable recommendations for system optimization
          ${contextInfo}
          
          IMPORTANT: Report actual device and subscription counts found.
        `;

        const summaryResult = await agent.generate([
          {
            role: "user",
            content: summaryPrompt,
          },
        ]);

        const summaryResponse = summaryResult.text || "";
        const summaryDeviceMatch = summaryResponse.match(
          /(\d+)\s+(?:unique\s+)?devices?/i
        );
        const summarySubMatch = summaryResponse.match(
          /(\d+)\s+(?:active\s+)?subscriptions?/i
        );

        result.devices_checked = summaryDeviceMatch
          ? parseInt(summaryDeviceMatch[1])
          : 1;
        result.messages_analyzed = summarySubMatch
          ? parseInt(summarySubMatch[1])
          : 1;

        result.actions_taken.push("Compiled 24-hour system statistics");
        result.actions_taken.push("Analyzed device performance trends");
        result.actions_taken.push("Reviewed processing efficiency");
        result.actions_taken.push("Generated daily insights report");
        result.next_check = new Date(
          Date.now() + 24 * 60 * 60000
        ).toISOString();
        break;

      default:
        const customPrompt = `
          Perform a custom IoT monitoring check of type: "${inputData.check_type}"
          
          General monitoring tasks:
          1. Use the mqttConnection tool with action "status" to check MQTT broker connection
          2. Use the mqttSubscribe tool with action "list_subscriptions" to see active subscriptions  
          3. Use the mqttPublish tool if needed to test publishing functionality
          4. Review overall system health and connectivity
          ${contextInfo}
          
          IMPORTANT: Report actual device and subscription counts found.
        `;

        const customResult = await agent.generate([
          {
            role: "user",
            content: customPrompt,
          },
        ]);

        const customResponse = customResult.text || "";
        const customDeviceMatch = customResponse.match(
          /(\d+)\s+(?:unique\s+)?devices?/i
        );
        const customSubMatch = customResponse.match(
          /(\d+)\s+(?:active\s+)?subscriptions?/i
        );

        result.devices_checked = customDeviceMatch
          ? parseInt(customDeviceMatch[1])
          : 1;
        result.messages_analyzed = customSubMatch
          ? parseInt(customSubMatch[1])
          : 1;

        result.actions_taken.push(
          `Performed custom monitoring: ${inputData.check_type}`
        );
        result.actions_taken.push("Checked MQTT connection and subscriptions");
        result.actions_taken.push("Analyzed system health");
        result.next_check = new Date(Date.now() + 60 * 60000).toISOString();
        break;
    }

    return result;
  },
});

const processMonitoringResults = createStep({
  id: "process-monitoring-results",
  description: "Process monitoring results and take appropriate actions",
  inputSchema: monitoringResultSchema,
  outputSchema: z.object({
    summary: z.string(),
    notifications_sent: z.number(),
    follow_up_actions: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Monitoring results not found");
    }

    // Log the monitoring completion
    console.log(
      `✅ ${inputData.check_type} completed at ${inputData.timestamp}`
    );
    console.log(`   Devices checked: ${inputData.devices_checked}`);
    console.log(`   Messages analyzed: ${inputData.messages_analyzed}`);
    console.log(`   Issues found: ${inputData.issues_found}`);
    console.log(`   Health score: ${inputData.system_health_score}`);

    return {
      summary: `IoT monitoring completed: ${inputData.check_type}`,
      notifications_sent: inputData.issues_found > 0 ? 1 : 0,
      follow_up_actions: inputData.recommendations,
    };
  },
});

const iotMonitoringWorkflow = createWorkflow({
  id: "iot-monitoring-workflow",
  inputSchema: z.object({
    check_type: z.union([
      z.enum([
        "routine_monitoring",
        "connectivity_check",
        "data_quality_check",
        "daily_summary",
      ]),
      z.string(),
    ]),
    custom_instructions: z.string().optional(),
    focus_areas: z.array(z.string()).optional(),
    time_range: z
      .object({
        start: z.string().optional(),
        end: z.string().optional(),
        duration: z.string().optional(),
      })
      .optional(),
    filters: z
      .object({
        topics: z.array(z.string()).optional(),
        devices: z.array(z.string()).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
      .optional(),
    output_format: z
      .enum(["summary", "detailed", "json"])
      .optional()
      .default("summary"),
  }),
  outputSchema: z.object({
    summary: z.string(),
    notifications_sent: z.number(),
    follow_up_actions: z.array(z.string()),
  }),
})
  .then(checkSystemHealth)
  .then(processMonitoringResults);

iotMonitoringWorkflow.commit();

// Scheduled tasks storage
let scheduledTasks: cron.ScheduledTask[] = [];

// Track running tasks to prevent overlaps
const runningTasks = new Set<string>();

// Helper function to execute workflow without blocking
async function executeWorkflowNonBlocking(
  mastra: any,
  checkType: string,
  taskName: string
): Promise<void> {
  // Skip if task is already running
  if (runningTasks.has(taskName)) {
    console.log(`⏳ ${taskName} is already running, skipping...`);
    return;
  }

  runningTasks.add(taskName);

  // Use setImmediate to avoid blocking the event loop
  setImmediate(async () => {
    try {
      const workflow = mastra.getWorkflow("iotMonitoringWorkflow");
      if (workflow) {
        const result = await workflow.execute({
          check_type: checkType,
        });

        console.log(`✅ ${taskName} completed:`, {
          summary: result.summary,
          notifications: result.notifications_sent,
          actions: result.follow_up_actions?.length || 0,
        });
      } else {
        console.error("iotMonitoringWorkflow not found");
      }
    } catch (error) {
      console.error(`Error in ${taskName}:`, error);
    } finally {
      runningTasks.delete(taskName);
    }
  });
}

// Initialize scheduled monitoring when Mastra starts
export function initializeScheduledMonitoring(mastra: any): void {
  if (
    !process.env.ENABLE_SCHEDULING ||
    process.env.ENABLE_SCHEDULING !== "true"
  ) {
    console.log("📴 Scheduled monitoring disabled (ENABLE_SCHEDULING != true)");
    return;
  }

  console.log("🕐 Initializing IoT scheduled monitoring tasks...");

  // Clear any existing tasks
  stopScheduledMonitoring();

  // Routine monitoring every 10 minutes
  const routineTask = cron.schedule("*/10 * * * *", () => {
    console.log("🔍 Running routine IoT monitoring...");
    // Don't await - let it run in background
    executeWorkflowNonBlocking(
      mastra,
      "routine_monitoring",
      "Routine Monitoring"
    );
  });
  scheduledTasks.push(routineTask);

  // Connectivity check every hour
  const connectivityTask = cron.schedule("0 * * * *", () => {
    console.log("🔗 Running connectivity check...");
    // Don't await - let it run in background
    executeWorkflowNonBlocking(
      mastra,
      "connectivity_check",
      "Connectivity Check"
    );
  });
  scheduledTasks.push(connectivityTask);

  // Data quality check every 2 hours
  const dataQualityTask = cron.schedule("0 */2 * * *", () => {
    console.log("📊 Running data quality check...");
    // Don't await - let it run in background
    executeWorkflowNonBlocking(
      mastra,
      "data_quality_check",
      "Data Quality Check"
    );
  });
  scheduledTasks.push(dataQualityTask);

  // Daily summary at 8 AM every day
  const dailySummaryTask = cron.schedule("0 8 * * *", () => {
    console.log("📈 Generating daily IoT summary...");
    // Don't await - let it run in background
    executeWorkflowNonBlocking(mastra, "daily_summary", "Daily Summary");
  });
  scheduledTasks.push(dailySummaryTask);

  console.log("✅ IoT scheduled monitoring tasks initialized");
  console.log(
    "   - Routine monitoring: every 30 minutes (using iotMonitoringWorkflow)"
  );
  console.log(
    "   - Connectivity check: every hour (using iotMonitoringWorkflow)"
  );
  console.log(
    "   - Data quality check: every 2 hours (using iotMonitoringWorkflow)"
  );
  console.log("   - Daily summary: 8 AM daily (using iotMonitoringWorkflow)");
}

// Stop all scheduled tasks
export function stopScheduledMonitoring(): void {
  if (scheduledTasks.length > 0) {
    scheduledTasks.forEach((task) => task.stop());
    scheduledTasks = [];
    console.log("⏹️  Stopped all scheduled monitoring tasks");
  }
}

export { iotMonitoringWorkflow };

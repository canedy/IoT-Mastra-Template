import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Lab 3 - Tool 2: FeedSchedule
// Tracks feeding times and schedules reminders

interface FeedingRecord {
  lastFedAt: Date;
  nextFeedAt: Date;
  coopId: string;
  intervalHours: number;
}

// In-memory storage for feeding records (in production, use a database)
const feedingRecords = new Map<string, FeedingRecord>();

// Queue for scheduled reminders
const scheduledReminders = new Map<string, NodeJS.Timeout>();

// Callback for human-in-the-loop approval (will be set in Lab 4)
let approvalCallback: ((request: any) => Promise<boolean>) | null = null;

export const feedScheduleTool = createTool({
  id: 'feed-schedule',
  description: 'Track chicken feeding times and compute next feeding schedule',
  inputSchema: z.object({
    lastFedAt: z.string().optional().describe('ISO timestamp of last feeding (optional if stored)'),
    intervalHours: z.number().optional().default(12).describe('Hours between feedings'),
    scheduleReminder: z.boolean().optional().default(false).describe('Schedule automatic reminder'),
    coopId: z.string().optional().default('main').describe('Identifier for the coop'),
  }),
  outputSchema: z.object({
    lastFedAt: z.string().describe('ISO timestamp of last feeding'),
    nextAt: z.string().describe('ISO timestamp of next feeding'),
    due: z.boolean().describe('Whether feeding is currently due'),
    message: z.string().describe('Status message with recommendations'),
    reminderScheduled: z.boolean().optional().describe('Whether a reminder was scheduled'),
  }),
  execute: async ({ context }) => {
    const { lastFedAt, intervalHours, scheduleReminder, coopId } = context;
    
    // Validate interval hours
    if (intervalHours < 1 || intervalHours > 48) {
      throw new Error('Interval must be between 1 and 48 hours');
    }
    
    // Get or create feeding record
    let record = feedingRecords.get(coopId);
    
    if (lastFedAt) {
      // Validate ISO timestamp
      const fedTime = new Date(lastFedAt);
      if (isNaN(fedTime.getTime())) {
        throw new Error('Invalid ISO timestamp for lastFedAt');
      }
      
      // Update or create record
      const nextTime = new Date(fedTime.getTime() + intervalHours * 60 * 60 * 1000);
      record = {
        lastFedAt: fedTime,
        nextFeedAt: nextTime,
        coopId,
        intervalHours,
      };
      feedingRecords.set(coopId, record);
    } else if (!record) {
      // No record exists and no lastFedAt provided
      throw new Error('No feeding history found. Please provide lastFedAt timestamp.');
    }
    
    // Calculate status
    const now = new Date();
    const isDue = now >= record.nextFeedAt;
    const timeUntilNext = record.nextFeedAt.getTime() - now.getTime();
    const hoursUntilNext = Math.max(0, timeUntilNext / (60 * 60 * 1000));
    
    // Generate message
    let message: string;
    if (isDue) {
      const overdueMins = Math.floor((now.getTime() - record.nextFeedAt.getTime()) / 60000);
      if (overdueMins > 60) {
        message = `🚨 OVERDUE: Feeding is ${Math.floor(overdueMins / 60)} hours ${overdueMins % 60} minutes overdue! Feed immediately.`;
      } else {
        message = `⏰ Feeding is due now! Chickens were last fed ${intervalHours} hours ago.`;
      }
    } else if (hoursUntilNext < 1) {
      const minsUntilNext = Math.ceil(hoursUntilNext * 60);
      message = `📢 Next feeding in ${minsUntilNext} minutes. Prepare feed soon.`;
    } else {
      message = `✅ Next feeding scheduled in ${hoursUntilNext.toFixed(1)} hours. Chickens are on schedule.`;
    }
    
    // Handle reminder scheduling
    let reminderScheduled = false;
    if (scheduleReminder && !isDue) {
      // Check if human approval needed for short intervals
      if (intervalHours < 6) {
        const approved = await requestApproval({
          action: 'schedule_reminder',
          reason: `Short feeding interval (${intervalHours} hours) may cause overfeeding`,
          coopId,
          intervalHours,
        });
        
        if (!approved) {
          message += ' ⚠️ Reminder not scheduled (requires approval for intervals < 6 hours).';
        } else {
          reminderScheduled = scheduleReminder(coopId, record.nextFeedAt);
          message += ' 🔔 Reminder scheduled.';
        }
      } else {
        reminderScheduled = scheduleReminder(coopId, record.nextFeedAt);
        message += ' 🔔 Reminder scheduled.';
      }
    }
    
    return {
      lastFedAt: record.lastFedAt.toISOString(),
      nextAt: record.nextFeedAt.toISOString(),
      due: isDue,
      message,
      reminderScheduled,
    };
  },
});

/**
 * Schedule a feeding reminder
 */
function scheduleReminder(coopId: string, feedTime: Date): boolean {
  // Cancel existing reminder if any
  const existing = scheduledReminders.get(coopId);
  if (existing) {
    clearTimeout(existing);
  }
  
  const timeUntil = feedTime.getTime() - Date.now();
  if (timeUntil <= 0) {
    return false; // Already due
  }
  
  // Schedule the reminder
  const timeout = setTimeout(() => {
    console.log(`\n🔔 FEEDING REMINDER: Time to feed chickens in coop ${coopId}!\n`);
    scheduledReminders.delete(coopId);
  }, Math.min(timeUntil, 2147483647)); // Max timeout value
  
  scheduledReminders.set(coopId, timeout);
  console.log(`Reminder scheduled for ${feedTime.toLocaleString()}`);
  return true;
}

/**
 * Request human approval - returns approval request in the response
 */
async function requestApproval(request: any): Promise<boolean> {
  if (approvalCallback) {
    return await approvalCallback(request);
  }
  
  // For playground: throw an error that contains the approval request
  // This will be visible to the user in the playground
  throw new Error(`🔔 APPROVAL REQUIRED: ${request.reason}. 
  
Action: ${request.action}
Interval: ${request.intervalHours} hours (minimum recommended: 6 hours)
Coop: ${request.coopId}

This action requires human approval. In a production system, this would prompt for y/n confirmation.
For the workshop, approval is required for safety.`);
}

/**
 * Set the approval callback (used in Lab 4)
 */
export function setApprovalCallback(callback: (request: any) => Promise<boolean>) {
  approvalCallback = callback;
}


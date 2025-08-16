import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Tool to display approval requests in the playground
export const approvalRequestTool = createTool({
  id: 'approval-request',
  description: 'Request human approval for potentially risky actions',
  inputSchema: z.object({
    action: z.string().describe('The action requiring approval'),
    reason: z.string().describe('Why approval is needed'),
    details: z.record(z.any()).optional().describe('Additional details about the request'),
    riskLevel: z.enum(['low', 'medium', 'high']).default('medium').describe('Risk level of the action'),
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    message: z.string(),
    requiresHumanInput: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { action, reason, details, riskLevel } = context;
    
    // Format the approval request for display in playground
    let message = `🔔 HUMAN APPROVAL REQUIRED\n\n`;
    message += `Action: ${action}\n`;
    message += `Reason: ${reason}\n`;
    message += `Risk Level: ${riskLevel.toUpperCase()}\n\n`;
    
    if (details) {
      message += `Details:\n`;
      Object.entries(details).forEach(([key, value]) => {
        message += `  • ${key}: ${value}\n`;
      });
      message += `\n`;
    }
    
    message += `⚠️ This action requires manual approval for safety reasons.\n`;
    message += `In a production system, you would be prompted to approve/deny this action.\n\n`;
    message += `For this workshop demonstration, the action is BLOCKED pending approval.`;
    
    return {
      approved: false,
      message,
      requiresHumanInput: true,
    };
  },
});
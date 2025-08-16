import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";

// Workshop agents for different labs
import { chickenCoopAgent } from "./agents/chicken-coop-agent";

export const mastra = new Mastra({
  workflows: {},
  agents: {
    // Workshop agents
    chickenCoopAgent, // Complete production agent
  },
  // storage: new LibSQLStore({
  //   // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
  //   url: ":memory:",
  // }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});

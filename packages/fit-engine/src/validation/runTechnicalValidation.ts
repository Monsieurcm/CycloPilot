import { resolve } from "node:path";
import { runTechnicalFitValidation } from "./technicalValidation.js";

async function main(): Promise<void> {
  const workspaceRoot = resolve(process.cwd(), "..", "..");
  const result = await runTechnicalFitValidation(workspaceRoot);

  if (!result.allChecksPassed) {
    throw new Error("Technical FIT validation failed");
  }

  console.log(`Technical FIT validation passed for ${result.scenarioResults.length} scenarios.`);
  console.log(`Artifacts: ${result.outputDir}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

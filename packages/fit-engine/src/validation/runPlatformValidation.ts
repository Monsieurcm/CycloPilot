import { resolve } from "node:path";
import { runPlatformValidation } from "./platformValidation.js";

async function main(): Promise<void> {
  const workspaceRoot = resolve(process.cwd(), "..", "..");
  const result = await runPlatformValidation(workspaceRoot);

  console.log(`Platform validation report generated for ${result.platforms.length} platforms.`);
  console.log(`Source FIT directory: ${result.sourceDir}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

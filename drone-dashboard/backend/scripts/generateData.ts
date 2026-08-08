import { generateFleets } from "../src/generators/generateFleets.js";
import { generateDrones } from "../src/generators/generateDrones.js";
import { generateMission } from "../src/generators/generateMission.js";

async function main() {
  console.log("Generating data...");

  await generateFleets();

  const drones = await generateDrones();

  await generateMission(drones);

  console.log("Done.");
}

main().catch(console.error);

import fs from "fs-extra";
import path from "path";
import { createFleet } from "./createFleet.js";
import { Fleet } from "../models/fleets.js";
import { fleetDefinitions } from "../data/fleetDefinitions.js";

export async function generateFleets(): Promise<Fleet[]> {
  const fleets = fleetDefinitions.map((fleet) =>
    createFleet(
      fleet.id,
      fleet.name,
      fleet.type,
      fleet.baseLocation,
      fleet.description,
    ),
  );

  const outputPath = path.join(process.cwd(), "data", "fleets.json");

  await fs.outputJson(outputPath, fleets, {
    spaces: 2,
  });

  console.log(`Generated ${fleets.length} fleets`);

  return fleets;
}

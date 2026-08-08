import fs from "fs-extra";
import path from "path";

import { Drone } from "../models/Drone.js";
import { createDrone } from "./createDrone.js";
import { fleetDefinitions } from "../data/fleetDefinitions.js";
import { droneDefinitions } from "../data/droneDefinitions.js";

export async function generateDrones(): Promise<Drone[]> {
  const drones: Drone[] = [];

  let droneNumber = 1;

  for (const fleet of fleetDefinitions) {
    const droneType = droneDefinitions[fleet.type];

    const droneCount =
      fleet.type === "Search & Rescue"
        ? 10
        : fleet.type === "Border Patrol"
          ? 15
          : fleet.type === "Infrastructure Inspection"
            ? 15
            : 10;

    for (let i = 0; i < droneCount; i++) {
      const id = `DRN-${String(droneNumber).padStart(4, "0")}`;

      const drone = createDrone(
        id,
        fleet.id,
        droneType.model,
        droneType.manufacturer,
        droneType.payload,
        droneType.maxFlightTime,
        droneType.maxSpeed,
      );

      drones.push(drone);

      droneNumber++;
    }
  }

  const outputPath = path.join(process.cwd(), "data", "drones.json");

  await fs.outputJson(outputPath, drones, {
    spaces: 2,
  });

  console.log(`Generated ${drones.length} drones`);

  return drones;
}

// So what exactly changed?

// Initially we had:

// Fleets
//    ↓
// Drones
//    ↓
// Telemetry

// Then we realized:

// Telemetry needs to belong to a particular operation.

// So we moved toward:

// Fleets
//    ↓
// Drones
//    ↓
// Mission
//    ↓
// Telemetry

// But technically, a drone can participate in many missions over its lifetime.
// So don't think:

// Drone permanently belongs to Mission

// That's not what we mean.

// It's more accurate to think:

// Fleet
//   ↓
// Drone

// Mission
//   ↓
// uses some Drones
//   ↓
// produces Telemetry

// Like this:

//               Fleet
//                 │
//                 ▼
//              Drones
//                 ▲
//                 │
//              uses
//                 │
//              Mission
//                 │
//                 ▼
//             Telemetry

// That is the architecture you should remember.

import fs from "fs-extra";
import path from "path";

import { Drone } from "../models/Drone.js";
import { Telemetry } from "../models/Telemetry.js";
import { createTelemetry } from "./createTelemetry.js";

const START_LATITUDE = 52.52;
const START_LONGITUDE = 13.405;

const TELEMETRY_INTERVAL_SECONDS = 1;
const TELEMETRY_POINTS = 10;

function generateTelemetryForDrone(drone: Drone, startTime: Date): Telemetry[] {
  const telemetry: Telemetry[] = [];

  let latitude = START_LATITUDE;
  let longitude = START_LONGITUDE;
  let altitude = 50;
  let battery = 100;

  for (let i = 0; i < TELEMETRY_POINTS; i++) {
    const timestamp = new Date(
      startTime.getTime() + i * TELEMETRY_INTERVAL_SECONDS * 1000,
    );

    latitude += 0.0001;
    longitude += 0.0001;

    altitude += 2;

    battery -= 0.2;

    const point = createTelemetry(
      drone.id,
      timestamp.toISOString(),
      latitude,
      longitude,
      altitude,
      12,
      battery,
      95,
    );

    telemetry.push(point);
  }

  return telemetry;
}

export async function generateTelemetry(drones: Drone[]): Promise<Telemetry[]> {
  const allTelemetry: Telemetry[] = [];

  const startTime = new Date();

  for (const drone of drones) {
    const droneTelemetry = generateTelemetryForDrone(drone, startTime);

    allTelemetry.push(...droneTelemetry);
  }

  const outputPath = path.join(process.cwd(), "data", "telemetry.json");

  await fs.outputJson(outputPath, allTelemetry, {
    spaces: 2,
  });

  console.log(`Generated ${allTelemetry.length} telemetry records`);

  return allTelemetry;
}

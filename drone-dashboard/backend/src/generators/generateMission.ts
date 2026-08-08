// generateMission()
//        │
//        ├── Drone 1
//        │      ↓
//        │ generateDroneTelemetry()
//        │      ↓
//        │ generateMissionPosition()
//        │
//        ├── Drone 2
//        │      ↓
//        │ generateDroneTelemetry()
//        │      ↓
//        │ generateMissionPosition()
//        │
//        ├── Drone 3
//        │      ↓
//        │ ...
//        │
//        └── Drone 50

// generateMission()
//         │
//         ├── generate telemetry
//         │
//         └── build frames
//                  ↓
//              Mission

// The beautiful part

// When the replay engine eventually wants:

// Frame 300

// it doesn't need to search through 30,000 records.

// It simply gets:

// mission.frames[300]

// and receives:

// 50 drone states

// That's the reason we created frames.

import fs from "fs-extra";
import path from "path";

import { Drone } from "../models/Drone.js";
import { Mission } from "../models/Mission.js";
import { fleetDefinitions } from "../data/fleetDefinitions.js";
import { generateDroneTelemetry } from "./generateDroneTelemetry.js";
import { buildMissionFrames } from "./buildMissionFrames.js";

export async function generateMission(drones: Drone[]): Promise<Mission> {
  const durationSeconds = 600;
  const startTime = new Date();

  const telemetry = [];

  for (let i = 0; i < drones.length; i++) {
    const drone = drones[i];

    const fleet = fleetDefinitions.find((fleet) => fleet.id === drone.fleetId);

    if (!fleet) {
      throw new Error(`Fleet not found for drone ${drone.id}`);
    }

    const droneTelemetry = generateDroneTelemetry(
      drone,
      fleet.type,
      startTime,
      durationSeconds,
      i,
    );

    telemetry.push(...droneTelemetry);
  }

  const frames = buildMissionFrames(telemetry);

  const mission: Mission = {
    id: "mission-001",
    name: "European Multi-Fleet Operations",
    startTime: startTime.toISOString(),
    durationSeconds,
    droneIds: drones.map((drone) => drone.id),
    frames,
  };

  const outputPath = path.join(process.cwd(), "data", "mission-001.json");

  await fs.outputJson(outputPath, mission, {
    spaces: 2,
  });

  console.log(`Generated mission with ${telemetry.length} telemetry records`);

  return mission;
}

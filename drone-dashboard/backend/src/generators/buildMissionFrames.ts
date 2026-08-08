import { Telemetry } from "../models/Telemetry.js";
import { MissionFrame } from "../models/MissionFrame.js";

export function buildMissionFrames(telemetry: Telemetry[]): MissionFrame[] {
  const frameMap = new Map<string, Telemetry[]>();

  for (const point of telemetry) {
    const existingFrame = frameMap.get(point.timestamp);

    if (existingFrame) {
      existingFrame.push(point);
    } else {
      frameMap.set(point.timestamp, [point]);
    }
  }

  return Array.from(frameMap.entries()).map(([timestamp, drones]) => ({
    timestamp,
    drones,
  }));
}

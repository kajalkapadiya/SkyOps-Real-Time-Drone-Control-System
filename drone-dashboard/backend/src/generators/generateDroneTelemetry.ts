import { Drone } from "../models/Drone.js";
import { Telemetry } from "../models/Telemetry.js";
import { createTelemetry } from "./createTelemetry.js";
import { generateMissionPosition } from "./generateMissionPosition.js";

export function generateDroneTelemetry(
  drone: Drone,
  fleetType: string,
  startTime: Date,
  durationSeconds: number,
  droneIndex: number,
): Telemetry[] {
  const telemetry: Telemetry[] = [];

  let battery = 100;

  for (let second = 0; second < durationSeconds; second++) {
    const timestamp = new Date(startTime.getTime() + second * 1000);

    const progress = second / durationSeconds;

    const position = generateMissionPosition(fleetType, progress, droneIndex);

    const altitude = 80 + Math.sin(progress * Math.PI * 2) * 20 + droneIndex;

    const speed = 10 + Math.sin(progress * Math.PI * 4) * 2;

    battery = Math.max(0, 100 - progress * 25);

    const signal = 90 + Math.sin(progress * Math.PI * 6) * 5;

    telemetry.push(
      createTelemetry(
        drone.id,
        timestamp.toISOString(),
        position.latitude,
        position.longitude,
        altitude,
        speed,
        battery,
        signal,
      ),
    );
  }

  return telemetry;
}

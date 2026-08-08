import { Telemetry } from "../models/Telemetry.js";

export function createTelemetry(
  droneId: string,
  timestamp: string,
  latitude: number,
  longitude: number,
  altitude: number,
  speed: number,
  battery: number,
  signal: number,
): Telemetry {
  return {
    droneId,
    timestamp,
    latitude,
    longitude,
    altitude,
    speed,
    battery,
    signal,
  };
}

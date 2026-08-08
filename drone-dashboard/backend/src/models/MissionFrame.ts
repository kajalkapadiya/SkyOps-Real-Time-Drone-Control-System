import { Telemetry } from "./Telemetry.js";

export interface MissionFrame {
  timestamp: string;
  drones: Telemetry[];
}

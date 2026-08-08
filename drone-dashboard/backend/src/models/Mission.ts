import { MissionFrame } from "./MissionFrame.js";

export interface Mission {
  id: string;
  name: string;
  startTime: string;
  durationSeconds: number;
  droneIds: string[];
  frames: MissionFrame[];
}

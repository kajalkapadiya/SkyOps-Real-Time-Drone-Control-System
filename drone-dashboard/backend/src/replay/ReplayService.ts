import { ReplayEngine } from "./ReplayEngine.js";
import { Mission } from "../models/Mission.js";

export class ReplayService {
  private engine: ReplayEngine;

  constructor(
    mission: Mission,
    onFrame: (frame: Mission["frames"][number]) => void,
  ) {
    this.engine = new ReplayEngine(mission, onFrame);
  }

  play() {
    this.engine.play();
  }

  pause() {
    this.engine.pause();
  }

  seek(frame: number) {
    this.engine.seek(frame);
  }

  setSpeed(speed: number) {
    this.engine.setSpeed(speed);
  }

  getCurrentFrame() {
    return this.engine.getCurrentFrame();
  }

  getStatus() {
    return this.engine.getStatus();
  }

  getReplayState() {
    return this.engine.getReplayState();
  }
}

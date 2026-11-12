import { Mission } from "../models/Mission.js";

export class MissionReplayEngine {
  private mission: Mission;
  private currentFrameIndex = 0;
  private playing = false;
  private speed = 1;

  constructor(mission: Mission) {
    this.mission = mission;
  }

  getCurrentFrame() {
    return this.mission.frames[this.currentFrameIndex];
  }

  nextFrame() {
    if (this.currentFrameIndex >= this.mission.frames.length - 1) {
      this.playing = false;
      return null;
    }

    this.currentFrameIndex++;

    return this.getCurrentFrame();
  }

  async play() {
    if (this.playing) {
      return;
    }

    this.playing = true;

    while (this.playing) {
      const frame = this.getCurrentFrame();

      console.log(`Playing frame ${this.currentFrameIndex}`, frame.timestamp);

      await this.wait(1000 / this.speed);

      this.nextFrame();
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  pause() {
    this.playing = false;
  }

  restart() {
    this.currentFrameIndex = 0;
    this.playing = false;
  }

  seek(frameIndex: number) {
    if (frameIndex < 0) {
      this.currentFrameIndex = 0;
      return;
    }

    if (frameIndex >= this.mission.frames.length) {
      this.currentFrameIndex = this.mission.frames.length - 1;

      return;
    }

    this.currentFrameIndex = frameIndex;
  }

  setSpeed(speed: number) {
    if (speed <= 0) {
      throw new Error("Speed must be greater than 0");
    }

    this.speed = speed;
  }
}

// Why use a class?

// Because the replay engine has state.

// It needs to remember:

// Which mission?
// Which frame?
// Playing or paused?
// What speed?

// For example:

// Replay Engine
// │
// ├── mission
// ├── currentFrameIndex
// ├── playing
// └── speed

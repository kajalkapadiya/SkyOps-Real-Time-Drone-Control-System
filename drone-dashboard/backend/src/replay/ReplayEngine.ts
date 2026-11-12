import { Mission } from "../models/Mission.js";

export class ReplayEngine {
  private mission: Mission;
  private currentFrame = 0;
  private playing = false;
  private speed = 1;
  private timer: NodeJS.Timeout | null = null;

  private onFrame: (frame: Mission["frames"][number]) => void;

  constructor(
    mission: Mission,
    onFrame: (frame: Mission["frames"][number]) => void,
  ) {
    this.mission = mission;
    this.onFrame = onFrame;
  }

  getCurrentFrame() {
    return this.mission.frames[this.currentFrame];
  }

  getStatus() {
    return this.playing ? "playing" : "paused";
  }

  getReplayState() {
    const frame = this.getCurrentFrame();

    return {
      currentFrame: this.currentFrame,
      totalFrames: this.mission.frames.length,
      timestamp: frame.timestamp,
      status: this.getStatus(),
      speed: this.speed,
    };
  }

  play() {
    if (this.playing) {
      return;
    }

    this.playing = true;

    this.startLoop();
  }

  private startLoop() {
    this.timer = setInterval(() => {
      this.nextFrame();
    }, 1000 / this.speed);
  }

  private nextFrame() {
    if (!this.playing) {
      return;
    }

    if (this.currentFrame >= this.mission.frames.length - 1) {
      this.pause();
      return;
    }

    this.currentFrame += 1;

    this.onFrame(this.getCurrentFrame());

    console.log("Frame:", this.currentFrame);
  }

  pause() {
    this.playing = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    //  here change replay state to paused and send to client check this whole code again and set or clear anything if there is mistake.
  }

  seek(frame: number) {
    if (frame < 0) {
      frame = 0;
    }

    if (frame >= this.mission.frames.length) {
      frame = this.mission.frames.length - 1;
    }

    this.currentFrame = frame;

    this.onFrame(this.getCurrentFrame());
  }

  setSpeed(speed: number) {
    if (speed <= 0) {
      return;
    }

    this.speed = speed;
    if (this.playing) {
      this.pause();
      this.play();
    }
  }
}

import type { MissionFrame } from "../types/mission";

export type ReplayStatus = "playing" | "paused";

export type ServerMessage =
  | {
      type: "connected";
      message: string;
    }
  | {
      type: "frame";
      frame: MissionFrame;
    }
  | {
      type: "status";
      status: ReplayStatus;
    }
  | {
      type: "replayState";
      state: ReplayState;
    };

export type ClientMessage =
  | {
      action: "PLAY";
    }
  | {
      action: "PAUSE";
    }
  | {
      action: "SEEK";
      frame: number;
    }
  | {
      action: "SET_SPEED";
      speed: number;
    };

export type ReplayState = {
  currentFrame: number;
  totalFrames: number;
  timestamp: string;
  status: "playing" | "paused";
  speed: number;
};

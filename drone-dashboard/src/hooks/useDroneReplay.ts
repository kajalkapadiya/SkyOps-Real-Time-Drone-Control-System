//The hook is responsible for translating WebSocket messages into React state.

// Your hook should have approximately this responsibility:

// connect
// receive message
// parse message
// update state
// send commands
// disconnect
import { useEffect, useRef, useState } from "react";

import type { MissionFrame } from "../types/mission";
import type { ClientMessage, ServerMessage } from "../websocket/websocketTypes";

const WS_URL = "ws://localhost:5000";

interface ReplayState {
  status: "idle" | "playing" | "paused" | "completed";
  currentFrame: number;
  totalFrames: number;
}

export function useDroneReplay() {
  const socketRef = useRef<WebSocket | null>(null);

  const [currentFrame, setCurrentFrame] = useState<MissionFrame | null>(null);

  const [replayState, setReplayState] = useState<ReplayState | null>(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to replay server");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;

      handleServerMessage(message);
    };

    socket.onclose = () => {
      console.log("Disconnected from replay server");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.close();
    };
  }, []);

  function handleServerMessage(message: ServerMessage) {
    if (message.type === "frame") {
      setCurrentFrame(message.frame);
      console.log("Received frame:", message);
      setReplayState((previous) => ({
        status: previous?.status ?? "playing",
        currentFrame: previous?.currentFrame ?? 0,
        totalFrames: previous?.totalFrames ?? 0,
      }));
    }

    // if (message.type === "ReplayStatus") {
    //   setReplayState(message.state);
    // }
  }

  function send(message: ClientMessage) {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }

  function play() {
    send({
      action: "PLAY",
    });
  }

  function pause() {
    send({
      action: "PAUSE",
    });
  }

  function seek(frame: number) {
    send({
      action: "SEEK",
      frame,
    });
  }

  function setSpeed(speed: number) {
    send({
      action: "SET_SPEED",
      speed,
    });
  }

  return {
    currentFrame,
    replayState,
    play,
    pause,
    seek,
    setSpeed,
  };
}

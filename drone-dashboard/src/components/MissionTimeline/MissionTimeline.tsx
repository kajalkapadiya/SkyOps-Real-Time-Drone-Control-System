import type { ReplayState } from "../../websocket/websocketTypes";
import "./MissionTimeline.css";

interface MissionTimelineProps {
  replayState: ReplayState | null;
  onSeek: (frame: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: number) => void;
}

export function MissionTimeline({
  replayState,
  onSeek,
  onPlay,
  onPause,
  onSpeedChange,
}: MissionTimelineProps) {
  if (!replayState) {
    return null;
  }

  const { currentFrame, totalFrames, status } = replayState;

  return (
    <section className="mission-timeline">
      <div className="mission-timeline__controls">
        <button onClick={status === "playing" ? onPause : onPlay}>
          {status === "playing" ? "Pause" : "Play"}
        </button>

        <div className="mission-timeline__speed">
          <button onClick={() => onSpeedChange(1)}>1×</button>

          <button onClick={() => onSpeedChange(2)}>2×</button>

          <button onClick={() => onSpeedChange(5)}>5×</button>
        </div>

        <span>
          Frame {currentFrame} / {totalFrames - 1}
        </span>
      </div>

      <input
        type="range"
        min="0"
        max={totalFrames - 1}
        value={currentFrame}
        onChange={(event) => {
          onSeek(Number(event.target.value));
        }}
      />
    </section>
  );
}

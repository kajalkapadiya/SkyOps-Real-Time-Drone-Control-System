import { useEffect, useRef } from "react";
import "./AlertLog.css";

type AlertLogProps = {
  events: DroneEvent[];
};

export interface DroneEvent {
  id: number;
  droneId: number;
  type: EventType;
  message: string;
  timestamp: string;
}

export type EventType =
  | "warning"
  | "critical"
  | "geofence"
  | "command"
  | "recovery";

export default function AlertLog({ events }: AlertLogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const EVENT_COLOR: Record<EventType, string> = {
    warning: "#ffd700",
    critical: "#ff3333",
    geofence: "#ff6b35",
    command: "#00f5ff",
    recovery: "#39ff14",
  };

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div ref={listRef} className="alert-log">
      {events.length === 0 && (
        <div className="alert-empty">No events yet...</div>
      )}

      {[...events].map((ev, index) => {
        const evColor = EVENT_COLOR[ev.type] ?? "#fff";
        const time = new Date(ev.timestamp).toLocaleTimeString();

        return (
          <div
            key={index}
            className="alert-item"
            style={{
              background: `${evColor}0d`,
              border: `1px solid ${evColor}22`,
            }}
          >
            <div className="alert-dot" style={{ background: evColor }} />

            <div className="alert-message">{ev.message}</div>

            <span className="alert-time">{time}</span>
          </div>
        );
      })}
    </div>
  );
}

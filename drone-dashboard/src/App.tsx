// tsconfig must have "strict": true for this file.
// Every variable is typed — no "any" unless unavoidable.

import "./app.css";
import StatCard from "./components/StatCard/StatCard";
import AlertLog from "./components/AlertLog/AlertLog";
import { useEffect, useRef, useState, useCallback, useReducer } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ─────────────────────────────────────────────
// TYPES
// WHY: Strict types catch bugs at compile time.
// An interviewer will look for this immediately.
// ─────────────────────────────────────────────
export type DroneStatus = "active" | "warning" | "critical" | "offline";
export type EventType =
  | "warning"
  | "critical"
  | "geofence"
  | "command"
  | "recovery";
export type WsState = "connecting" | "connected" | "reconnecting" | "error";

export interface Drone {
  id: number;
  x: number;
  y: number;
  battery: number;
  altitude: number;
  speed: number;
  signal: number;
  status: DroneStatus;
  paused: boolean;
  returnToBase: boolean;
  outsideGeofence: boolean;
}

export interface DroneEvent {
  id: number;
  droneId: number;
  type: EventType;
  message: string;
  timestamp: string;
}

export interface Geofence {
  x: number;
  y: number;
  w: number;
  h: number;
}

type BatteryPoint = { tick: number } & Record<string, number>;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const DRONE_COLORS: Record<number, string> = {
  1: "#00f5ff",
  2: "#39ff14",
  3: "#ff6b35",
  4: "#bf5fff",
  5: "#ffd700",
};
const STATUS_COLOR: Record<DroneStatus, string> = {
  active: "#39ff14",
  warning: "#ffd700",
  critical: "#ff3333",
  offline: "#555",
};

const TRAIL_LENGTH = 14;
const CANVAS_SIZE = 500;
const HISTORY_LEN = 30;
const WS_URL = "ws://localhost:5000";

// ─────────────────────────────────────────────
// HOOK: useWebSocket
// WHY: All WebSocket logic is isolated here.
// The component knows nothing about sockets — it just receives clean data.
// This is the Separation of Concerns principle in action.
// ─────────────────────────────────────────────
interface WsMessage {
  type: "init" | "telemetry" | "events";
  drones?: Drone[];
  events?: DroneEvent[];
  geofence?: Geofence;
}

interface UseWebSocketReturn {
  wsState: WsState;
  sendCommand: (cmd: object) => void;
}

function useWebSocket(
  url: string,
  onMessage: (msg: WsMessage) => void,
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const [wsState, setWsState] = useState<WsState>("connecting");

  const connect = useCallback(() => {
    setWsState(retryCount.current > 0 ? "reconnecting" : "connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState("connected");
      retryCount.current = 0;
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        onMessage(JSON.parse(e.data as string) as WsMessage);
      } catch {
        console.error("Failed to parse WS message");
      }
    };

    ws.onclose = () => {
      // Exponential back-off: 1s, 2s, 4s … capped at 10s
      // WHY: Hammering a crashed server every 100ms is bad practice.
      const delay = Math.min(1000 * 2 ** retryCount.current, 10000);
      retryCount.current += 1;
      setWsState("reconnecting");
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setWsState("error");
      ws.close();
    };
  }, [url, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  const sendCommand = useCallback((cmd: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return { wsState, sendCommand };
}

// ─────────────────────────────────────────────
// COMPONENT: ConnectionBanner
// WHY: Users must always know the connection state.
// Silent failures are terrible UX — this is a non-negotiable production pattern.
// ─────────────────────────────────────────────
const WS_LABELS: Record<WsState, string> = {
  connecting: "Connecting...",
  connected: "Live",
  reconnecting: "Reconnecting...",
  error: "Connection error",
};
const WS_COLORS: Record<WsState, string> = {
  connecting: "#ffd700",
  connected: "#39ff14",
  reconnecting: "#ff6b35",
  error: "#ff3333",
};

function ConnectionBanner({ state }: { state: WsState }) {
  if (state === "connected") return null;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: state === "error" ? "#2a0808" : "#1a1208",
        borderBottom: `1px solid ${WS_COLORS[state]}44`,
        padding: "8px 24px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: WS_COLORS[state],
          animation: "pulse 1s infinite",
        }}
      />
      <span
        style={{
          color: WS_COLORS[state],
          fontSize: 13,
          fontFamily: "'Courier New', monospace",
          letterSpacing: 1,
        }}
      >
        {WS_LABELS[state]} — server may be offline
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: DroneMap
// Renders the canvas with trails, geofence, status rings
// WHY: Canvas is used (not SVG) because it handles 60fps animation
// of many moving objects without DOM overhead.
// ─────────────────────────────────────────────
function DroneMap({
  drones,
  trails,
  geofence,
}: {
  drones: Drone[];
  trails: Map<number, { x: number; y: number }[]>;
  geofence: Geofence | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tick = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    cancelAnimationFrame(rafRef.current);

    const draw = () => {
      tick.current++;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Background
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Grid
      ctx.strokeStyle = "rgba(0,245,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= CANVAS_SIZE; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_SIZE, i);
        ctx.stroke();
      }

      // Geofence boundary
      if (geofence) {
        ctx.strokeStyle = "rgba(255,107,53,0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(geofence.x, geofence.y, geofence.w, geofence.h);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,107,53,0.06)";
        ctx.fillRect(geofence.x, geofence.y, geofence.w, geofence.h);
        ctx.fillStyle = "rgba(255,107,53,0.5)";
        ctx.font = "10px 'Courier New'";
        ctx.fillText("GEOFENCE", geofence.x + 6, geofence.y + 14);
      }

      // Trails
      drones.forEach((drone) => {
        const trail = trails.get(drone.id) ?? [];
        if (trail.length < 2) return;
        const color = DRONE_COLORS[drone.id] ?? "#fff";
        for (let i = 1; i < trail.length; i++) {
          const a = i / trail.length;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle =
            color +
            Math.floor(a * 200)
              .toString(16)
              .padStart(2, "0");
          ctx.lineWidth = a * 2;
          ctx.stroke();
        }
      });

      // Drones
      drones.forEach((drone) => {
        const color = DRONE_COLORS[drone.id] ?? "#fff";
        const statusColor = STATUS_COLOR[drone.status];
        const pulse = (Math.sin(tick.current * 0.08) + 1) / 2;

        if (drone.status === "warning" || drone.status === "critical") {
          ctx.beginPath();
          ctx.arc(drone.x, drone.y, 18 + pulse * 8, 0, Math.PI * 2);
          ctx.strokeStyle =
            statusColor +
            Math.floor(pulse * 180)
              .toString(16)
              .padStart(2, "0");
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Geofence violation indicator
        if (drone.outsideGeofence) {
          ctx.beginPath();
          ctx.arc(drone.x, drone.y, 22, 0, Math.PI * 2);
          ctx.strokeStyle = "#ff6b3588";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Status ring
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Paused indicator
        if (drone.paused) {
          ctx.fillStyle = "#ffffff66";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText("⏸", drone.x, drone.y - 26);
        }

        // Drone body
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // ID label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText(`D${drone.id}`, drone.x, drone.y - 20);

        // Battery bar
        const bw = 24,
          bx = drone.x - bw / 2,
          by = drone.y + 18;
        ctx.fillStyle = "#1a1f2e";
        ctx.fillRect(bx, by, bw, 4);
        ctx.fillStyle =
          drone.battery > 50
            ? "#39ff14"
            : drone.battery > 25
              ? "#ffd700"
              : "#ff3333";
        ctx.fillRect(bx, by, bw * (drone.battery / 100), 4);
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drones, trails, geofence]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        borderRadius: 8,
        border: "1px solid rgba(0,245,255,0.15)",
        display: "block",
      }}
    />
  );
}

// ─────────────────────────────────────────────
// COMPONENT: CommandPanel
// WHY: This is what separates a "dashboard" from a "control system".
// Sends structured commands back over WebSocket to the server.
// The server mutates state — the client never directly modifies drone data.
// This is correct client-server architecture.
// ─────────────────────────────────────────────
function CommandPanel({
  drone,
  onClose,
  onCommand,
}: {
  drone: Drone;
  onClose: () => void;
  onCommand: (cmd: object) => void;
}) {
  const color = DRONE_COLORS[drone.id] ?? "#fff";

  const send = (action: string, extra?: object) => {
    onCommand({ action, droneId: drone.id, ...extra });
  };

  return (
    <div
      style={{
        background: "#0f1421",
        border: `1px solid ${color}44`,
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
            }}
          />
          <span
            style={{
              color,
              fontFamily: "'Courier New', monospace",
              fontWeight: 700,
            }}
          >
            DRONE-{drone.id}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: 1,
              background: STATUS_COLOR[drone.status] + "22",
              color: STATUS_COLOR[drone.status],
            }}
          >
            {drone.status.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#4a6fa5",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* Telemetry readout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          ["Battery", `${drone.battery.toFixed(0)}%`],
          ["Altitude", `${drone.altitude.toFixed(0)}m`],
          ["Speed", `${drone.speed.toFixed(1)} m/s`],
          ["Signal", `${drone.signal.toFixed(0)}%`],
        ].map(([label, val]) => (
          <div
            key={label}
            style={{
              background: "#1a1f2e",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#4a6fa5",
                letterSpacing: 1,
                marginBottom: 3,
              }}
            >
              {label}
            </div>
            <div
              style={{
                color: "#00f5ff",
                fontFamily: "'Courier New', monospace",
                fontSize: 16,
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Command buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {drone.paused ? (
          <CmdButton
            color="#39ff14"
            onClick={() => send("RESUME")}
            label="Resume"
            sub="Continue mission"
          />
        ) : (
          <CmdButton
            color="#ffd700"
            onClick={() => send("PAUSE")}
            label="Pause"
            sub="Hold current position"
          />
        )}
        <CmdButton
          color="#00f5ff"
          onClick={() => send("RTB")}
          label="Return to base"
          sub="Fly to home point"
          disabled={drone.returnToBase}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#4a6fa5", letterSpacing: 1 }}>
            SET SPEED
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[2, 4, 6, 8].map((v) => (
              <button
                key={v}
                onClick={() => send("SET_SPEED", { value: v })}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  background: "#1a1f2e",
                  border: "1px solid rgba(0,245,255,0.2)",
                  borderRadius: 6,
                  color: "#00f5ff",
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: 13,
                }}
              >
                {v} m/s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CmdButton({
  color,
  onClick,
  label,
  sub,
  disabled = false,
}: {
  color: string;
  onClick: () => void;
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#1a1f2e" : `${color}18`,
        border: `1px solid ${disabled ? "#2a2f3e" : color + "55"}`,
        borderRadius: 8,
        padding: "12px 16px",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        transition: "background 0.2s",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div
        style={{
          color: disabled ? "#4a6fa5" : color,
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#4a6fa5", fontSize: 11 }}>{sub}</div>
    </button>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: DroneTableRow
// Clicking a row opens the CommandPanel
// ─────────────────────────────────────────────
function DroneTable({
  drones,
  onSelect,
}: {
  drones: Drone[];
  onSelect: (d: Drone) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "'Courier New', monospace",
          fontSize: 12,
        }}
      >
        <thead>
          <tr
            style={{
              color: "#4a6fa5",
              borderBottom: "1px solid rgba(0,245,255,0.1)",
            }}
          >
            {["ID", "STATUS", "BATTERY", "ALT", "SPEED", "SIGNAL", "FENCE"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    letterSpacing: 1,
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {drones.map((drone) => {
            const color = DRONE_COLORS[drone.id] ?? "#fff";
            const sColor = STATUS_COLOR[drone.status];
            return (
              <tr
                key={drone.id}
                onClick={() => onSelect(drone)}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: "10px 10px", color }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      marginRight: 8,
                    }}
                  />
                  D-{drone.id}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <span
                    style={{
                      color: sColor,
                      background: sColor + "22",
                      padding: "2px 7px",
                      borderRadius: 4,
                      fontSize: 10,
                      letterSpacing: 1,
                    }}
                  >
                    {drone.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        background: "#1a1f2e",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${drone.battery}%`,
                          height: "100%",
                          borderRadius: 2,
                          transition: "width 0.5s",
                          background:
                            drone.battery > 50
                              ? "#39ff14"
                              : drone.battery > 25
                                ? "#ffd700"
                                : "#ff3333",
                        }}
                      />
                    </div>
                    <span style={{ color: "#ccc", minWidth: 32 }}>
                      {drone.battery.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: "10px 10px", color: "#ccc" }}>
                  {drone.altitude.toFixed(0)}m
                </td>
                <td style={{ padding: "10px 10px", color: "#ccc" }}>
                  {drone.speed.toFixed(1)}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    color:
                      drone.signal > 70
                        ? "#39ff14"
                        : drone.signal > 40
                          ? "#ffd700"
                          : "#ff3333",
                  }}
                >
                  {drone.signal.toFixed(0)}%
                </td>
                <td style={{ padding: "10px 10px" }}>
                  {drone.outsideGeofence ? (
                    <span style={{ color: "#ff6b35", fontSize: 10 }}>
                      BREACH
                    </span>
                  ) : (
                    <span style={{ color: "#39ff1455", fontSize: 10 }}>OK</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP STATE REDUCER
// WHY: When state gets complex (drones + events + geofence + selected drone),
// useReducer is cleaner than many useState calls.
// This also makes state transitions easier to test.
// ─────────────────────────────────────────────
interface AppState {
  drones: Drone[];
  events: DroneEvent[];
  geofence: Geofence | null;
  batteryHistory: BatteryPoint[];
  tick: number;
}

type AppAction =
  | { type: "INIT"; drones: Drone[]; events: DroneEvent[]; geofence: Geofence }
  | { type: "TELEMETRY"; drones: Drone[] }
  | { type: "EVENTS"; events: DroneEvent[] };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        drones: action.drones,
        events: action.events,
        geofence: action.geofence,
      };

    case "TELEMETRY": {
      const tick = state.tick + 1;
      const snapshot: BatteryPoint = { tick };
      action.drones.forEach((d) => {
        snapshot[`D${d.id}`] = parseFloat(d.battery.toFixed(1));
      });
      const history = [...state.batteryHistory, snapshot].slice(-HISTORY_LEN);
      return { ...state, drones: action.drones, batteryHistory: history, tick };
    }

    case "EVENTS":
      return {
        ...state,
        events: [...state.events, ...action.events].slice(-100),
      };

    default:
      return state;
  }
}

const initialState: AppState = {
  drones: [],
  events: [],
  geofence: null,
  batteryHistory: [],
  tick: 0,
};

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);

  const trailsRef = useRef<Map<number, { x: number; y: number }[]>>(new Map());
  const [trails, setTrails] = useState<Map<number, { x: number; y: number }[]>>(
    new Map(),
  );

  const handleMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "init" && msg.drones && msg.events && msg.geofence) {
      dispatch({
        type: "INIT",
        drones: msg.drones,
        events: msg.events,
        geofence: msg.geofence,
      });
    }
    if ((msg.type === "telemetry" || msg.type === "init") && msg.drones) {
      dispatch({ type: "TELEMETRY", drones: msg.drones });
      msg.drones.forEach(({ id, x, y }) => {
        const trail = trailsRef.current.get(id) ?? [];
        trail.push({ x, y });
        if (trail.length > TRAIL_LENGTH) trail.shift();
        trailsRef.current.set(id, trail);
      });
      setTrails(new Map(trailsRef.current));
      // Keep selected drone data fresh
      setSelectedDrone((prev) =>
        prev ? (msg.drones!.find((d) => d.id === prev.id) ?? null) : null,
      );
    }
    if (msg.type === "events" && msg.events) {
      dispatch({ type: "EVENTS", events: msg.events });
    }
  }, []);

  const { wsState, sendCommand } = useWebSocket(WS_URL, handleMessage);

  const { drones, events, geofence, batteryHistory } = state;
  const activeDrones = drones.filter((d) => d.status !== "offline").length;
  const avgBattery = drones.length
    ? (drones.reduce((s, d) => s + d.battery, 0) / drones.length).toFixed(0)
    : "--";
  const warnings = drones.filter(
    (d) => d.status === "warning" || d.status === "critical",
  ).length;
  const breaches = drones.filter((d) => d.outsideGeofence).length;

  return (
    <div className="app-container">
      {/* Connection banner — only visible when not connected */}
      <ConnectionBanner state={wsState} />

      <div className="app-content">
        {/* Header */}
        <div className="header">
          <div>
            <div className="header-subtitle">SWARM CONTROL CENTER</div>
            <h1 className="header-title">DRONE SWARM MONITOR</h1>
          </div>
          <div className="status">
            <div
              className="status-dot"
              style={{
                background: WS_COLORS[wsState],
                animation:
                  wsState === "connected" ? "pulse 1.5s infinite" : "none",
              }}
            />
            <span
              className="status-text"
              style={{
                color: WS_COLORS[wsState],
              }}
            >
              {WS_LABELS[wsState].toUpperCase()}
            </span>
          </div>
        </div>

        {/* KPI stat cards */}
        <div className="kpi-container">
          <StatCard label="Total drones" value={drones.length} />
          <StatCard label="Active" value={activeDrones} accent="#39ff14" />
          <StatCard
            label="Alerts"
            value={warnings}
            accent={warnings > 0 ? "#ff3333" : "#39ff14"}
          />
          <StatCard label="Avg battery" value={avgBattery} unit="%" />
          <StatCard
            label="Fence breaches"
            value={breaches}
            accent={breaches > 0 ? "#ff6b35" : "#39ff14"}
          />
        </div>

        {/* Main layout */}
        <div className="main-grid">
          {/* Left: Map */}
          <div>
            <div className="section-label">POSITIONAL MAP</div>
            <DroneMap drones={drones} trails={trails} geofence={geofence} />
            <div style={{ fontSize: 11, color: "#4a6fa5", marginTop: 8 }}>
              Click a drone row in the table to open the command panel.
            </div>
          </div>

          {/* Right: panels */}
          <div className="right-panel">
            {/* Command panel (shown when a drone is selected) */}
            {selectedDrone && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "#4a6fa5",
                    marginBottom: 8,
                  }}
                >
                  COMMAND PANEL
                </div>
                <CommandPanel
                  drone={selectedDrone}
                  onClose={() => setSelectedDrone(null)}
                  onCommand={sendCommand}
                />
              </div>
            )}

            {/* Battery telemetry chart */}
            <div className="card">
              <div className="card-title">BATTERY TELEMETRY (LIVE)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={batteryHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="tick"
                    tick={{ fill: "#4a6fa5", fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#4a6fa5", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f1421",
                      border: "1px solid #00f5ff33",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "#4a6fa5" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {[1, 2, 3, 4, 5].map((id) => (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`D${id}`}
                      stroke={DRONE_COLORS[id]}
                      dot={false}
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Alert log */}
            <div className="card">
              <div className="card-title">ALERT LOG</div>
              <AlertLog events={events} />
            </div>
          </div>
        </div>

        {/* Fleet table */}
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >
          <div className="card-title">
            FLEET STATUS — click a row to command
          </div>
          <DroneTable drones={drones} onSelect={setSelectedDrone} />
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}

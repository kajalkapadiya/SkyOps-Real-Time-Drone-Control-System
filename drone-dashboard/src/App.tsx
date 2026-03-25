import { useEffect, useRef, useState, useCallback } from "react";
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
// ─────────────────────────────────────────────
type DroneStatus = "active" | "warning" | "critical" | "offline";

type Drone = {
  id: number;
  x: number;
  y: number;
  battery: number;
  altitude: number;
  speed: number;
  status: DroneStatus;
  signal: number;
};

type BatterySnapshot = {
  tick: number;
  [key: string]: number; // drone_1, drone_2 ...
};

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

const TRAIL_LENGTH = 12;
const CANVAS_SIZE = 500;
const HISTORY_LENGTH = 30;

// ─────────────────────────────────────────────
// CUSTOM HOOK: useWebSocket
// Encapsulates all WebSocket connection logic.
// Reconnects automatically on disconnect.
// ─────────────────────────────────────────────
function useWebSocket(url: string, onMessage: (data: Drone[]) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data: Drone[] = JSON.parse(event.data);
        onMessage(data);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 2s
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, [url, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return connected;
}

// ─────────────────────────────────────────────
// COMPONENT: DroneMap
// Canvas-based 2D map with trails + status rings
// ─────────────────────────────────────────────
function DroneMap({
  drones,
  trails,
}: {
  drones: Drone[];
  trails: Map<number, { x: number; y: number }[]>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d"); // pen/brush to draw on canvas:
    if (!ctx) return;

    cancelAnimationFrame(animFrameRef.current);

    function draw() {
      if (!ctx || !canvas) return;
      tickRef.current++;

      // Background grid
      ctx.clearRect(0, 0, canvas.width, canvas.height); // erase everything before drawing new frame:
      // paint background dark:
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines : OF GRAPH
      ctx.strokeStyle = "rgba(0,245,255,0.06)";
      ctx.lineWidth = 1;
      // Vertical lines OF GRAPH
      for (let x = 0; x <= CANVAS_SIZE; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
      }
      // Horizontal lines OF GRAPH
      for (let y = 0; y <= CANVAS_SIZE; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
      }

      // Draw trails
      drones.forEach((drone) => {
        const trail = trails.get(drone.id) ?? [];
        if (trail.length < 2) return;
        const color = DRONE_COLORS[drone.id] ?? "#fff";
        for (let i = 1; i < trail.length; i++) {
          const alpha = i / trail.length;
          ctx!.beginPath();
          ctx!.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx!.lineTo(trail[i].x, trail[i].y);
          ctx!.strokeStyle = `${color}${Math.floor(alpha * 99)
            .toString()
            .padStart(2, "0")}`;
          ctx!.lineWidth = alpha * 2;
          ctx!.stroke();
        }
      });

      // Draw drones
      drones.forEach((drone) => {
        const color = DRONE_COLORS[drone.id] ?? "#fff";
        const statusColor = STATUS_COLOR[drone.status];
        const pulse = (Math.sin(tickRef.current * 0.08) + 1) / 2;

        // Outer ping ring for warning/critical
        if (drone.status === "warning" || drone.status === "critical") {
          ctx!.beginPath();
          ctx!.arc(drone.x, drone.y, 18 + pulse * 8, 0, Math.PI * 2);
          ctx!.strokeStyle = `${statusColor}${Math.floor(pulse * 180)
            .toString(16)
            .padStart(2, "0")}`;
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        }

        // Status ring
        ctx!.beginPath();
        ctx!.arc(drone.x, drone.y, 14, 0, Math.PI * 2);
        ctx!.strokeStyle = statusColor;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        // Drone body
        ctx!.beginPath();
        ctx!.arc(drone.x, drone.y, 8, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.shadowColor = color;
        ctx!.shadowBlur = 14;
        ctx!.fill();
        ctx!.shadowBlur = 0;

        // ID label
        ctx!.fillStyle = "#ffffff";
        ctx!.font = "bold 10px 'Courier New'";
        ctx!.textAlign = "center";
        ctx!.fillText(`D${drone.id}`, drone.x, drone.y - 20);

        // Battery mini bar
        const barW = 24;
        const barX = drone.x - barW / 2;
        const barY = drone.y + 18;
        ctx!.fillStyle = "#1a1f2e";
        ctx!.fillRect(barX, barY, barW, 4);
        const battColor =
          drone.battery > 50
            ? "#39ff14"
            : drone.battery > 25
              ? "#ffd700"
              : "#ff3333";
        ctx!.fillStyle = battColor;
        ctx!.fillRect(barX, barY, barW * (drone.battery / 100), 4);
      });

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drones, trails]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        borderRadius: "8px",
        border: "1px solid rgba(0,245,255,0.15)",
        display: "block",
      }}
    />
  );
}

// ─────────────────────────────────────────────
// COMPONENT: StatCard
// ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(0,245,255,0.03)",
        border: "1px solid rgba(0,245,255,0.12)",
        borderRadius: 8,
        padding: "12px 16px",
        minWidth: 110,
      }}
    >
      <div
        style={{
          color: "#4a6fa5",
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: accent ?? "#00f5ff",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "'Courier New', monospace",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 12, marginLeft: 3, color: "#4a6fa5" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: DroneTable
// Sortable live data table
// ─────────────────────────────────────────────
function DroneTable({ drones }: { drones: Drone[] }) {
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
            {["ID", "STATUS", "BATTERY", "ALTITUDE", "SPEED", "SIGNAL"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
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
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "background 0.2s",
                }}
              >
                <td style={{ padding: "10px 12px", color }}>
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
                  DRONE-{drone.id}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      color: sColor,
                      background: `${sColor}22`,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      letterSpacing: 1,
                    }}
                  >
                    {drone.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
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
                          background:
                            drone.battery > 50
                              ? "#39ff14"
                              : drone.battery > 25
                                ? "#ffd700"
                                : "#ff3333",
                          borderRadius: 2,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                    <span style={{ color: "#ccc", minWidth: 36 }}>
                      {drone.battery.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: "#ccc" }}>
                  {drone.altitude.toFixed(0)}m
                </td>
                <td style={{ padding: "10px 12px", color: "#ccc" }}>
                  {drone.speed.toFixed(1)} m/s
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      color:
                        drone.signal > 70
                          ? "#39ff14"
                          : drone.signal > 40
                            ? "#ffd700"
                            : "#ff3333",
                    }}
                  >
                    {drone.signal.toFixed(0)}%
                  </span>
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
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [drones, setDrones] = useState<Drone[]>([]);
  // Stores last N positions per drone for trail rendering
  const trailsRef = useRef<Map<number, { x: number; y: number }[]>>(new Map());
  const [trails, setTrails] = useState<Map<number, { x: number; y: number }[]>>(
    new Map(),
  );
  // Rolling time-series battery history for chart
  const [batteryHistory, setBatteryHistory] = useState<BatterySnapshot[]>([]);
  const tickRef = useRef(0);

  const handleMessage = useCallback((incoming: Drone[]) => {
    console.log("🤪 incoming : ", "color: #d12feb", incoming);

    setDrones(incoming);

    // Update trails
    incoming.forEach(({ id, x, y }) => {
      const trail = trailsRef.current.get(id) ?? [];
      trail.push({ x, y });
      if (trail.length > TRAIL_LENGTH) trail.shift();
      trailsRef.current.set(id, trail);
    });
    setTrails(new Map(trailsRef.current));

    // Update battery history (rolling window)
    tickRef.current++;
    setBatteryHistory((prev) => {
      const snapshot: BatterySnapshot = { tick: tickRef.current };
      incoming.forEach((d) => {
        snapshot[`Drone ${d.id}`] = parseFloat(d.battery.toFixed(1));
      });
      const next = [...prev, snapshot];
      return next.length > HISTORY_LENGTH ? next.slice(-HISTORY_LENGTH) : next;
    });
  }, []);

  const connected = useWebSocket("ws://localhost:5000", handleMessage);

  const activeDrones = drones.filter((d) => d.status !== "offline").length;
  const avgBattery = drones.length
    ? (drones.reduce((s, d) => s + d.battery, 0) / drones.length).toFixed(0)
    : "--";
  const warnings = drones.filter(
    (d) => d.status === "warning" || d.status === "critical",
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c17",
        color: "#e0e6f0",
        fontFamily: "system-ui, sans-serif",
        padding: "20px 24px",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          borderBottom: "1px solid rgba(0,245,255,0.1)",
          paddingBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: "#4a6fa5",
              marginBottom: 4,
            }}
          >
            SWARM CONTROL CENTER
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              color: "#00f5ff",
              fontFamily: "'Courier New', monospace",
            }}
          >
            DRONE SWARM MONITOR
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "#39ff14" : "#ff3333",
              boxShadow: `0 0 8px ${connected ? "#39ff14" : "#ff3333"}`,
              animation: connected ? "pulse 1.5s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: connected ? "#39ff14" : "#ff3333",
              letterSpacing: 1,
            }}
          >
            {connected ? "WEBSOCKET LIVE" : "RECONNECTING..."}
          </span>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        <StatCard label="Total Drones" value={drones.length} />
        <StatCard label="Active" value={activeDrones} accent="#39ff14" />
        <StatCard
          label="Warnings"
          value={warnings}
          accent={warnings > 0 ? "#ffd700" : "#39ff14"}
        />
        <StatCard label="Avg Battery" value={avgBattery} unit="%" />
      </div>

      {/* ── MAIN GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "500px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* MAP */}
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: "#4a6fa5",
              marginBottom: 10,
            }}
          >
            POSITIONAL MAP
          </div>
          <DroneMap drones={drones} trails={trails} />
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* BATTERY CHART */}
          <div
            style={{
              background: "rgba(0,245,255,0.02)",
              border: "1px solid rgba(0,245,255,0.12)",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                color: "#4a6fa5",
                marginBottom: 12,
              }}
            >
              BATTERY TELEMETRY (LIVE)
            </div>
            <ResponsiveContainer width="100%" height={200}>
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
                    dataKey={`Drone ${id}`}
                    stroke={DRONE_COLORS[id]}
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* DRONE TABLE */}
          <div
            style={{
              background: "rgba(0,245,255,0.02)",
              border: "1px solid rgba(0,245,255,0.12)",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                color: "#4a6fa5",
                marginBottom: 12,
              }}
            >
              FLEET STATUS
            </div>
            <DroneTable drones={drones} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

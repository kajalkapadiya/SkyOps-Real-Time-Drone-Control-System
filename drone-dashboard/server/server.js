import { WebSocketServer } from "ws";

// ─── CONSTANTS ───────────────────────────────
// WHY: Magic numbers at the top = easy to tune without hunting through logic.
const PORT = 5000;
const TICK_MS = 300;
const CANVAS = 500;
const DRONE_COUNT = 5;

// Geofence rectangle. Server enforces it — not the client.
// In real IoT, the device enforces the boundary itself.
export const GEOFENCE = { x: 50, y: 50, w: 400, h: 400 };

// ─── HELPERS ─────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function getStatus(battery) {
  if (battery <= 0) return "offline";
  if (battery < 25) return "critical";
  if (battery < 50) return "warning";
  return "active";
}

export function isOutsideGeofence(x, y) {
  return (
    x < GEOFENCE.x ||
    x > GEOFENCE.x + GEOFENCE.w ||
    y < GEOFENCE.y ||
    y > GEOFENCE.y + GEOFENCE.h
  );
}

// ─── EVENT LOG ───────────────────────────────
// WHY: Circular buffer — last 50 events. New clients get history immediately.
// This is the "replay-on-connect" pattern used in Slack, Discord, monitoring tools.
const eventLog = [];

export function addEvent(droneId, type, message) {
  const ev = {
    id: Date.now() + Math.random(),
    droneId,
    type,
    message,
    timestamp: new Date().toISOString(),
  };
  eventLog.push(ev);
  if (eventLog.length > 50) eventLog.shift();
  return ev;
}

// ─── DRONE STATE ─────────────────────────────
// WHY: State is at module scope — not inside a connection handler.
// Multiple browser tabs can open the dashboard and all see the same drones.
export const droneStates = Array.from({ length: DRONE_COUNT }, (_, i) => ({
  id: i + 1,
  x: 150 + Math.random() * 200,
  y: 150 + Math.random() * 200,
  vx: (Math.random() - 0.5) * 4,
  vy: (Math.random() - 0.5) * 4,
  battery: 70 + Math.random() * 30,
  altitude: 50 + Math.random() * 150,
  speed: 2 + Math.random() * 6,
  signal: 75 + Math.random() * 25,
  paused: false,
  returnToBase: false,
  _wasOutside: false,
  baseX: CANVAS / 2,
  baseY: CANVAS / 2,
}));

// ─── PHYSICS TICK ────────────────────────────
// WHY: Pure function (aside from mutating drone) — easier to test.
// Returns new events generated this tick so the server can broadcast them.
// Everything in this code is based on: 👉 Velocity and 👉 Vector
export function tickDrone(drone) {
  if (drone.paused || drone.battery <= 0) return [];
  const events = [];

  if (drone.returnToBase) {
    const dx = drone.baseX - drone.x;
    const dy = drone.baseY - drone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      drone.returnToBase = false;
      events.push(
        addEvent(drone.id, "command", `Drone ${drone.id} reached base`),
      );
    } else {
      drone.vx = (dx / dist) * 4; // Move at speed 4 toward base -- direction * speed
      drone.vy = (dy / dist) * 4;
    }
  } else {
    drone.vx += (Math.random() - 0.5) * 0.3; // Random Movement (When NOT returning) -- Small push left/right every time
    drone.vy += (Math.random() - 0.5) * 0.3;
    const spd = Math.sqrt(drone.vx ** 2 + drone.vy ** 2);
    if (spd > 6) {
      drone.vx = (drone.vx / spd) * 6;
      drone.vy = (drone.vy / spd) * 6;
    }
  }

  // drone.x + drone.vx → “move drone” but keep it inside the box
  drone.x = clamp(drone.x + drone.vx, 10, CANVAS - 10); // minimum is 10 and max is 490 (canvas - 10) because of the geofence.
  drone.y = clamp(drone.y + drone.vy, 10, CANVAS - 10);

  // 🧠 What *=-1 does 👉 It reverses direction
  // vx = 5   → becomes → -5
  // vx = -3  → becomes → 3
  if (drone.x <= 10 || drone.x >= CANVAS - 10) drone.vx *= -1;
  if (drone.y <= 10 || drone.y >= CANVAS - 10) drone.vy *= -1;

  // Geofence events — emit ONCE on crossing, not every tick
  const outside = isOutsideGeofence(drone.x, drone.y);
  if (outside && !drone._wasOutside) {
    drone.returnToBase = true;
    events.push(
      addEvent(
        drone.id,
        "geofence",
        `Drone ${drone.id} breached geofence — RTB triggered`,
      ),
    );
  }
  if (!outside && drone._wasOutside && !drone.returnToBase) {
    events.push(
      addEvent(drone.id, "recovery", `Drone ${drone.id} re-entered geofence`),
    );
  }
  drone._wasOutside = outside;

  // Battery drain + threshold events
  const prev = drone.battery;
  drone.battery = clamp(drone.battery - 0.12, 0, 100);
  if (prev >= 50 && drone.battery < 50)
    events.push(
      addEvent(
        drone.id,
        "warning",
        `Drone ${drone.id} battery warning (${drone.battery.toFixed(0)}%)`,
      ),
    );
  if (prev >= 25 && drone.battery < 25)
    events.push(
      addEvent(drone.id, "critical", `Drone ${drone.id} battery critical!`),
    );

  const s = Math.sqrt(drone.vx ** 2 + drone.vy ** 2);
  // Real drones are NOT perfect 🤖 They shake, fluctuate
  // noise in altitude, speed, signal to make it more realistic (Math.random() - 0.5) * 2 gives a random number between -1 and 1, so the altitude can change by up to 1 meter each tick, speed can change by up to 2 m/s, and signal can change by up to 1%.
  drone.altitude = clamp(drone.altitude + (Math.random() - 0.5) * 3, 10, 250);
  drone.speed = clamp(s * 2.5 + (Math.random() - 0.5), 0.5, 15);
  drone.signal = clamp(drone.signal + (Math.random() - 0.5) * 2, 20, 100);

  return events;
}

function serialize(drone) {
  return {
    id: drone.id,
    x: +drone.x.toFixed(2),
    y: +drone.y.toFixed(2),
    battery: +drone.battery.toFixed(2),
    altitude: +drone.altitude.toFixed(1),
    speed: +drone.speed.toFixed(2),
    signal: +drone.signal.toFixed(1),
    status: getStatus(drone.battery),
    paused: drone.paused,
    returnToBase: drone.returnToBase,
    outsideGeofence: isOutsideGeofence(drone.x, drone.y),
  };
}

// ─── WEBSOCKET SERVER ────────────────────────
const wss = new WebSocketServer({ port: PORT });
console.log(`Drone server → ws://localhost:${PORT}`);

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c.readyState === c.OPEN) c.send(msg);
  });
}

// One global tick — physics runs even when no one is watching.
// WHY: Decoupling the simulation from connections = correct architecture.
setInterval(() => {
  const newEvents = droneStates.flatMap(tickDrone);
  broadcast({ type: "telemetry", drones: droneStates.map(serialize) });
  if (newEvents.length) broadcast({ type: "events", events: newEvents });
}, TICK_MS);

wss.on("connection", (ws) => {
  console.log(`+client (${wss.clients.size} total)`);

  // Send initial state immediately — client doesn't wait for first tick
  ws.send(
    JSON.stringify({
      type: "init",
      drones: droneStates.map(serialize),
      events: eventLog,
      geofence: GEOFENCE,
    }),
  );

  // ── Incoming commands ──
  // WHY: THIS is what makes it a control system, not just a viewer.
  ws.on("message", (raw) => {
    try {
      const { action, droneId, value } = JSON.parse(raw.toString());
      const drone = droneStates.find((d) => d.id === droneId);
      if (!drone) return;

      if (action === "PAUSE") {
        drone.paused = true;
        addEvent(droneId, "command", `Drone ${droneId} paused`);
      }
      if (action === "RESUME") {
        drone.paused = false;
        addEvent(droneId, "command", `Drone ${droneId} resumed`);
      }
      if (action === "RTB") {
        drone.returnToBase = true;
        drone.paused = false;
        addEvent(droneId, "command", `Drone ${droneId} returning to base`);
      }
      if (action === "SET_SPEED") {
        const s = clamp(value ?? 4, 1, 8) * 0.4;
        const mag = Math.sqrt(drone.vx ** 2 + drone.vy ** 2) || 1;
        drone.vx = (drone.vx / mag) * s;
        drone.vy = (drone.vy / mag) * s;
        addEvent(droneId, "command", `Drone ${droneId} speed → ${value}`);
      }

      broadcast({ type: "events", events: [eventLog[eventLog.length - 1]] });
    } catch (e) {
      console.error("Bad command:", e.message);
    }
  });

  ws.on("close", () => console.log(`-client (${wss.clients.size} total)`));
  ws.on("error", (e) => console.error("WS error:", e.message));
});

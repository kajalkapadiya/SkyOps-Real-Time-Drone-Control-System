import { WebSocketServer } from "ws";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
/**
 * @typedef {'active'|'warning'|'critical'|'offline'} DroneStatus
 *
 * Status lifecycle:
 *   battery > 50%  → active
 *   battery 25-50% → warning
 *   battery < 25%  → critical
 *   battery = 0%   → offline
 */

// ─────────────────────────────────────────────
// STATE: each drone has persistent physics state
// instead of re-randomizing each tick.
// ─────────────────────────────────────────────
const CANVAS_SIZE = 500;
const DRONE_COUNT = 5;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getStatus(battery) {
  if (battery <= 0) return "offline";
  if (battery < 25) return "critical";
  if (battery < 50) return "warning";
  return "active";
}

// Initialize drones with random starting state and velocity vectors
const droneStates = Array.from({ length: DRONE_COUNT }, (_, i) => ({
  id: i + 1,
  x: Math.random() * CANVAS_SIZE,
  y: Math.random() * CANVAS_SIZE,
  vx: (Math.random() - 0.5) * 4, // velocity in px/tick
  vy: (Math.random() - 0.5) * 4,
  battery: 60 + Math.random() * 40, // start 60–100%
  altitude: 50 + Math.random() * 150, // meters
  speed: 2 + Math.random() * 8, // m/s
  signal: 70 + Math.random() * 30, // %
}));

/**
 * Tick: advance drone physics one step.
 * - Move by velocity, bounce off walls
 * - Slightly randomize velocity (wind simulation)
 * - Drain battery slowly
 * - Fluctuate altitude, speed, signal realistically
 */
function tickDrone(drone) {
  // Move : 👉 Position = position + speed
  drone.x += drone.vx;
  drone.y += drone.vy;

  // Bounce off canvas boundaries : If drone hits left or right wall 👉 reverse direction
  if (drone.x < 10 || drone.x > CANVAS_SIZE - 10) drone.vx *= -1;
  if (drone.y < 10 || drone.y > CANVAS_SIZE - 10) drone.vy *= -1;
  // Clamp position to stay within bounds : 👉 Don’t allow drone to go outside screen
  drone.x = clamp(drone.x, 10, CANVAS_SIZE - 10);
  drone.y = clamp(drone.y, 10, CANVAS_SIZE - 10);

  // Wind perturbation: tiny random nudge to velocity :
  //🧠 Meaning: 👉 Add small random change to movement

  //💡 Example:
  // vx = 2
  // random = -0.1
  // new vx = 1.9

  //👉 Makes movement : not straight - looks natural : WIND EFFECT 🌬️ - Slight zig-zag movement

  drone.vx += (Math.random() - 0.5) * 0.3;
  drone.vy += (Math.random() - 0.5) * 0.3;

  // speed = √(vx² + vy²)
  const maxSpeed = 6;
  const spd = Math.sqrt(drone.vx ** 2 + drone.vy ** 2);
  // if speed is too high, scale down velocity to maxSpeed : 👉 Prevent drone from moving too fast
  if (spd > maxSpeed) {
    drone.vx = (drone.vx / spd) * maxSpeed;
    drone.vy = (drone.vy / spd) * maxSpeed;
  }

  // Battery drain: ~0.15% per tick (100% → 0% in ~667 ticks ≈ 11 min)
  drone.battery = clamp(drone.battery - 0.15, 0, 100);

  // Realistic small fluctuations
  drone.altitude = clamp(drone.altitude + (Math.random() - 0.5) * 3, 10, 250);
  drone.speed = clamp(spd * 2.5 + (Math.random() - 0.5), 0.5, 15); // derived from vx/vy
  drone.signal = clamp(drone.signal + (Math.random() - 0.5) * 2, 20, 100);

  return drone;
}

// ─────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────
const wss = new WebSocketServer({ port: 5000 });
console.log("Drone telemetry server listening on ws://localhost:5000");

wss.on("connection", (ws) => {
  console.log("Dashboard client connected");

  // Broadcast current drone states every 300ms (smoother than 1s for animation)
  const interval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;

    // Advance physics for all drones
    const payload = droneStates.map((drone) => {
      tickDrone(drone);
      return {
        id: drone.id,
        x: parseFloat(drone.x.toFixed(2)),
        y: parseFloat(drone.y.toFixed(2)),
        battery: parseFloat(drone.battery.toFixed(2)),
        altitude: parseFloat(drone.altitude.toFixed(1)),
        speed: parseFloat(drone.speed.toFixed(2)),
        signal: parseFloat(drone.signal.toFixed(1)),
        status: getStatus(drone.battery),
      };
    });

    ws.send(JSON.stringify(payload));
  }, 300);

  ws.on("close", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    clearInterval(interval);
  });
});

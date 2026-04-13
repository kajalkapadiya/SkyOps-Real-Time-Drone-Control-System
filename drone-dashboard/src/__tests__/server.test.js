// ─────────────────────────────────────────────────────────────────────────────
// HOW TO RUN THIS FILE:
//   npm test              → runs once and shows results
//   npm run test:watch    → re-runs every time you save a file
//
// Vitest automatically finds any file ending in .test.js anywhere in the project
// ─────────────────────────────────────────────────────────────────────────────

// ── IMPORTS ──────────────────────────────────────────────────────────────────
// We import 4 things from vitest (the testing tool):
//   describe  → groups related tests together, like a folder
//   it        → one single test case ("it should do X")
//   expect    → the actual check ("I expect this to equal that")
//   beforeEach → runs code BEFORE every single 'it' block inside a 'describe'
import { describe, it, expect, beforeEach } from "vitest";

// We import the real functions from server.js so we can test them.
// These are the functions marked with 'export' in server.js.
// We do NOT import the WebSocket server itself — we only test pure logic.
import { getStatus, isOutsideGeofence, tickDrone } from "../../server/server";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: makeDrone()
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS:
// Every test that uses a drone needs a fresh drone object.
// If we wrote the same object 10 times, that's 10 places to update if we add a field.
// Instead: one factory function. Call makeDrone() → get a clean drone every time.
function makeDrone(overrides = {}) {
  // 'overrides' lets each test customize only what it needs.
  // makeDrone()                    → default drone, battery 80, position center
  // makeDrone({ battery: 26 })     → same but battery is 26
  // makeDrone({ paused: true })    → same but paused
  return {
    id: 1,
    x: 250, // center of canvas (canvas is 500x500)
    y: 250, // center of canvas
    vx: 2, // moving right at speed 2
    vy: 2, // moving down at speed 2
    battery: 80, // healthy battery
    altitude: 100,
    speed: 3,
    signal: 90,
    paused: false,
    returnToBase: false,
    _wasOutside: false, // starts inside geofence
    baseX: 250, // home point is center
    baseY: 250,
    ...overrides, // spread: any key you pass replaces the default above
    // Example: makeDrone({ battery: 10 }) → everything above EXCEPT battery = 10
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 1: getStatus
// ─────────────────────────────────────────────────────────────────────────────
// getStatus(battery) → returns a string: "active", "warning", "critical", "offline"
// These tests check every battery level threshold.
// WHY TEST THIS: The UI colors, table badges, and alerts all depend on this function.
// If the threshold is wrong, drones show wrong status in the dashboard.
describe("getStatus", () => {
  // ── TEST 1 ──
  // it("description", () => { ... })
  // The description reads like a sentence: "getStatus — it returns active above 50"
  it("returns active when battery is above 50", () => {
    // expect(VALUE).toBe(EXPECTED)
    // .toBe uses === (strict equality). "active" === "active" → PASS
    expect(getStatus(80)).toBe("active");

    // One 'it' block can have multiple assertions.
    // ALL must pass for the test to pass.
    expect(getStatus(51)).toBe("active");
    expect(getStatus(100)).toBe("active");
  });

  // ── TEST 2 ──
  it("returns warning when battery is between 25 and 50", () => {
    expect(getStatus(49)).toBe("warning");
    expect(getStatus(25)).toBe("warning"); // 25 is exactly the edge — still warning
  });

  // ── TEST 3 ──
  // Edge case: what happens AT the boundary?
  // battery < 25 → critical. So 24.9 is critical, 25 is warning.
  it("returns critical when battery is below 25", () => {
    expect(getStatus(24)).toBe("critical");
    expect(getStatus(1)).toBe("critical");
    expect(getStatus(0.1)).toBe("critical");
  });

  // ── TEST 4 ──
  it("returns offline when battery is 0 or negative", () => {
    expect(getStatus(0)).toBe("offline");
    expect(getStatus(-1)).toBe("offline"); // shouldn't happen but handle it safely
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 2: isOutsideGeofence
// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE = { x: 50, y: 50, w: 400, h: 400 }
// Valid range: x from 50 to 450, y from 50 to 450
// Anything outside that box → drone has breached
describe("isOutsideGeofence", () => {
  // ── TEST 5 ──
  it("returns false when drone is clearly inside the fence", () => {
    // 250, 250 is the exact center — definitely inside
    expect(isOutsideGeofence(250, 250)).toBe(false);
  });

  // ── TEST 6 ──
  // Testing the edges carefully.
  // GEOFENCE.x is 50. x=51 is just inside. x=49 is just outside.
  it("returns false when drone is just inside each boundary edge", () => {
    expect(isOutsideGeofence(51, 250)).toBe(false); // just inside left edge
    expect(isOutsideGeofence(449, 250)).toBe(false); // just inside right edge
    expect(isOutsideGeofence(250, 51)).toBe(false); // just inside top edge
    expect(isOutsideGeofence(250, 449)).toBe(false); // just inside bottom edge
  });

  // ── TEST 7 ──
  it("returns true when drone is pass the left wall", () => {
    // fence starts at x=50. x=10 is clearly outside.
    expect(isOutsideGeofence(10, 250)).toBe(true);
  });

  // ── TEST 8 ──
  it("returns true when drone is pass the right wall", () => {
    // fence ends at x=50+400=450. x=490 is outside.
    expect(isOutsideGeofence(490, 250)).toBe(true);
  });

  // ── TEST 9 ──
  it("returns true when drone is pass the top wall", () => {
    expect(isOutsideGeofence(250, 10)).toBe(true);
  });

  // ── TEST 10 ──
  it("returns true when drone is pass the bottom wall", () => {
    expect(isOutsideGeofence(250, 490)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 3: tickDrone — movement
// ─────────────────────────────────────────────────────────────────────────────
// tickDrone(drone) mutates the drone object in place and returns an array of events.
// "mutates in place" means: it changes drone.x, drone.battery etc. directly.
// It doesn't return a new drone — it modifies the one you passed in.
describe("tickDrone — movement", () => {
  // beforeEach runs before EVERY it() in this describe block.
  // 'drone' is declared here (let, not const) so it can be reassigned in beforeEach.
  let drone;

  beforeEach(() => {
    // This runs before test 11, before test 12, before test 13... every single time.
    // Without this, test 11 might drain the battery and test 12 would start
    // with already-drained battery — wrong result. Each test must start clean.
    drone = makeDrone();
  });

  // ── TEST 11 ──
  it("moves the drone position each tick", () => {
    const startX = drone.x; // remember where it started: 250

    tickDrone(drone); // run one tick

    // After one tick, x should have changed.
    // .not.toBe() means "I expect this NOT to equal"
    expect(drone.x).not.toBe(startX);
  });

  // ── TEST 12 ──
  it("does not move when drone is paused", () => {
    drone = makeDrone({ paused: true }); // override paused to true
    const startX = drone.x;
    const startY = drone.y;

    tickDrone(drone);

    // Paused drone should not move at all
    expect(drone.x).toBe(startX);
    expect(drone.y).toBe(startY);
  });

  // ── TEST 13 ──
  it("does not move when battery is dead", () => {
    drone = makeDrone({ battery: 0 });
    const startX = drone.x;

    tickDrone(drone);

    expect(drone.x).toBe(startX); // stayed put
  });

  // ── TEST 14 ──
  it("clamps drone position inside canvas walls", () => {
    // Place drone near the right edge, moving fast right
    // vx=10 would push x to 490+10=500 without clamping
    drone = makeDrone({ x: 488, y: 250, vx: 10, vy: 0 });

    tickDrone(drone);

    // Should be clamped to max 490 (CANVAS - 10 = 500 - 10)
    expect(drone.x).toBeLessThanOrEqual(490);
    expect(drone.x).toBeGreaterThanOrEqual(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 4: tickDrone — battery
// ─────────────────────────────────────────────────────────────────────────────
describe("tickDrone — battery", () => {
  let drone;

  beforeEach(() => {
    drone = makeDrone();
  });

  // ── TEST 15 ──
  it("drains battery by approximately 0.12 each tick", () => {
    const before = drone.battery; // 80

    tickDrone(drone);

    // battery should now be less than before
    expect(drone.battery).toBeLessThan(before);

    // toBeCloseTo(number, decimalPlaces) — checks approximate equality
    // Useful because floating point math: 80 - 0.12 might be 79.880000000001
    // toBeCloseTo with 1 decimal place accepts anything in range 79.82 to 79.92
    expect(drone.battery).toBeCloseTo(before - 0.12, 1);
  });

  // ── TEST 16 ──
  it("battery never goes below 0", () => {
    drone = makeDrone({ battery: 0.05 }); // almost dead

    tickDrone(drone); // 0.05 - 0.12 = -0.07 WITHOUT clamp

    // clamp(0.05 - 0.12, 0, 100) = clamp(-0.07, 0, 100) = 0
    expect(drone.battery).toBeGreaterThanOrEqual(0);
  });

  // ── TEST 17 ──
  // When battery crosses FROM above 50 TO below 50 — emit one warning event.
  // This tests the threshold crossing logic specifically.
  it("emits a warning event when battery drops below 50%", () => {
    drone = makeDrone({ battery: 50.05 }); // just above threshold

    // tickDrone RETURNS an array of events that happened this tick
    const events = tickDrone(drone);

    // .some() returns true if AT LEAST ONE item in the array passes the condition
    // We're checking: does any event have type === "warning"?
    const hasWarning = events.some((e) => e.type === "warning");
    expect(hasWarning).toBe(true);
  });

  // ── TEST 18 ──
  it("emits a critical event when battery drops below 25%", () => {
    drone = makeDrone({ battery: 25.05 }); // just above critical threshold

    const events = tickDrone(drone);

    const hasCritical = events.some((e) => e.type === "critical");
    expect(hasCritical).toBe(true);
  });

  // ── TEST 19 ──
  // NEGATIVE TEST: confirm NO event fires when nowhere near a threshold.
  // Just as important as positive tests — you don't want false alarms.
  it("does not emit battery events when battery is far from thresholds", () => {
    drone = makeDrone({ battery: 80 }); // comfortably active

    const events = tickDrone(drone);

    // .filter() returns only events matching the condition
    const batteryEvents = events.filter(
      (e) => e.type === "warning" || e.type === "critical",
    );

    // toHaveLength(0) means the array is empty — no battery events fired
    expect(batteryEvents).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 5: tickDrone — geofence
// ─────────────────────────────────────────────────────────────────────────────
describe("tickDrone — geofence enforcement", () => {
  // ── TEST 20 ──
  // This is the most important safety test in the whole file.
  // When a drone crosses the fence, returnToBase MUST be set to true.
  it("auto-triggers RTB when drone crosses geofence boundary", () => {
    // Drone is just inside the left fence wall (fence starts at x=50)
    // vx=-10 will push it to x = 52 + (-10) = 42 → outside fence (x < 50)
    const drone = makeDrone({
      x: 52,
      y: 250,
      vx: -10,
      vy: 0,
      returnToBase: false,
      _wasOutside: false,
    });

    tickDrone(drone);

    // Core safety assertion: returnToBase must be true now
    expect(drone.returnToBase).toBe(true);
  });

  // ── TEST 21 ──
  it("emits a geofence event when drone first crosses boundary", () => {
    const drone = makeDrone({
      x: 52,
      y: 250,
      vx: -10,
      vy: 0,
      _wasOutside: false,
    });

    const events = tickDrone(drone);

    const hasGeofenceEvent = events.some((e) => e.type === "geofence");
    expect(hasGeofenceEvent).toBe(true);
  });

  // ── TEST 22 ──
  // This tests event de-duplication — we must NOT spam geofence events.
  // The event should fire ONCE (when _wasOutside flips from false to true).
  // If drone is already outside, no new event this tick.
  it("does not emit a second geofence event if drone was already outside", () => {
    const drone = makeDrone({
      x: 10, // already outside (fence starts at x=50)
      y: 250,
      vx: -1,
      vy: 0,
      _wasOutside: true, // KEY: already flagged as outside from a previous tick
    });

    const events = tickDrone(drone);

    const geofenceEvents = events.filter((e) => e.type === "geofence");
    expect(geofenceEvents).toHaveLength(0); // no new event — already knew it was outside
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 6: tickDrone — return to base
// ─────────────────────────────────────────────────────────────────────────────
describe("tickDrone — return to base", () => {
  // ── TEST 23 ──
  it("steers drone toward base when RTB is active", () => {
    // Drone is in top-left area, base is at center (250, 250)
    const drone = makeDrone({
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      returnToBase: true,
      baseX: 250,
      baseY: 250,
    });

    tickDrone(drone);

    // Drone should have moved closer to base (250,250) — so x and y both increased
    expect(drone.x).toBeGreaterThan(100);
    expect(drone.y).toBeGreaterThan(100);
  });

  // ── TEST 24 ──
  it("clears returnToBase flag when drone arrives at home", () => {
    // Place drone very close to base — within 10 units
    // dist = sqrt((252-250)² + (252-250)²) = sqrt(8) ≈ 2.8 → less than 10
    // tickDrone code: if (dist < 10) drone.returnToBase = false
    const drone = makeDrone({
      x: 252,
      y: 252,
      returnToBase: true,
      baseX: 250,
      baseY: 250,
    });

    tickDrone(drone);

    expect(drone.returnToBase).toBe(false); // mission complete — flag cleared
  });

  // ── TEST 25 ──
  it("emits a command event when drone reaches base", () => {
    const drone = makeDrone({
      x: 252,
      y: 252,
      returnToBase: true,
      baseX: 250,
      baseY: 250,
    });

    const events = tickDrone(drone);

    // .find() returns the first matching item, or undefined if nothing matches
    // We check: is there a "command" event whose message contains "reached base"?
    const arrivedEvent = events.find(
      (e) => e.type === "command" && e.message.includes("reached base"),
    );

    // toBeDefined() passes if the value is NOT undefined — meaning find() found it
    expect(arrivedEvent).toBeDefined();
  });
});

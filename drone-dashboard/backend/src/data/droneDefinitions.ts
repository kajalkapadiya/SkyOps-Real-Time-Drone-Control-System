export const droneDefinitions = {
  "Search & Rescue": {
    model: "Matrice 350 RTK",
    manufacturer: "DJI",
    payload: ["Thermal Camera", "Spotlight"],
    maxFlightTime: 55,
    maxSpeed: 23,
  },

  "Border Patrol": {
    model: "Matrice 350 RTK",
    manufacturer: "DJI",
    payload: ["Night Vision", "Zoom Camera"],
    maxFlightTime: 55,
    maxSpeed: 23,
  },

  "Infrastructure Inspection": {
    model: "Matrice 350 RTK",
    manufacturer: "DJI",
    payload: ["High Resolution Camera", "LiDAR"],
    maxFlightTime: 45,
    maxSpeed: 20,
  },

  "Medical Delivery": {
    model: "Delivery Drone",
    manufacturer: "Custom",
    payload: ["Cargo Box", "Weight Sensor"],
    maxFlightTime: 40,
    maxSpeed: 18,
  },
};

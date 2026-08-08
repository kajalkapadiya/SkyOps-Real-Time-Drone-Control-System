import { Fleet } from "../models/fleets.js";

export const fleetDefinitions: Fleet[] = [
  {
    id: "fleet-001",
    name: "Northern Search & Rescue",
    type: "Search & Rescue",
    baseLocation: "Hamburg",
    description: "Emergency response missions",
  },

  {
    id: "fleet-002",
    name: "Border Surveillance Unit",
    type: "Border Patrol",
    baseLocation: "Frankfurt",
    description: "Border monitoring operations",
  },

  {
    id: "fleet-003",
    name: "Grid Infrastructure Inspection",
    type: "Infrastructure Inspection",
    baseLocation: "Munich",
    description: "Inspection of bridges and power infrastructure",
  },

  {
    id: "fleet-004",
    name: "Urban Medical Delivery",
    type: "Medical Delivery",
    baseLocation: "Berlin",
    description: "Emergency medical supply transport",
  },
];

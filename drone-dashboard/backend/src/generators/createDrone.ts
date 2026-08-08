import { Drone } from "../models/Drone.js";

export function createDrone(
  id: string,
  fleetId: string,
  model: string,
  manufacturer: string,
  payload: string[],
  maxFlightTime: number,
  maxSpeed: number,
): Drone {
  return {
    id,
    fleetId,
    model,
    manufacturer,
    payload,
    maxFlightTime,
    maxSpeed,
  };
}

import { Fleet } from "../models/fleets.js";

export function createFleet(
  id: string,
  name: string,
  type: Fleet["type"],
  baseLocation: string,
  description: string,
): Fleet {
  return {
    id,
    name,
    type,
    baseLocation,
    description,
  };
}

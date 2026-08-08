export interface Drone {
  id: string;
  fleetId: string;
  model: string;
  manufacturer: string;
  payload: string[];
  maxFlightTime: number;
  maxSpeed: number;
}

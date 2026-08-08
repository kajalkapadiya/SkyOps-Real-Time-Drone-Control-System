export interface Telemetry {
  droneId: string;
  timestamp: string; // we are using timestamp for replay

  latitude: number;
  longitude: number;

  altitude: number; //treat this as meters.
  speed: number; // meters per second

  battery: number; // in percentage
  signal: number;
}

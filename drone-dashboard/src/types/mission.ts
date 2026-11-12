export interface DroneTelemetry {
  droneId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  battery: number;
  signal: number;
}

export interface MissionFrame {
  timestamp: string;
  drones: DroneTelemetry[];
}

// {
//     "droneId": "DRN-0001",
//     "timestamp": "2026-08-26T12:32:56.940Z",
//     "latitude": 52.51178850790867,
//     "longitude": 13.418066666666666,
//     "altitude": 63.57701581732593,
//     "speed": 11.874563978983783,
//     "battery": 83.66666666666667,
//     "signal": 88.75655056417571
// }

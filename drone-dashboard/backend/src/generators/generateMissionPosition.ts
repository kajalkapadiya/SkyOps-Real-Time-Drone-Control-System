// It answers one question:

// Where should this drone be at this moment in the mission?

// It receives:

// Fleet type
// +
// Mission progress
// +
// Drone number

// and returns:

// latitude
// longitude

export interface Position {
  latitude: number;
  longitude: number;
}

export function generateMissionPosition(
  fleetType: string,
  progress: number,
  droneIndex: number,
): Position {
  const baseLatitude = 52.52;
  const baseLongitude = 13.405;

  const offset = droneIndex * 0.002;

  switch (fleetType) {
    case "Search & Rescue":
      return {
        latitude:
          baseLatitude + offset + Math.sin(progress * Math.PI * 2) * 0.01,

        longitude: baseLongitude + offset + progress * 0.02,
      };

    case "Border Patrol":
      return {
        latitude: baseLatitude + offset + progress * 0.015,

        longitude:
          baseLongitude + offset + Math.sin(progress * Math.PI * 4) * 0.01,
      };

    case "Infrastructure Inspection":
      return {
        latitude: baseLatitude + offset + progress * 0.02,

        longitude:
          baseLongitude + offset + Math.sin(progress * Math.PI * 6) * 0.005,
      };

    case "Medical Delivery":
      return {
        latitude: baseLatitude + offset + progress * 0.025,

        longitude: baseLongitude + offset + progress * 0.015,
      };

    default:
      return {
        latitude: baseLatitude + offset,
        longitude: baseLongitude + offset,
      };
  }
}

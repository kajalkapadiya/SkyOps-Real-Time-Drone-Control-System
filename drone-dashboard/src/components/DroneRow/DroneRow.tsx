import type { DroneTelemetry } from "../../types/mission";

interface DroneRowProps {
  drone: DroneTelemetry;
}

export function DroneRow({ drone }: DroneRowProps) {
  return (
    <div>
      <span>{drone.id}</span>
      <span>{drone.battery}%</span>
      <span>{drone.altitude} m</span>
      <span>{drone.speed} m/s</span>
    </div>
  );
}

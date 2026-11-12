import type { MissionFrame } from "../../types/mission";
import { DroneRow } from "../DroneRow/DroneRow";

interface FrameInfoProps {
  frame: MissionFrame | null;
}

export function FrameInfo({ frame }: FrameInfoProps) {
  if (!frame) {
    return <p>No mission data received.</p>;
  }

  return (
    <section>
      <p>Timestamp: {frame.timestamp}</p>

      <p>Drones: {frame.drones.length}</p>
      <div>
        {frame.drones.map((drone) => (
          <DroneRow key={drone.id} drone={drone} />
        ))}
      </div>
    </section>
  );
}

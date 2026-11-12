import type { DroneTelemetry } from "../../types/mission";
import "./DroneDetails.css";

interface DroneDetailsProps {
  drone: DroneTelemetry | null;
}

export function DroneDetails({ drone }: DroneDetailsProps) {
  console.log("Rendering DroneDetails with drone:", drone?.droneId);
  if (!drone) {
    return (
      <section className="drone-details drone-details--empty">
        <span>Select a drone to view telemetry</span>
      </section>
    );
  }

  return (
    <section className="drone-details">
      <div className="drone-details__header">
        <div>
          <span className="drone-details__label">Selected drone</span>
          <h2>{drone.droneId}</h2>
        </div>

        <span
          className={`drone-details__status ${
            drone.battery < 25
              ? "drone-details__status--critical"
              : drone.battery < 50
                ? "drone-details__status--warning"
                : "drone-details__status--active"
          }`}
        >
          {drone.battery < 25
            ? "Critical"
            : drone.battery < 50
              ? "Warning"
              : "Active"}
        </span>
      </div>

      <div className="drone-details__grid">
        <TelemetryItem label="Battery" value={`${drone.battery.toFixed(0)}%`} />

        <TelemetryItem label="Signal" value={`${drone.signal.toFixed(0)}%`} />

        <TelemetryItem
          label="Altitude"
          value={`${drone.altitude.toFixed(0)} m`}
        />

        <TelemetryItem label="Speed" value={`${drone.speed.toFixed(1)} m/s`} />

        <TelemetryItem label="Latitude" value={drone.latitude.toFixed(5)} />

        <TelemetryItem label="Longitude" value={drone.longitude.toFixed(5)} />
      </div>
    </section>
  );
}

interface TelemetryItemProps {
  label: string;
  value: string;
}

function TelemetryItem({ label, value }: TelemetryItemProps) {
  return (
    <div className="telemetry-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

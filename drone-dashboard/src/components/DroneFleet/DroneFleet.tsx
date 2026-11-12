import type { DroneTelemetry } from "../../types/mission";
import "./DroneFleet.css";

interface DroneFleetProps {
  drones: DroneTelemetry[];
  selectedDroneId: string | null;
  onSelectDrone: (droneId: string) => void;
}

export function DroneFleet({
  drones,
  selectedDroneId,
  onSelectDrone,
}: DroneFleetProps) {
  console.log("Selected drone ID:", selectedDroneId);

  return (
    <section className="drone-fleet">
      <div className="drone-fleet__header">
        <div>
          <h2>Fleet</h2>
          <span>{drones.length} drones</span>
        </div>

        <span className="fleet-status">
          <span className="fleet-status__dot" />
          Live
        </span>
      </div>

      <div className="drone-fleet__list">
        {drones.map((drone) => (
          <button
            key={drone.droneId}
            className={`drone-card ${
              selectedDroneId === drone.droneId ? "drone-card--selected" : ""
            }`}
            onClick={() => onSelectDrone(drone.droneId)}
          >
            <div className="drone-card__top">
              <div className="drone-card__name">
                <span
                  className={`drone-status ${
                    drone.battery < 25
                      ? "drone-status--critical"
                      : drone.battery < 50
                        ? "drone-status--warning"
                        : "drone-status--active"
                  }`}
                />

                <strong>{drone.droneId}</strong>
              </div>

              <span className="drone-battery">{drone.battery.toFixed(0)}%</span>
            </div>

            <div className="drone-card__metrics">
              <span>
                Alt <strong>{drone.altitude.toFixed(0)} m</strong>
              </span>

              <span>
                Speed <strong>{drone.speed.toFixed(1)} m/s</strong>
              </span>

              <span>
                Signal <strong>{drone.signal.toFixed(0)}%</strong>
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

import { CircleMarker, Popup } from "react-leaflet";

import type { DroneTelemetry } from "../../types/mission";

import "./DroneMarker.css";

interface DroneMarkerProps {
  drone: DroneTelemetry;
  selected: boolean;
  onSelect: (droneId: string) => void;
}

function getDroneStatus(battery: number) {
  if (battery < 25) {
    return "critical";
  }

  if (battery < 50) {
    return "warning";
  }

  return "active";
}

export function DroneMarker({ drone, selected, onSelect }: DroneMarkerProps) {
  const status = getDroneStatus(drone.battery);

  return (
    <CircleMarker
      center={[drone.latitude, drone.longitude]}
      radius={selected ? 9 : 6}
      pathOptions={{
        className: `drone-marker drone-marker--${status}`,
      }}
      eventHandlers={{
        click: () => onSelect(drone.id),
      }}
    >
      <Popup>
        <strong>{drone.id}</strong>
        <br />
        Status: {status}
        <br />
        Battery: {drone.battery.toFixed(0)}%
        <br />
        Signal: {drone.signal.toFixed(0)}%
        <br />
        Altitude: {drone.altitude.toFixed(0)} m
        <br />
        Speed: {drone.speed.toFixed(1)} m/s
      </Popup>
    </CircleMarker>
  );
}

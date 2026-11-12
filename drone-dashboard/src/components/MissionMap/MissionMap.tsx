import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import { useEffect, useRef } from "react";

import type { DroneTelemetry } from "../../types/mission";

import "leaflet/dist/leaflet.css";
import "./MissionMap.css";
import { DroneMarker } from "../DroneMarker/DroneMarket";

interface MissionMapProps {
  drones: DroneTelemetry[];
  selectedDroneId: string | null;
  onSelectDrone: (droneId: string) => void;
}

function MapBounds({ drones }: { drones: DroneTelemetry[] }) {
  const map = useMap();

  const hasFittedBounds = useRef(false);

  useEffect(() => {
    if (drones.length === 0) {
      return;
    }

    if (hasFittedBounds.current) {
      return;
    }

    const bounds = drones.map(
      (drone) => [drone.latitude, drone.longitude] as [number, number],
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
    });

    hasFittedBounds.current = true;
  }, [drones, map]);

  return null;
}

export function MissionMap({
  drones,
  selectedDroneId,
  onSelectDrone,
}: MissionMapProps) {
  const firstDrone = drones[0];

  const center: [number, number] = firstDrone
    ? [firstDrone.latitude, firstDrone.longitude]
    : [52.52, 13.405];

  return (
    <section className="mission-map">
      <MapContainer
        center={center}
        zoom={11}
        className="mission-map__container"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds drones={drones} />

        {drones.map((drone) => (
          <DroneMarker
            key={drone.id}
            drone={drone}
            selected={drone.id === selectedDroneId}
            onSelect={onSelectDrone}
          />
        ))}
      </MapContainer>
    </section>
  );
}

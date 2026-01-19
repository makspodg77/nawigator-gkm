import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useTrip } from "../../contexts/tripContext";
import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./map.module.css";

function MapClickHandler() {
  const { setStart, setEnd } = useTrip();
  const map = useMap();
  const [clickedPosition, setClickedPosition] = useState<{
    lat: number;
    lon: number;
    x: number;
    y: number;
  } | null>(null);

  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      const point = map.latLngToContainerPoint(e.latlng);
      setClickedPosition({ lat, lon: lng, x: point.x, y: point.y });
    },
  });

  if (!clickedPosition) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: clickedPosition.x,
        top: clickedPosition.y,
        zIndex: 1000,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setStart(clickedPosition, { type: "map" });
            setClickedPosition(null);
          }}
        >
          Set as Start
        </button>
        <button
          onClick={() => {
            setEnd(clickedPosition, { type: "map" });
            setClickedPosition(null);
          }}
        >
          Set as End
        </button>
      </div>
    </div>
  );
}

const Map = ({ children }: { children?: ReactNode }) => {
  const { start, end } = useTrip();
  return (
    <>
      {children}
      <MapContainer
        className={styles.map}
        center={[53.56723325286705, 14.947863020172536]}
        zoom={11}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        {start ? <Marker position={{ lat: start.lat, lng: start.lon }} /> : ""}
        {end ? <Marker position={{ lat: end.lat, lng: end.lon }} /> : ""}
        <MapClickHandler />
      </MapContainer>
    </>
  );
};

export default Map;

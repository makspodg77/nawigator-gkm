import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { useTrip } from "../../contexts/tripContext";
import type { ReactNode } from "react";
import styles from "./map.module.css";
import "leaflet/dist/leaflet.css";
import MapRoutePainter from "./mapRoutePainter";
import MapClickHandler from "./mapClickHandler";

const GOLENIOW_COUNTY_CENTER: [number, number] = [
  53.56723325286705, 14.947863020172536,
] as const;

const Map = ({ children }: { children?: ReactNode }) => {
  const { start, end } = useTrip();

  return (
    <>
      {children}
      <MapContainer
        className={styles.map}
        center={GOLENIOW_COUNTY_CENTER}
        zoom={11}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        {start && (
          <Marker key="start" position={{ lat: start.lat, lng: start.lon }} />
        )}
        {end && <Marker key="end" position={{ lat: end.lat, lng: end.lon }} />}
        <MapRoutePainter />
        <MapClickHandler />
      </MapContainer>
    </>
  );
};

export default Map;

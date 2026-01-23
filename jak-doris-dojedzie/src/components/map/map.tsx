import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useTrip } from "../../contexts/tripContext";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import styles from "./map.module.css";
import "leaflet/dist/leaflet.css";
import { useRoutes } from "../../contexts/routeContext";
import L from "leaflet";
import { useHoveredRoute } from "../../contexts/hoveredRouteContext";

const darkenColor = (hex: string, percent: number) => {
  if (!hex) return "#000000";
  let color = hex.replace(/^#/, "");

  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const num = parseInt(color, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;

  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
};
function MapClickHandler() {
  const { setStart, start, setEnd, end } = useTrip();
  const map = useMap();
  const { routes } = useRoutes();
  const { hovered } = useHoveredRoute();

  const [clickedPosition, setClickedPosition] = useState<{
    lat: number;
    lon: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!map || !routes) return;

    const pathGroup = L.layerGroup().addTo(map);

    routes.forEach((route) => {
      let firstTransit = true;
      let lastLatLon: L.LatLngExpression | undefined = null;
      route.segments.forEach((segment) => {
        if (segment.type === "transit" && segment.geometryPoints) {
          const latLons = segment.geometryPoints.map(
            (gp) => [gp.lat, gp.lon] as L.LatLngExpression,
          );
          lastLatLon = latLons.at(-1);
          if (start && firstTransit) {
            new L.Polyline([latLons[0], [start?.lat, start?.lon]], {
              color: "#555555",
              weight: 4,
              opacity: route.key === hovered ? 0.8 : 0.02,
              dashArray: "10, 10",
            }).addTo(pathGroup);
            firstTransit = false;
          }

          new L.Polyline(latLons, {
            color: darkenColor(segment.lineColor, 25),
            weight: 6,
            opacity: route.key === hovered ? 0.8 : 0.02,
            lineJoin: "round",
            lineCap: "round",
          }).addTo(pathGroup);

          new L.Polyline(latLons, {
            color: segment.lineColor,
            weight: 5,
            opacity: route.key === hovered ? 1 : 0.05,
            lineJoin: "round",
            lineCap: "round",
          }).addTo(pathGroup);
        }
      });
      if (lastLatLon && end) {
        new L.Polyline([lastLatLon, [end?.lat, end?.lon]], {
          color: "#555555",
          weight: 4,
          opacity: route.key === hovered ? 0.8 : 0.02,
          dashArray: "10, 10",
        }).addTo(pathGroup);
      }
    });

    return () => {
      map.removeLayer(pathGroup);
    };
  }, [routes, map, hovered]);
  useEffect(() => {
    if (clickedPosition) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
    }
  }, [clickedPosition, map]);

  useMapEvents({
    click: (e) => {
      if (!clickedPosition) {
        const { lat, lng } = e.latlng;
        const point = map.latLngToContainerPoint(e.latlng);
        setClickedPosition({ lat, lon: lng, x: point.x, y: point.y });
      }
    },
  });

  if (!clickedPosition) return null;

  return (
    <div
      className={styles.buttonsContainer}
      onClick={(e) => {
        e.stopPropagation();
        setClickedPosition(null);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          position: "absolute",
          left: clickedPosition.x,
          top: clickedPosition.y,
          transform: "translate(-50%, -100%)",
        }}
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
          url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
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

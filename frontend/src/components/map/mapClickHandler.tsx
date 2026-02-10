import { useMap, useMapEvents } from "react-leaflet";
import MapSelector, { type ClickedPosition } from "../mapSelector/mapSelector";
import { useEffect, useState } from "react";

const MapClickHandler = () => {
  const map = useMap();
  const [clickedPosition, setClickedPosition] =
    useState<ClickedPosition | null>(null);

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
        setClickedPosition({
          lat,
          lon: lng,
          x: point.x,
          y: point.y,
        });
      }
    },
  });

  if (!clickedPosition) return null;

  return (
    <MapSelector
      clickedPosition={clickedPosition}
      setClickedPosition={setClickedPosition}
    />
  );
};

export default MapClickHandler;

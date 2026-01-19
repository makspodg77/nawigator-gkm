import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { StopsContext, type StopGroup } from "./contexts/stopContext";
import { TimeProvider } from "./contexts/timeContext";

function MapClickHandler({
  onLocationClick,
}: {
  onLocationClick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationClick(lat, lng);
    },
  });

  return null;
}

const formatTime = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();

  return h * 60 + m;
};

function App() {
  const [initialized, setInitialized] = useState(false);
  const [stops, setStops] = useState<StopGroup[]>([]);
  const initialTime = useMemo(() => formatTime(new Date()), []);

  useEffect(() => {
    const initialize = async () => {
      await fetch("http://localhost:2137/initialize", {
        method: "POST",
      }).then((response) => {
        if (response.ok) {
          setInitialized(true);
        }
      });
    };

    initialize();
  }, []);

  useEffect(() => {
    const getStops = async () => {
      await fetch("http://localhost:2137/stops").then(async (response) => {
        const data = await response.json();
        if (data) {
          setStops(data);
        }
      });
    };

    if (initialized) getStops();
  }, [initialized]);

  useEffect(() => {
    const getRoute = async () => {
      const response = await fetch("http://localhost:2137/csa-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat1: 14.773679894104593,
          lon1: 53.46201924878469,
          lat2: 14.818750752236157,
          lon2: 53.564039679676135,
          startTime: 500,
          endTime: 620,
        }),
      });

      const data = await response.json();
      console.log(data);
    };
  }, []);

  return (
    <TimeProvider initialTime={initialTime}>
      <StopsContext value={stops}>
        <MapContainer
          center={[53.56723325286705, 14.947863020172536]}
          zoom={11}
          style={{ height: "100vh", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
        </MapContainer>
      </StopsContext>
    </TimeProvider>
  );
}

export default App;

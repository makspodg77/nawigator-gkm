import { useEffect, useState } from "react";
import "./App.css";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

function App() {
  const [routes, setRoutes] = useState([]);
  const [route, setRoute] = useState([]);
  const [geometryToMap, setGeometryToMap] = useState();
  const [originCoords, setOriginCoords] = useState();
  const [destinationCoords, setDestinationCoords] = useState();

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
    <>
      <MapContainer
        center={[53.56380862022675, 14.828390433293993]}
        zoom={13}
        style={{ height: "100vh", width: "100%", display: "block" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapClickHandler
          onLocationClick={(lat, lon) => console.log(lat, lon)}
        />
      </MapContainer>
    </>
  );
}

export default App;

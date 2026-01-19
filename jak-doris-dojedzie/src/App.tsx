import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { StopsContext, type StopGroup } from "./contexts/stopContext";
import { TimeProvider } from "./contexts/timeContext";
import { TripProvider } from "./contexts/tripContext";
import Main from "./pages/main";

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

  return (
    <TimeProvider initialTime={initialTime}>
      <TripProvider>
        <StopsContext value={stops}>
          <Main />
        </StopsContext>
      </TripProvider>
    </TimeProvider>
  );
}

export default App;

import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { StopsContext, type StopGroup } from "./contexts/stopContext";
import { TimeProvider } from "./contexts/timeContext";
import { TripProvider } from "./contexts/tripContext";
import Main from "./pages/main";
import { SearchProvider } from "./contexts/searchbarContex";
import { MenuProvider } from "./contexts/menuContext";
import { timeStringToMinutes } from "./components/clock/clock";
import { RoutesProvider } from "./contexts/routeContext";

function App() {
  const [stops, setStops] = useState<StopGroup[]>([]);

  const initialTime = useMemo(
    () =>
      timeStringToMinutes(
        [new Date().getHours(), new Date().getMinutes()].join(":"),
      ),
    [],
  );

  useEffect(() => {
    const initialize = async () => {
      try {
        const initResponse = await fetch("http://localhost:2137/initialize", {
          method: "POST",
        });

        if (!initResponse.ok) {
          throw new Error("Initialization failed");
        }

        const stopsResponse = await fetch("http://localhost:2137/stops");
        const data = await stopsResponse.json();

        setStops(data);
      } catch (error) {
        console.error("Failed to initialize:", error);
      }
    };

    initialize();
  }, []);

  return (
    <MenuProvider>
      <TimeProvider initialTime={initialTime}>
        <TripProvider>
          <RoutesProvider>
            <SearchProvider>
              <StopsContext value={stops}>
                <Main />
              </StopsContext>
            </SearchProvider>
          </RoutesProvider>
        </TripProvider>
      </TimeProvider>
    </MenuProvider>
  );
}

export default App;

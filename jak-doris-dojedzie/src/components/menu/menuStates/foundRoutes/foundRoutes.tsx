import { useEffect } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";
import RouteOption from "../../../routeOption/routeOption";
import { useMenu } from "../../../../contexts/menuContext";
import { useTime } from "../../../../contexts/timeContext";

const FoundRoutesMenuState = () => {
  const { startSource, endSource } = useTrip();
  const { fetchRoutes, routes, isLoading, error } = useRoutes();
  const { setMenu } = useMenu();
  const { getNewLowerBound, getNewUpperBound, startTime, endTime } = useTime();

  useEffect(() => {
    fetchRoutes(true);
  }, [startTime, endTime, fetchRoutes]);

  useEffect(() => {
    if (!isLoading && !routes && error) {
      setMenu("ERROR");
    }
  }, [isLoading, routes, error, setMenu]);

  return (
    <>
      <button onClick={() => setMenu("INITIAL")}>back</button>
      <h3>{getDisplayValue(startSource)}</h3>
      <h3>{getDisplayValue(endSource)}</h3>
      <button onClick={getNewLowerBound}>szukaj przed..</button>
      {isLoading ? (
        <p>Loading routes...</p>
      ) : routes && routes.length > 0 ? (
        routes.map((route) => <RouteOption key={route.key} route={route} />)
      ) : (
        <p>No routes found</p>
      )}
      <button onClick={getNewUpperBound}>szukaj po..</button>
    </>
  );
};

export default FoundRoutesMenuState;

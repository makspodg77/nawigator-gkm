import { useEffect } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";
import RouteOption from "../../../routeOption/routeOption";
import { useMenu } from "../../../../contexts/menuContext";

const FoundRoutesMenuState = () => {
  const { startSource, endSource } = useTrip();
  const { fetchRoutes, routes, isLoading, error } = useRoutes();
  const { setMenu } = useMenu();

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

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
      {isLoading ? (
        <p>Loading routes...</p>
      ) : routes && routes.length > 0 ? (
        routes.map((route) => <RouteOption key={route.key} route={route} />)
      ) : (
        <p>No routes found</p>
      )}
    </>
  );
};

export default FoundRoutesMenuState;

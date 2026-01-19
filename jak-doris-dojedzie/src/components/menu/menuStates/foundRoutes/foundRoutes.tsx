import { useEffect } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";
import RouteOption from "../../../routeOption/routeOption";

const FoundRoutesMenuState = () => {
  const { startSource, endSource } = useTrip();
  const { fetchRoutes, routes, isLoading } = useRoutes();

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return (
    <>
      <h3>{getDisplayValue(startSource)}</h3>
      <h3>{getDisplayValue(endSource)}</h3>
      {isLoading
        ? "laduje sie kurwa"
        : routes?.map((route) => <RouteOption route={route} />)}
    </>
  );
};

export default FoundRoutesMenuState;

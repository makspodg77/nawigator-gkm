import { useEffect } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";
import RouteOption from "../../../routeOption/routeOption";
import { useMenu } from "../../../../contexts/menuContext";

const FoundRoutesMenuState = () => {
  const { startSource, endSource } = useTrip();
  const { fetchRoutes, routes, isLoading } = useRoutes();
  const { setMenu } = useMenu();
  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return (
    <>
      <button onClick={() => setMenu(1)}>back</button>
      <h3>{getDisplayValue(startSource)}</h3>
      <h3>{getDisplayValue(endSource)}</h3>
      {isLoading
        ? "laduje sie kurwa"
        : routes?.map((route) => <RouteOption route={route} />)}
    </>
  );
};

export default FoundRoutesMenuState;

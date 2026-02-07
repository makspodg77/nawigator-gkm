import { useEffect } from "react";
import { useTrip, type LocationSource } from "../../../../contexts/tripContext";
import StopList from "../../../stopList/stopList";
import { useRoutes } from "../../../../contexts/routeContext";
import { useMenu } from "../../../../contexts/menuContext";
import menuStyles from "../../menu.module.css";
import { VscArrowRight } from "react-icons/vsc";
import SearchBarSection from "./searchbars";
import { useSearchBarLogic } from "../../../../hooks/useSearchBarLogic";
import { useTime } from "../../../../contexts/timeContext";

// eslint-disable-next-line react-refresh/only-export-components
export const getDisplayValue = (source: LocationSource) => {
  return source.type === "none" ? "" : source.name || "";
};

const InitialMenuState = () => {
  const {
    resetEnd,
    resetStart,
    start,
    end,
    startSource,
    endSource,
    setStart,
    setEnd,
  } = useTrip();
  const { setMenu } = useMenu();
  const { resetRoutes } = useRoutes();
  const { resetTime } = useTime();

  const searchLogic = useSearchBarLogic();
  const { isFromFocused, isToFocused, valueFrom, valueTo, tripReady } =
    searchLogic;

  const anyFocused = isFromFocused || isToFocused;

  useEffect(() => {
    resetRoutes();
    resetTime();
  }, [resetRoutes, resetTime]);

  const swapValues = () => {
    if (!end || !start) return;
    setStart(end, endSource);
    setEnd(start, startSource);
  };

  return (
    <>
      <SearchBarSection
        {...searchLogic}
        onSwap={swapValues}
        resetStart={resetStart}
        resetEnd={resetEnd}
      />

      {isFromFocused && (
        <StopList value={valueFrom} onClick={searchLogic.handleFromSelect} />
      )}

      {isToFocused && (
        <StopList value={valueTo} onClick={searchLogic.handleToSelect} />
      )}

      {!anyFocused && tripReady && (
        <button
          className={menuStyles.searchButton}
          onClick={() => setMenu("FOUND_ROUTES")}
        >
          Pokaż trasy
          <VscArrowRight />
        </button>
      )}
    </>
  );
};

export default InitialMenuState;

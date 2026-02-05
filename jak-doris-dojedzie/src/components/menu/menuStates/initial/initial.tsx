import { useEffect, useRef } from "react";
import { useSearchbars } from "../../../../contexts/searchbarContex";
import { useTrip, type LocationSource } from "../../../../contexts/tripContext";
import Clock from "../../../clock/clock";
import Searchbar from "../../../searchbar/searchbar";
import StopList from "../../../stopList/stopList";
import { useRoutes, type Coordinates } from "../../../../contexts/routeContext";
import { useMenu } from "../../../../contexts/menuContext";
import { useTime } from "../../../../contexts/timeContext";
import menuStyles from "../../menu.module.css";
import { VscArrowLeft } from "react-icons/vsc";
import { VscArrowRight } from "react-icons/vsc";

// eslint-disable-next-line react-refresh/only-export-components
export const getDisplayValue = (source: LocationSource) => {
  if (source.type === "none") return "";
  if (source.type === "map") return "Punkt z mapy";
  if (source.type === "stop") return source.name;
  return "";
};

const INPUT_COLORS = ["#0a9f6b", "#00acf1"];

const InitialMenuState = () => {
  const { tripReady, resetEnd, resetStart } = useTrip();
  const { setMenu } = useMenu();
  const {
    valueFrom,
    valueTo,
    isFromFocused,
    isToFocused,
    setValueFrom,
    setValueTo,
    setIsFromFocused,
    setIsToFocused,
  } = useSearchbars();
  const { startSource, endSource, setStart, setEnd, start, end } = useTrip();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const { resetRoutes } = useRoutes();
  const { setInitialStartTime, initialStartTime } = useTime();

  useEffect(() => {
    setInitialStartTime(initialStartTime);
  }, [setInitialStartTime, initialStartTime]);

  useEffect(() => {
    resetRoutes();
  }, [resetRoutes]);

  useEffect(() => {
    setValueFrom(getDisplayValue(startSource));
  }, [startSource, setValueFrom]);

  useEffect(() => {
    setValueTo(getDisplayValue(endSource));
  }, [endSource, setValueTo]);

  const handleFromSelect = (coords: Coordinates, source: LocationSource) => {
    setStart(coords, source);
    setMenu("INITIAL");
    fromRef.current?.blur();
    if (endSource.type === "none") {
      toRef.current?.focus();
    }
  };

  const handleToSelect = (coords: Coordinates, source: LocationSource) => {
    setEnd(coords, source);
    setMenu("INITIAL");
    toRef.current?.blur();
    if (startSource.type === "none") {
      fromRef.current?.focus();
    }
  };

  const swapValues = () => {
    const tempCoords = start;
    const tempSource = startSource;

    if (end && tempCoords) {
      setStart(end, endSource);
      setEnd(tempCoords, tempSource);
    }
  };

  return (
    <>
      <div className={menuStyles.topPanel}>
        <div className={menuStyles.header}>
          {isToFocused || isFromFocused ? (
            <button>
              <VscArrowLeft />
            </button>
          ) : (
            <div></div>
          )}
          ten telefon
        </div>

        <Searchbar
          ref={fromRef}
          setMenu={setMenu}
          placeholder="Skąd jedziemy?"
          value={valueFrom}
          setValue={setValueFrom}
          setIsFocused={setIsFromFocused}
          reset={resetStart}
          color={INPUT_COLORS[0]}
          isFocused={isFromFocused}
        />
        <div className={menuStyles.divider}></div>
        <Searchbar
          ref={toRef}
          setMenu={setMenu}
          placeholder="Dokąd jedziemy?"
          value={valueTo}
          setValue={setValueTo}
          setIsFocused={setIsToFocused}
          reset={resetEnd}
          color={INPUT_COLORS[1]}
          isFocused={isToFocused}
          canSwap={!!valueFrom && !!valueTo && !isFromFocused && !isToFocused}
          swap={swapValues}
        />
        {!isFromFocused && !isToFocused ? <Clock /> : ""}
      </div>
      {isFromFocused ? (
        <StopList value={valueFrom} onClick={handleFromSelect} />
      ) : null}
      {isToFocused ? <StopList value={valueTo} onClick={handleToSelect} /> : ""}
      {!isFromFocused && !isToFocused && tripReady ? (
        <button
          className={menuStyles.searchButton}
          onClick={() => setMenu("FOUND_ROUTES")}
        >
          Szukaj
          <VscArrowRight />
        </button>
      ) : (
        ""
      )}
    </>
  );
};

export default InitialMenuState;

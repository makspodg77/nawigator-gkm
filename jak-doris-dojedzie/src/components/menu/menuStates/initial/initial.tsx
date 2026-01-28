import { useEffect, useRef } from "react";
import { useSearchbars } from "../../../../contexts/searchbarContex";
import { useTrip, type LocationSource } from "../../../../contexts/tripContext";
import Clock from "../../../clock/clock";
import Searchbar from "../../../searchbar/searchbar";
import StopList from "../../../stopList/stopList";
import { useRoutes, type Coordinates } from "../../../../contexts/routeContext";
import { useMenu } from "../../../../contexts/menuContext";
import { useTime } from "../../../../contexts/timeContext";

// eslint-disable-next-line react-refresh/only-export-components
export const getDisplayValue = (source: LocationSource) => {
  if (source.type === "none") return "";
  if (source.type === "map") return "Point from map";
  if (source.type === "stop") return source.name;
  return "";
};

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
  const { startSource, endSource, setStart, setEnd } = useTrip();
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

  return (
    <>
      {isToFocused || isFromFocused ? <button>back</button> : ""}
      <Searchbar
        ref={fromRef}
        setMenu={setMenu}
        placeholder="Skąd jedziemy?"
        value={valueFrom}
        setValue={setValueFrom}
        setIsFocused={setIsFromFocused}
        reset={resetStart}
      />
      <Searchbar
        ref={toRef}
        setMenu={setMenu}
        placeholder="Dokąd jedziemy?"
        value={valueTo}
        setValue={setValueTo}
        setIsFocused={setIsToFocused}
        reset={resetEnd}
      />

      {isFromFocused ? (
        <StopList value={valueFrom} onClick={handleFromSelect} />
      ) : (
        ""
      )}
      {isToFocused ? <StopList value={valueTo} onClick={handleToSelect} /> : ""}
      {!isFromFocused && !isToFocused ? <Clock /> : ""}

      {!isFromFocused && !isToFocused && tripReady ? (
        <button onClick={() => setMenu("FOUND_ROUTES")}>Szukaj</button>
      ) : (
        ""
      )}
    </>
  );
};

export default InitialMenuState;

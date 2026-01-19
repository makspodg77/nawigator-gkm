import { useEffect, useRef } from "react";
import { useSearchbars } from "../../../../contexts/searchbarContex";
import { useTrip, type LocationSource } from "../../../../contexts/tripContext";
import Clock from "../../../clock/clock";
import Searchbar from "../../../searchbar/searchbar";
import StopList from "../../../stopList/stopList";
import type { Coordinates } from "../../../../contexts/routeContext";

const getDisplayValue = (source: LocationSource) => {
  if (source.type === "none") return "";
  if (source.type === "map") return "Point from map";
  if (source.type === "stop") return source.name;
  return "";
};

const InitialMenuState = () => {
  const { tripReady, resetEnd, resetStart } = useTrip();
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

  useEffect(() => {
    setValueFrom(getDisplayValue(startSource));
  }, [startSource, setValueFrom]);

  useEffect(() => {
    setValueTo(getDisplayValue(endSource));
  }, [endSource, setValueTo]);

  const handleFromSelect = (coords: Coordinates, source: LocationSource) => {
    setStart(coords, source);
    fromRef.current?.blur();
    if (endSource.type === "none") {
      toRef.current?.focus();
    }
  };

  const handleToSelect = (coords: Coordinates, source: LocationSource) => {
    setEnd(coords, source);
    toRef.current?.blur();
    if (startSource.type === "none") {
      fromRef.current?.focus();
    }
  };

  return (
    <>
      <Searchbar
        ref={fromRef}
        placeholder="Skąd jedziemy?"
        value={valueFrom}
        setValue={setValueFrom}
        setIsFocused={setIsFromFocused}
        reset={resetStart}
      />
      <Searchbar
        ref={toRef}
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

      {!isFromFocused && !isToFocused && tripReady ? <button></button> : ""}
    </>
  );
};

export default InitialMenuState;

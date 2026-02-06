import { useCallback, useEffect, useRef } from "react";
import { getDisplayValue } from "../components/menu/menuStates/initial/initial";
import { useMenu } from "../contexts/menuContext";
import { useSearchbars } from "../contexts/searchbarContex";
import { useTrip, type LocationSource } from "../contexts/tripContext";
import type { Coordinates } from "../contexts/routeContext";

export const useSearchBarLogic = () => {
  const { startSource, endSource, setStart, setEnd } = useTrip();
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

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValueFrom(getDisplayValue(startSource));
  }, [startSource, setValueFrom]);

  useEffect(() => {
    setValueTo(getDisplayValue(endSource));
  }, [endSource, setValueTo]);

  const handleFromSelect = useCallback(
    (coords: Coordinates, source: LocationSource) => {
      setStart(coords, source);
      setMenu("INITIAL");
      fromRef.current?.blur();
      if (endSource.type === "none") {
        toRef.current?.focus();
      }
    },
    [setStart, setMenu, endSource],
  );

  const handleToSelect = useCallback(
    (coords: Coordinates, source: LocationSource) => {
      setEnd(coords, source);
      setMenu("INITIAL");
      toRef.current?.blur();
      if (startSource.type === "none") {
        fromRef.current?.focus();
      }
    },
    [setEnd, setMenu, startSource],
  );

  return {
    fromRef,
    toRef,
    valueFrom,
    valueTo,
    isFromFocused,
    isToFocused,
    setValueFrom,
    setValueTo,
    setIsFromFocused,
    setIsToFocused,
    handleFromSelect,
    handleToSelect,
  };
};

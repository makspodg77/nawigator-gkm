import { useEffect, useState } from "react";
import styles from "./menu.module.css";
import { useSearch } from "../../hooks/useSearch";
import { useTrip, type LocationSource } from "../../contexts/tripContext";
import Clock from "../clock/clock";

const Menu = () => {
  const [valueFrom, setValueFrom] = useState("");
  const [valueTo, setValueTo] = useState("");
  const { startSource, endSource, tripReady, setStart, setEnd } = useTrip();
  const stopsFrom = useSearch(valueFrom);
  const stopsTo = useSearch(valueTo);
  const [isFromFocused, setIsFromFocused] = useState(false);
  const [isToFocused, setIsToFocused] = useState(false);

  const getDisplayValue = (source: LocationSource) => {
    if (source.type === "none") return "";
    if (source.type === "map") return "Point from map";
    if (source.type === "stop") return source.name;
    return "";
  };

  useEffect(() => {
    const updateValue = () => {
      setValueFrom(getDisplayValue(startSource));
    };

    updateValue();
  }, [startSource]);

  useEffect(() => {
    const updateValue = () => {
      setValueTo(getDisplayValue(endSource));
    };

    updateValue();
  }, [endSource]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={styles.menu}
    >
      <input
        value={valueFrom}
        onChange={(e) => setValueFrom(e.target.value)}
        placeholder="Select start location"
        onFocus={() => setIsFromFocused(true)}
        onBlur={() => setIsFromFocused(false)}
      />
      <input
        value={valueTo}
        onChange={(e) => setValueTo(e.target.value)}
        placeholder="Select end location"
        onFocus={() => setIsToFocused(true)}
        onBlur={() => setIsToFocused(false)}
      />
      {tripReady ? "dildo" : "clihhh"}
      <Clock />{" "}
      {isFromFocused && stopsFrom.length > 0 && (
        <div
          className={styles.dropdown}
          onMouseDown={(e) => e.preventDefault()}
        >
          {stopsFrom.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setStart(
                  { lon: s.lat, lat: s.lon },
                  { type: "stop", name: s.name, stopId: s.id },
                );
                setIsFromFocused(false);
              }}
            >
              {s.name} {s.lines.join(" ")}
            </div>
          ))}
        </div>
      )}
      {isToFocused && stopsTo.length > 0 && (
        <div
          className={styles.dropdown}
          onMouseDown={(e) => e.preventDefault()}
        >
          {stopsTo.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setEnd(
                  { lon: s.lat, lat: s.lon },
                  { type: "stop", name: s.name, stopId: s.id },
                );
                setIsToFocused(false);
              }}
            >
              {s.name} {s.lines.join(" ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;

import type { Dispatch, SetStateAction } from "react";
import styles from "../map/map.module.css";
import { useMenu } from "../../contexts/menuContext";
import { useTrip } from "../../contexts/tripContext";

export type ClickedPosition = {
  lat: number;
  lon: number;
  x: number;
  y: number;
};

type MapSelectorProps = {
  setClickedPosition: Dispatch<SetStateAction<ClickedPosition | null>>;
  clickedPosition: ClickedPosition | null;
};

const MapSelector = ({
  setClickedPosition,
  clickedPosition,
}: MapSelectorProps) => {
  const { setMenu } = useMenu();
  const { setStart, setEnd } = useTrip();

  if (!clickedPosition) return null;

  const handleSetLocation = (setter: typeof setStart | typeof setEnd) => () => {
    setter(clickedPosition, { type: "map" });
    setClickedPosition(null);
    setMenu("INITIAL");
  };

  return (
    <div
      className={styles.buttonsContainer}
      onClick={(e) => {
        e.stopPropagation();
        setClickedPosition(null);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          position: "absolute",
          left: clickedPosition.x,
          top: clickedPosition.y,
          transform: "translate(-50%, -100%)",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button onClick={handleSetLocation(setStart)}>
          Ustaw tu punkt startowy
        </button>
        <button onClick={handleSetLocation(setEnd)}>
          Ustaw tu punkt końcowy
        </button>
      </div>
    </div>
  );
};

export default MapSelector;

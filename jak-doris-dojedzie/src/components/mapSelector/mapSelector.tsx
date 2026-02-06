import type { Dispatch, SetStateAction } from "react";
import mapStyles from "../map/map.module.css";
import { useMenu } from "../../contexts/menuContext";
import { useTrip } from "../../contexts/tripContext";
import styles from "./mapSelector.module.css";

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
      className={mapStyles.buttonsContainer}
      onClick={(e) => {
        e.stopPropagation();
        setClickedPosition(null);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={styles.container}
        style={{
          position: "absolute",
          left: clickedPosition.x,
          top: clickedPosition.y,
          transform: "translate(-50%, -100%)",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleSetLocation(setStart)}
          className={styles.buttonTop}
        >
          <div className={styles.point}>
            <div
              className={styles.outerCircle}
              style={{ backgroundColor: "#0a9f6b" }}
            >
              <div className={styles.innerCircle} />
            </div>
          </div>
          <div>Ustaw tu punkt startowy</div>
        </button>
        <button
          onClick={handleSetLocation(setEnd)}
          className={styles.buttonBottom}
        >
          <div className={styles.point}>
            <div
              className={styles.outerCircle}
              style={{ backgroundColor: "#00acf1" }}
            >
              <div className={styles.innerCircle} />
            </div>
          </div>
          <div>Ustaw tu punkt końcowy</div>
        </button>
      </div>
    </div>
  );
};

export default MapSelector;

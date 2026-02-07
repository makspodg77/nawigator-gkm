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

const getAddressFromLatLon = async (lat: number, lon: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    );
    const data = await response.json();
    const addr = data.address;
    const street = addr.road || addr.suburb;
    const city = addr.city || addr.town || addr.village;

    return street && city
      ? `${street}, ${city}`
      : street || city || "Wybrana lokalizacja";
  } catch (error) {
    console.error("Failed to fetch address:", error);
    return "Wybrana lokalizacja";
  }
};
const MapSelector = ({
  setClickedPosition,
  clickedPosition,
}: MapSelectorProps) => {
  const { setMenu } = useMenu();
  const { setStart, setEnd } = useTrip();

  if (!clickedPosition) return null;

  const handleSetLocation =
    (setter: typeof setStart | typeof setEnd) => async () => {
      const name = await getAddressFromLatLon(
        clickedPosition.lat,
        clickedPosition.lon,
      );
      setter(clickedPosition, {
        type: "map",
        name: name,
      });
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

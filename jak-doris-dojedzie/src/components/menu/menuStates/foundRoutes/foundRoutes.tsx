import { useEffect } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";
import RouteOption from "../../../routeOption/routeOption";
import { useMenu } from "../../../../contexts/menuContext";
import { useTime } from "../../../../contexts/timeContext";
import menuStyles from "../../menu.module.css";
import styles from "./foundRoutes.module.css";
import clsx from "clsx";
import { VscArrowLeft } from "react-icons/vsc";

const FoundRoutesMenuState = () => {
  const { startSource, endSource } = useTrip();
  const { fetchRoutes, routes, isLoading, error } = useRoutes();
  const { setMenu } = useMenu();
  const { getNewLowerBound, getNewUpperBound, startTime, endTime } = useTime();

  useEffect(() => {
    fetchRoutes(true);
  }, [startTime, endTime, fetchRoutes]);

  useEffect(() => {
    if (!isLoading && !routes && error) {
      setMenu("ERROR");
    }
  }, [isLoading, routes, error, setMenu]);

  return (
    <>
      <div className={clsx(menuStyles.topPanel, styles.topPanel)}>
        <div className={menuStyles.header}>
          <button onClick={() => setMenu("INITIAL")}>
            <VscArrowLeft />
          </button>
        </div>
        <div className={styles.headerRow}>
          <div className={styles.point}>
            <div
              className={styles.outerCircle}
              style={{ backgroundColor: "#0a9f6b" }}
            >
              <div className={styles.innerCircle} />
            </div>
          </div>
          <div>{getDisplayValue(startSource)}</div>
        </div>
        <div className={styles.headerRow}>
          <div className={styles.point}>
            <div
              className={styles.outerCircle}
              style={{ backgroundColor: "#00acf1" }}
            >
              <div className={styles.innerCircle} />
            </div>
          </div>
          <div>{getDisplayValue(endSource)}</div>
        </div>
      </div>
      <div className={styles.container}>
        <button onClick={getNewLowerBound} className={styles.searchButton}>
          Szukaj przed..
        </button>
        {isLoading ? (
          <p>Ładowanie tras...</p>
        ) : routes && routes.length > 0 ? (
          routes.map((route) => <RouteOption key={route.key} route={route} />)
        ) : (
          <p>Nie znaleźliśmy żadnego połączenia</p>
        )}
        <button className={styles.searchButton} onClick={getNewUpperBound}>
          Szukaj po..
        </button>
      </div>
    </>
  );
};

export default FoundRoutesMenuState;

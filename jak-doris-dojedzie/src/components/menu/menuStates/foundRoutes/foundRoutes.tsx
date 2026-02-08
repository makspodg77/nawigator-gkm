import { useEffect, useState } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTrip, type LocationSource } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";
import RouteOption from "../../../routeOption/routeOption";
import { useMenu } from "../../../../contexts/menuContext";
import { useTime } from "../../../../contexts/timeContext";
import menuStyles from "../../menu.module.css";
import styles from "./foundRoutes.module.css";
import clsx from "clsx";
import { VscArrowLeft } from "react-icons/vsc";

const FoundRoutesMenuState = () => {
  const { fetchRoutes, routes, isLoading, error } = useRoutes();
  const { setMenu } = useMenu();
  const { getNewLowerBound, getNewUpperBound, startTime, endTime } = useTime();
  const [loadingDirection, setLoadingDirection] = useState<
    "before" | "after" | null
  >(null);

  useEffect(() => {
    fetchRoutes(true);
  }, [startTime, endTime, fetchRoutes]);

  useEffect(() => {
    if (!isLoading && !routes && error) {
      setMenu("ERROR");
    }
  }, [isLoading, routes, error, setMenu]);

  useEffect(() => {
    if (!isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingDirection(null);
    }
  }, [isLoading]);

  const showFullLoading = isLoading && (!routes || routes.length === 0);

  if (showFullLoading)
    return (
      <>
        <TopPanel />
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
        </div>
      </>
    );

  const handleSearchBefore = () => {
    setLoadingDirection("before");
    getNewLowerBound();
  };

  const handleSearchAfter = () => {
    setLoadingDirection("after");
    getNewUpperBound();
  };

  return (
    <>
      <TopPanel />
      <div className={styles.container}>
        {searchOtherTime(
          startTime !== 0,
          handleSearchBefore,
          "Szukaj przed..",
          isLoading && loadingDirection === "before",
        )}

        {routes && routes.length > 0 ? (
          routes.map((route) => <RouteOption key={route.key} route={route} />)
        ) : (
          <p>Nie znaleźliśmy żadnego połączenia</p>
        )}

        {searchOtherTime(
          endTime !== 1440,
          handleSearchAfter,
          "Szukaj po..",
          isLoading && loadingDirection === "after",
        )}
      </div>
    </>
  );
};

const searchOtherTime = (
  condition: boolean,
  onClick: () => void,
  text: string,
  isLoading: boolean,
) => {
  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  if (condition) {
    return (
      <button className={styles.searchButton} onClick={onClick}>
        {text}
      </button>
    );
  }

  return null;
};

const TopPanel = () => {
  const { setMenu } = useMenu();
  const { startSource, endSource } = useTrip();

  return (
    <div className={clsx(menuStyles.topPanel, styles.topPanel)}>
      <div className={menuStyles.header}>
        <button onClick={() => setMenu("INITIAL")}>
          <VscArrowLeft />
        </button>
      </div>
      <HeaderRow color="#0a9f6b" source={startSource} connector={true} />
      <HeaderRow color="#00acf1" source={endSource} connector={false} />
    </div>
  );
};

const HeaderRow = ({
  color,
  source,
  connector,
}: {
  color: string;
  source: LocationSource;
  connector: boolean;
}) => {
  return (
    <div className={styles.headerRow}>
      <div className={styles.point}>
        <div className={styles.outerCircle} style={{ backgroundColor: color }}>
          {connector ? <div className={styles.connector} /> : null}
          <div className={styles.innerCircle} />
        </div>
      </div>
      <div>{getDisplayValue(source)}</div>
    </div>
  );
};

export default FoundRoutesMenuState;

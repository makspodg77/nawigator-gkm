import { useEffect, useState, useCallback } from "react";
import { useRoutes } from "../../../../contexts/routeContext";
import { useMenu } from "../../../../contexts/menuContext";
import { useTime } from "../../../../contexts/timeContext";
import RouteOption from "../../../routeOption/routeOption";
import TopPanel from "./topPanel";
import SearchOtherTime from "./searchOtherTime";
import styles from "./foundRoutes.module.css";

type LoadingDirection = "before" | "after" | null;

const FoundRoutesMenuState = () => {
  const { fetchRoutes, routes, isLoading, error } = useRoutes();
  const { setMenu } = useMenu();
  const { getNewLowerBound, getNewUpperBound, startTime, endTime } = useTime();
  const [loadingDirection, setLoadingDirection] =
    useState<LoadingDirection>(null);

  useEffect(() => {
    fetchRoutes();
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

  const handleSearchBefore = useCallback(() => {
    setLoadingDirection("before");
    getNewLowerBound();
  }, [getNewLowerBound]);

  const handleSearchAfter = useCallback(() => {
    setLoadingDirection("after");
    getNewUpperBound();
  }, [getNewUpperBound]);

  const showFullLoading = isLoading && (!routes || routes.length === 0);
  const hasRoutes = routes && routes.length > 0;

  if (showFullLoading) {
    return (
      <>
        <TopPanel />
        <div className={styles.loaderContainer}>
          <div
            className={styles.loader}
            role="status"
            aria-label="Ładowanie tras"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <TopPanel />
      <div className={styles.container}>
        <SearchOtherTime
          condition={startTime !== 0}
          onClick={handleSearchBefore}
          text="Szukaj wcześniej"
          isLoading={isLoading && loadingDirection === "before"}
        />

        {hasRoutes ? (
          <ul
            className={styles.routeList}
            role="list"
            aria-label="Znalezione trasy"
          >
            {routes.map((route) => (
              <li key={route.key} className={styles.routeItem}>
                <RouteOption route={route} />
              </li>
            ))}
          </ul>
        ) : (
          <div role="status">Nie znaleźliśmy żadnego połączenia</div>
        )}

        <SearchOtherTime
          condition={endTime !== 1440}
          onClick={handleSearchAfter}
          text="Szukaj później"
          isLoading={isLoading && loadingDirection === "after"}
        />
      </div>
    </>
  );
};

export default FoundRoutesMenuState;

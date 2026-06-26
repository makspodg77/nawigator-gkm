import { VscArrowLeft } from "react-icons/vsc";
import menuStyles from "../../menu.module.css";
import styles from "./foundRoutes.module.css";
import HeaderRow from "./HeaderRow";
import { useMenu } from "../../../../contexts/menuContext";
import { useTrip } from "../../../../contexts/tripContext";
import clsx from "clsx";
import { useRoutes } from "../../../../contexts/routeContext";
import { useTime } from "../../../../contexts/timeContext";

const TopPanel = () => {
  const { setMenu } = useMenu();
  const { startSource, endSource } = useTrip();
  const { resetRoutes } = useRoutes();
  const { resetTime } = useTime();

  const handleBack = () => {
    resetRoutes();
    resetTime();
    setMenu("INITIAL");
  };

  return (
    <div className={clsx(menuStyles.topPanel, styles.topPanel)}>
      <div className={menuStyles.header}>
        <button onClick={() => handleBack()} className={menuStyles.button}>
          <VscArrowLeft />
        </button>
      </div>
      <HeaderRow type="origin" source={startSource} connector={true} />
      <HeaderRow type="destination" source={endSource} connector={false} />
    </div>
  );
};

export default TopPanel;

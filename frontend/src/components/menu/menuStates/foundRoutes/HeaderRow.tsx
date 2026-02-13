import type { LocationSource } from "../../../../contexts/tripContext";
import MilestoneCircle from "../../../milestoneCircle/milestoneCircle";
import { getDisplayValue } from "../initial/initial";
import styles from "./foundRoutes.module.css";
const HeaderRow = ({
  type,
  source,
  connector,
}: {
  type: "origin" | "destination";
  source: LocationSource;
  connector: boolean;
}) => {
  return (
    <div className={styles.headerRow}>
      <div className={styles.point}>
        <MilestoneCircle type={type} size={"md"}>
          {connector ? <div className={styles.connector} /> : null}
        </MilestoneCircle>
      </div>
      <div>{getDisplayValue(source)}</div>
    </div>
  );
};

export default HeaderRow;

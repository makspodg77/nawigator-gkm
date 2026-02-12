import type { ReactNode } from "react";
import styles from "./milestoneCircle.module.css";

type MilestoneCircleProps = {
  type: "origin" | "destination";
  size: "sm" | "md";
  innerColor?: string;
  children?: ReactNode;
};

const MilestoneCircle = ({
  type,
  size,
  innerColor,
  children,
}: MilestoneCircleProps) => {
  return (
    <div className={styles.outerCircle} data-type={type} data-size={size}>
      <div className={styles.connector} data-position={type} />
      {children}
      <div
        className={styles.innerCircle}
        style={{ backgroundColor: innerColor }}
      />
    </div>
  );
};

export default MilestoneCircle;

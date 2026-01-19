import styles from "./menu.module.css";
import InitialMenuState from "./menuStates/initial/initial";

const Menu = () => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={styles.menu}
    >
      <InitialMenuState />
    </div>
  );
};

export default Menu;

import styles from "./menu.module.css";
import InitialMenuState from "./menuStates/initial/initial";
import FoundRoutesMenuState from "./menuStates/foundRoutes/foundRoutes";
import { useMenu } from "../../contexts/menuContext";

const Menu = () => {
  const { menu } = useMenu();
  return (
    <div className={styles.menu}>
      {menu === 1 ? <InitialMenuState /> : <FoundRoutesMenuState />}
    </div>
  );
};

export default Menu;

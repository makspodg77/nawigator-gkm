import styles from "./menu.module.css";
import InitialMenuState from "./menuStates/initial/initial";
import FoundRoutesMenuState from "./menuStates/foundRoutes/foundRoutes";
import { useMenu } from "../../contexts/menuContext";
import ErrorMenuState from "./menuStates/error/error";
import RouteChosenMenuState from "./menuStates/routeChosen/routeChosen";

const Menu = () => {
  const { menu } = useMenu();

  const renderMenu = () => {
    switch (menu) {
      case "INITIAL":
        return <InitialMenuState />;
      case "FOUND_ROUTES":
        return <FoundRoutesMenuState />;
      case "ERROR":
        return <ErrorMenuState />;
      case "CHOSEN_ROUTE":
        return <RouteChosenMenuState />;
      default:
        return null;
    }
  };

  return <div className={styles.menu}>{renderMenu()}</div>;
};
export default Menu;

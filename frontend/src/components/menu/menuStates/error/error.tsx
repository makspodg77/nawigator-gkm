import image from "../../../../assets/error.jfif";
import styles from "./error.module.css";

const ErrorMenuState = () => {
  return (
    <div className={styles.image}>
      <img src={image} width={"100%"} />{" "}
      <div className={styles.text}>Wystąpił Błąd</div>
    </div>
  );
};

export default ErrorMenuState;

import styles from "./foundRoutes.module.css";

type SearchOtherTimeProps = {
  condition: boolean;
  onClick: () => void;
  text: string;
  isLoading: boolean;
};

const SearchOtherTime = ({
  condition,
  onClick,
  text,
  isLoading,
}: SearchOtherTimeProps) => {
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

export default SearchOtherTime;

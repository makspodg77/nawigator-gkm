import { VscArrowLeft } from "react-icons/vsc";
import menuStyles from "../../menu.module.css";
import { useSearchbars } from "../../../../contexts/searchbarContex";

const Header = ({ showBackButton }: { showBackButton: boolean }) => {
  const { setIsFromFocused, setIsToFocused } = useSearchbars();

  const handleBack = () => {
    setIsFromFocused(false);
    setIsToFocused(false);
  };

  return (
    <div className={menuStyles.header}>
      {showBackButton ? (
        <button onClick={handleBack}>
          <VscArrowLeft className={menuStyles.button} />
        </button>
      ) : (
        <div />
      )}
      GKM
    </div>
  );
};

export default Header;

import { forwardRef, type Dispatch, type SetStateAction } from "react";
import type { MenuState } from "../../contexts/menuContext";
import styles from "./searchbar.module.css";
import { VscChromeClose } from "react-icons/vsc";
import { VscArrowSwap } from "react-icons/vsc";

type SearchbarProps = {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  setIsFocused: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  reset: () => void;
  setMenu: (n: MenuState) => void;
  color: string;
  isFocused: boolean;
  canSwap?: boolean;
  swap?: () => void;
};

const Searchbar = forwardRef<HTMLInputElement, SearchbarProps>(
  (
    {
      value,
      setValue,
      setIsFocused,
      placeholder,
      reset,
      setMenu,
      color,
      isFocused,
      canSwap = false,
      swap,
    },
    ref,
  ) => {
    const handleChange = (e?: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = "";

      if (e) newValue = e.target.value;

      setValue(newValue);
      setMenu("INITIAL");

      if (newValue === "") {
        reset();
      }
    };

    return (
      <div className={styles.container}>
        <div className={styles.point} onMouseDown={(e) => e.preventDefault()}>
          <div
            className={styles.outerCircle}
            style={{ backgroundColor: color }}
          >
            <div className={styles.innerCircle} />
          </div>
        </div>

        <input
          ref={ref}
          value={value}
          type="text"
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
        />

        <div className={styles.action} onMouseDown={(e) => e.preventDefault()}>
          {isFocused && value ? (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleChange()}
            >
              <VscChromeClose />
            </div>
          ) : canSwap && swap ? (
            <div onClick={() => swap()}>
              <VscArrowSwap />
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

export default Searchbar;

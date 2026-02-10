import { forwardRef, type Dispatch, type SetStateAction } from "react";
import type { MenuState } from "../../contexts/menuContext";
import styles from "./searchbar.module.css";
import { VscChromeClose, VscArrowSwap } from "react-icons/vsc";

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
  position?: "start" | "end";
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
      position,
    },
    ref,
  ) => {
    const handleChange = (e?: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e?.target.value ?? "";
      setValue(newValue);
      setMenu("INITIAL");
      if (!newValue) reset();
    };

    const showClear = isFocused && value;
    const showSwap = !showClear && canSwap && swap;

    return (
      <div className={styles.container}>
        <div className={styles.point}>
          <div
            className={styles.outerCircle}
            style={{ backgroundColor: color }}
          >
            {position && (
              <div className={styles.connector} data-position={position} />
            )}
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

        <div className={styles.action}>
          {showClear && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleChange()}
              aria-label="Clear search"
            >
              <VscChromeClose />
            </button>
          )}
          {showSwap && (
            <button type="button" onClick={swap} aria-label="Swap locations">
              <VscArrowSwap />
            </button>
          )}
        </div>
      </div>
    );
  },
);

Searchbar.displayName = "Searchbar";

export default Searchbar;

import { forwardRef } from "react";
import { useMenu } from "../../contexts/menuContext";
import styles from "./searchbar.module.css";
import { VscChromeClose, VscArrowSwap } from "react-icons/vsc";
import MilestoneCircle from "../milestoneCircle/milestoneCircle";

type SearchbarBaseProps = {
  value: string;
  setValue: (value: string) => void;
  setIsFocused: (isFocused: boolean) => void;
  placeholder: string;
  reset: () => void;
  isFocused: boolean;
  type: "origin" | "destination";
  position?: "start" | "end";
};

type SearchbarProps = SearchbarBaseProps &
  ({ canSwap: true; swap: () => void } | { canSwap?: false; swap?: never });

const Searchbar = forwardRef<HTMLInputElement, SearchbarProps>(
  (
    {
      value,
      setValue,
      setIsFocused,
      placeholder,
      reset,
      isFocused,
      canSwap = false,
      swap,
      position,
      type,
    },
    ref,
  ) => {
    const { setMenu } = useMenu();
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
          <MilestoneCircle type={type} size="md" innerColor="white">
            {position && (
              <div className={styles.connector} data-position={position} />
            )}
          </MilestoneCircle>
        </div>

        <input
          className={styles.input}
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

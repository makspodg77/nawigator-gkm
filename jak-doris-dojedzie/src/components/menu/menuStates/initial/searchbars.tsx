import { type Dispatch, type RefObject, type SetStateAction } from "react";
import { useMenu } from "../../../../contexts/menuContext";
import Header from "./header";
import menuStyles from "../../menu.module.css";
import Searchbar from "../../../searchbar/searchbar";
import Clock from "../../../clock/clock";

type SearchBarSectionProps = {
  fromRef: RefObject<HTMLInputElement | null>;
  toRef: RefObject<HTMLInputElement | null>;
  valueFrom: string;
  valueTo: string;
  setValueFrom: Dispatch<SetStateAction<string>>;
  setValueTo: Dispatch<SetStateAction<string>>;
  isFromFocused: boolean;
  isToFocused: boolean;
  setIsFromFocused: Dispatch<SetStateAction<boolean>>;
  setIsToFocused: Dispatch<SetStateAction<boolean>>;
  onSwap: () => void;
  resetStart: () => void;
  resetEnd: () => void;
  tripReady: boolean;
};

const INPUT_COLORS = ["#0a9f6b", "#00acf1"] as const;

const SearchBarSection = ({
  fromRef,
  toRef,
  valueFrom,
  valueTo,
  setValueFrom,
  setValueTo,
  isFromFocused,
  isToFocused,
  setIsFromFocused,
  setIsToFocused,
  onSwap,
  resetStart,
  resetEnd,
  tripReady,
}: SearchBarSectionProps) => {
  const { setMenu } = useMenu();
  const anyFocused = isFromFocused || isToFocused;

  return (
    <div className={menuStyles.topPanel}>
      <Header showBackButton={anyFocused} />
      <Searchbar
        ref={fromRef}
        setMenu={setMenu}
        placeholder="Skąd jedziemy?"
        value={valueFrom}
        setValue={setValueFrom}
        setIsFocused={setIsFromFocused}
        reset={resetStart}
        color={INPUT_COLORS[0]}
        isFocused={isFromFocused}
        position={tripReady && !anyFocused ? "start" : undefined}
      />

      <div className={menuStyles.divider}></div>
      <Searchbar
        ref={toRef}
        setMenu={setMenu}
        placeholder="Dokąd jedziemy?"
        value={valueTo}
        setValue={setValueTo}
        setIsFocused={setIsToFocused}
        reset={resetEnd}
        color={INPUT_COLORS[1]}
        isFocused={isToFocused}
        canSwap={!!valueFrom && !!valueTo && !anyFocused}
        swap={onSwap}
        position={tripReady && !anyFocused ? "end" : undefined}
      />

      {!anyFocused && <Clock />}
    </div>
  );
};

export default SearchBarSection;

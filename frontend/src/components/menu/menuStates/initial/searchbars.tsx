import { type RefObject } from "react";
import Header from "./header";
import menuStyles from "../../menu.module.css";
import Searchbar from "../../../searchbar/searchbar";
import Clock from "../../../clock/clock";

type SearchBarSectionProps = {
  fromRef: RefObject<HTMLInputElement | null>;
  toRef: RefObject<HTMLInputElement | null>;
  valueFrom: string;
  valueTo: string;
  isFromFocused: boolean;
  isToFocused: boolean;
  onSwap: () => void;
  resetStart: () => void;
  resetEnd: () => void;
  tripReady: boolean;
  setValueFrom: (value: string) => void;
  setValueTo: (value: string) => void;
  setIsFromFocused: (focused: boolean) => void;
  setIsToFocused: (focused: boolean) => void;
};

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
  const anyFocused = isFromFocused || isToFocused;

  const toSearchbarProps = {
    ref: toRef,
    placeholder: "Dokąd jedziemy?",
    value: valueTo,
    setValue: setValueTo,
    setIsFocused: setIsToFocused,
    reset: resetEnd,
    isFocused: isToFocused,
    type: "destination" as const,
    position: (tripReady && !anyFocused ? "end" : undefined) as
      | "end"
      | undefined,
  };

  return (
    <div className={menuStyles.topPanel}>
      <Header showBackButton={anyFocused} />
      <Searchbar
        ref={fromRef}
        placeholder="Skąd jedziemy?"
        value={valueFrom}
        setValue={setValueFrom}
        setIsFocused={setIsFromFocused}
        reset={resetStart}
        type="origin"
        isFocused={isFromFocused}
        position={tripReady && !anyFocused ? "start" : undefined}
      />

      <div className={menuStyles.divider}></div>
      {!!valueFrom && !!valueTo && !anyFocused ? (
        <Searchbar {...toSearchbarProps} canSwap={true} swap={onSwap} />
      ) : (
        <Searchbar {...toSearchbarProps} />
      )}

      {!anyFocused && <Clock />}
    </div>
  );
};

export default SearchBarSection;

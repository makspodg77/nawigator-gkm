import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

type SearchContextType = {
  valueFrom: string;
  valueTo: string;
  isFromFocused: boolean;
  isToFocused: boolean;
  setValueFrom: Dispatch<SetStateAction<string>>;
  setValueTo: Dispatch<SetStateAction<string>>;
  setIsFromFocused: Dispatch<SetStateAction<boolean>>;
  setIsToFocused: Dispatch<SetStateAction<boolean>>;
};

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [valueFrom, setValueFrom] = useState("");
  const [valueTo, setValueTo] = useState("");
  const [isFromFocused, setIsFromFocused] = useState(false);
  const [isToFocused, setIsToFocused] = useState(false);

  return (
    <SearchContext.Provider
      value={{
        valueFrom,
        valueTo,
        isFromFocused,
        isToFocused,
        setValueFrom,
        setValueTo,
        setIsFromFocused,
        setIsToFocused,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearchbars() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside SearchProvider");
  }
  return ctx;
}

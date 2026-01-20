import { createContext, useContext, useState, type ReactNode } from "react";

type HoveredRouteContextType = {
  hovered: string | null;
  setHovered: (key: string | null) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const HoveredRouteContext = createContext<
  HoveredRouteContextType | undefined
>(undefined);

// Changed to HoveredRouteProvider to match the context name
export function HoveredRouteProvider({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <HoveredRouteContext.Provider value={{ hovered, setHovered }}>
      {children}
    </HoveredRouteContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHoveredRoute() {
  const ctx = useContext(HoveredRouteContext);
  if (!ctx) {
    throw new Error("useHoveredRoute must be used inside HoveredRouteProvider");
  }
  return ctx;
}

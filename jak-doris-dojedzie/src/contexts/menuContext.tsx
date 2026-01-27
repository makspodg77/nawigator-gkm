import { createContext, useContext, useState, type ReactNode } from "react";

export type MenuState = "INITIAL" | "FOUND_ROUTES" | "LOADING" | "ERROR";

type MenuContextType = {
  menu: MenuState;
  setMenu: (value: MenuState) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState>("INITIAL");

  return (
    <MenuContext.Provider value={{ menu, setMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("useMenu must be used inside MenuProvider");
  }
  return ctx;
}

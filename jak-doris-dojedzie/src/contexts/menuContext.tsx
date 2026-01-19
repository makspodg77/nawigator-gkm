import { createContext, useContext, useState, type ReactNode } from "react";

type MenuContextType = {
  menu: number;
  setMenu: (value: number) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const MenuContext = createContext<MenuContextType | undefined>(
  undefined,
);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(1);

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

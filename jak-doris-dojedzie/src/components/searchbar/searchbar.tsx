import { forwardRef, type Dispatch, type SetStateAction } from "react";
import type { MenuState } from "../../contexts/menuContext";

type SearchbarProps = {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  setIsFocused: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  reset: () => void;
  setMenu: (n: MenuState) => void;
};

const Searchbar = forwardRef<HTMLInputElement, SearchbarProps>(
  ({ value, setValue, setIsFocused, placeholder, reset, setMenu }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      setMenu("INITIAL");
      if (newValue === "") {
        reset();
      }
    };

    return (
      <input
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
      />
    );
  },
);

export default Searchbar;

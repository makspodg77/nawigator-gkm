import { forwardRef, type Dispatch, type SetStateAction } from "react";

type SearchbarProps = {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  setIsFocused: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  reset: () => void;
};

const Searchbar = forwardRef<HTMLInputElement, SearchbarProps>(
  ({ value, setValue, setIsFocused, placeholder, reset }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

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

import { useTrip } from "../../../../contexts/tripContext";
import { getDisplayValue } from "../initial/initial";

const FoundRoutesMenuState = () => {
  const { startSource, endSource } = useTrip();
  return (
    <>
      <h3>{getDisplayValue(startSource)}</h3>
      <h3>{getDisplayValue(endSource)}</h3>
    </>
  );
};

export default FoundRoutesMenuState;

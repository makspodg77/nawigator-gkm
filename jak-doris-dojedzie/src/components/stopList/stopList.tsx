import { useSearch } from "../../hooks/useSearch";
import type { Coordinates } from "../../contexts/routeContext";
import type { LocationSource } from "../../contexts/tripContext";

const StopList = ({
  value,
  onClick,
}: {
  value: string;
  onClick: (coords: Coordinates, source: LocationSource) => void;
}) => {
  const stops = useSearch(value);

  return (
    <div onMouseDown={(e) => e.preventDefault()}>
      {stops.map((s) => (
        <div
          key={s.id}
          onClick={() =>
            onClick(
              { lat: s.lon, lon: s.lat },
              { type: "stop", name: s.name, stopId: s.id },
            )
          }
        >
          {s.name} {s.lines.join(" ")}
        </div>
      ))}
    </div>
  );
};

export default StopList;

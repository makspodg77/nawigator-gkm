import { useMap } from "react-leaflet";
import { useEffect } from "react";
import { useTrip } from "../../contexts/tripContext";
import { useRoutes } from "../../contexts/routeContext";
import { useHoveredRoute } from "../../contexts/hoveredRouteContext";
import L from "leaflet";
import { darken } from "polished";

const getMidpoint = (points: L.LatLngExpression[]): L.LatLngExpression => {
  const midIndex = Math.floor(points.length / 2);
  return points[midIndex];
};

const ROUTE_STYLES = {
  WALK: {
    COLOR: "#555555",
    WEIGHT: 4,
    DASH: "10, 10",
    OPACITY: {
      VISIBLE: 0.8,
      HIDDEN: 0,
    },
  },
  TRANSIT: {
    BORDER_WEIGHT: 6,
    LINE_WEIGHT: 5,
    DARKEN_AMOUNT: 0.25,
    BORDER_DARKEN: 0.1,
    OPACITY: {
      BORDER_VISIBLE: 0.8,
      LINE_VISIBLE: 1,
      HIDDEN: 0,
    },
  },
  LABEL: {
    PADDING: "2px 8px",
    BORDER_RADIUS: "6px",
    FONT_SIZE: "12px",
    FALLBACK_COLOR: "#666666",
  },
  LINE: {
    JOIN: "round" as const,
    CAP: "round" as const,
  },
} as const;

const createWalkPolyline = (
  points: L.LatLngExpression[],
  isHovered: boolean,
): L.Polyline => {
  return new L.Polyline(points, {
    color: ROUTE_STYLES.WALK.COLOR,
    weight: ROUTE_STYLES.WALK.WEIGHT,
    opacity: isHovered
      ? ROUTE_STYLES.WALK.OPACITY.VISIBLE
      : ROUTE_STYLES.WALK.OPACITY.HIDDEN,
    dashArray: ROUTE_STYLES.WALK.DASH,
  });
};

const createTransitPolylines = (
  latLons: L.LatLngExpression[],
  lineColor: string,
  isHovered: boolean,
): [L.Polyline, L.Polyline] => {
  const border = new L.Polyline(latLons, {
    color: darken(ROUTE_STYLES.TRANSIT.DARKEN_AMOUNT, lineColor),
    weight: ROUTE_STYLES.TRANSIT.BORDER_WEIGHT,
    opacity: isHovered
      ? ROUTE_STYLES.TRANSIT.OPACITY.BORDER_VISIBLE
      : ROUTE_STYLES.TRANSIT.OPACITY.HIDDEN,
    lineJoin: ROUTE_STYLES.LINE.JOIN,
    lineCap: ROUTE_STYLES.LINE.CAP,
  });

  const line = new L.Polyline(latLons, {
    color: lineColor,
    weight: ROUTE_STYLES.TRANSIT.LINE_WEIGHT,
    opacity: isHovered
      ? ROUTE_STYLES.TRANSIT.OPACITY.LINE_VISIBLE
      : ROUTE_STYLES.TRANSIT.OPACITY.HIDDEN,
    lineJoin: ROUTE_STYLES.LINE.JOIN,
    lineCap: ROUTE_STYLES.LINE.CAP,
  });

  return [border, line];
};

const createLineLabel = (
  lineNumber: string,
  lineColor: string,
  isHovered: boolean,
): L.DivIcon => {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background-color: ${lineColor || ROUTE_STYLES.LABEL.FALLBACK_COLOR};
        color: white;
        padding: ${ROUTE_STYLES.LABEL.PADDING};
        border-radius: ${ROUTE_STYLES.LABEL.BORDER_RADIUS};
        font-size: ${ROUTE_STYLES.LABEL.FONT_SIZE};
        font-weight: bold;
        border: 1px solid ${darken(ROUTE_STYLES.TRANSIT.BORDER_DARKEN, lineColor)};
        opacity: ${isHovered ? 1 : 0};
        pointer-events: none;
      ">
        ${lineNumber}
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [0, 0],
  });
};
const MapRoutePainter = () => {
  const { start, end } = useTrip();
  const map = useMap();
  const { routes } = useRoutes();
  const { hovered } = useHoveredRoute();

  useEffect(() => {
    if (!map || !routes) return;

    const pathGroup = L.layerGroup().addTo(map);
    const labelGroup = L.layerGroup().addTo(map);

    routes.forEach((route) => {
      const isHovered = route.key === hovered;
      let firstTransit = true;
      let lastLatLon: L.LatLngExpression | undefined;

      route.segments.forEach((segment) => {
        if (segment.type !== "transit" || !segment.geometryPoints) return;

        const latLons = segment.geometryPoints.map(
          (gp) => [gp.lat, gp.lon] as L.LatLngExpression,
        );

        lastLatLon = latLons[latLons.length - 1];

        if (start && firstTransit && latLons[0]) {
          createWalkPolyline(
            [latLons[0], [start.lat, start.lon]],
            isHovered,
          ).addTo(pathGroup);
          firstTransit = false;
        }

        const [border, line] = createTransitPolylines(
          latLons,
          segment.lineColor,
          isHovered,
        );
        border.addTo(pathGroup);
        line.addTo(pathGroup);

        const midpoint = getMidpoint(latLons);
        if (midpoint) {
          const label = createLineLabel(
            segment.line,
            segment.lineColor,
            isHovered,
          );
          new L.Marker(midpoint, { icon: label }).addTo(labelGroup);
        }
      });

      if (lastLatLon && end) {
        createWalkPolyline([lastLatLon, [end.lat, end.lon]], isHovered).addTo(
          pathGroup,
        );
      }
    });

    return () => {
      map.removeLayer(pathGroup);
      map.removeLayer(labelGroup);
    };
  }, [routes, map, hovered, start, end]);

  return null;
};

export default MapRoutePainter;

import L from "leaflet";

export const marker = (text: string) => {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        display: inline-block;
      ">
        <div style="
          padding: 6px 10px;
          background-color: black;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          white-space: nowrap;
        ">${text}</div>
        <div style="
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 20px;
          background-color: black;
        "></div>
        <div style="
          position: absolute;
          bottom: -18px;
          left: 50%;
          border-radius: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background-color: black;
        "></div>
      </div>
    `,
    iconSize: [100, 50],
    iconAnchor: [25, 45],
    popupAnchor: [0, -23],
  });
};

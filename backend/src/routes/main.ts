import { Elysia, t } from "elysia";
import { csaCoordinateRouting } from "../main/csa";
import { preprocess } from "../main/preprocess";
import { ValidationError } from "../utils/errors";
import { StopGroup } from "../models/preprocessModels";

export const transitRouter = new Elysia()
  .state("preprocessedData", null as any)

  .post("/initialize", async ({ store }) => {
    store.preprocessedData = await preprocess();

    return { success: true };
  })
  .post(
    "/csa-route",
    async ({ body, store }) => {
      if (!store.preprocessedData) {
        throw new ValidationError(
          "System not initialized. Call /initialize first",
        );
      }

      const { lat1, lon1, lat2, lon2, startTime, endTime } = body;

      const result = await csaCoordinateRouting(
        lat1,
        lon1,
        lat2,
        lon2,
        startTime,
        endTime,
        store.preprocessedData.connections,
        store.preprocessedData.stopInfo,
        store.preprocessedData.stopsByGroup,
        store.preprocessedData.depRoutes,
        store.preprocessedData.fullRoutesByRoute,
        store.preprocessedData.additionalByDep,
        store.preprocessedData.routeGeometryByDep,
      );

      return result;
    },
    {
      body: t.Object({
        lat1: t.Numeric({ minimum: -90, maximum: 90 }),
        lon1: t.Numeric({ minimum: -180, maximum: 180 }),
        lat2: t.Numeric({ minimum: -90, maximum: 90 }),
        lon2: t.Numeric({ minimum: -180, maximum: 180 }),
        startTime: t.Numeric({ minimum: 0, maximum: 1440 }),
        endTime: t.Numeric({ minimum: 0, maximum: 1440 }),
        options: t.Optional(t.Object({})),
      }),
    },
  )
  .get("/stops", async ({ store }) => {
    const stopGroups = store.preprocessedData.stopGroups;
    const linesAtStopGroup = store.preprocessedData.linesAtStopGroup;
    const meanStopGroupLocation = store.preprocessedData.meanStopGroupLocation;
    return stopGroups.map((sg: StopGroup) => ({
      ...sg,
      lat: meanStopGroupLocation.get(sg.id).lat,
      lon: meanStopGroupLocation.get(sg.id).lon,
      lines: Array.from(linesAtStopGroup.get(sg.id) ?? []).sort(
        (a: string, b: string) => {
          const aNum = Number(a);
          const bNum = Number(b);

          const aIsNum = !Number.isNaN(aNum);
          const bIsNum = !Number.isNaN(bNum);

          if (aIsNum && bIsNum) return aNum - bNum;
          if (aIsNum) return -1;
          if (bIsNum) return 1;

          return a.localeCompare(b);
        },
      ),
    }));
  });

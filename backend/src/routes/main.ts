import { Elysia, t } from "elysia";
import { csaCoordinateRouting } from "../main/csa";
import { preprocess } from "../main/preprocess";
import { ValidationError } from "../utils/errors";

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
          "System not initialized. Call /initialize first"
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
        store.preprocessedData.routeGeometryByDep
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
    }
  );

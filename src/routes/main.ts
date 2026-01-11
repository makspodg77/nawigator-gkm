import { Elysia, t } from "elysia";
import { csaCoordinateRouting } from "../main/csa";
import { preprocess } from "../main/preprocess";
// Zaimportuj swoje klasy błędów, aby móc je rzucać
import { ValidationError, NotFoundError } from "../utils/errors";

export const transitRouter = new Elysia()
  .state("preprocessedData", null as any)
  .onError(({ code, error, set }) => {
    console.log("------------------------------------------------");
    console.log("🛑 FATAL ERROR CAUGHT IN ROUTER:");
    console.log(`CODE: ${code}`);
    console.log("ERROR DETAILS:", error);

    // Jeśli błąd to obiekt, spróbujmy go podejrzeć
    if (typeof error === "object") {
      try {
        console.log("JSON Error:", JSON.stringify(error, null, 2));
      } catch (e) {
        console.log("Nie można zserializować błędu.");
      }
    }
    console.log("------------------------------------------------");

    // Zwróć bezpieczną odpowiedź, żeby klient nie wisiał
    return {
      success: false,
      message: "Internal Server Error (Debug Mode)",
      debugError: String(error),
    };
  })
  // 1. Initialize Endpoint
  .post("/initialize", async ({ store }) => {
    console.log("\n" + "═".repeat(55));
    console.log("INITIALIZING TRANSIT ROUTING ENGINE");
    console.log("═".repeat(55) + "\n");

    console.log("📊 Preprocessing transit data...");
    store.preprocessedData = await preprocess();

    return { success: true };
  })

  // 2. CSA Routing Endpoint
  .post(
    "/csa-route",
    async ({ body, store }) => {
      // ZAMIANA: Zamiast return error(), rzucamy wyjątek.
      // To uruchomi Twój errorPlugin i console.log("piwio")
      if (!store.preprocessedData) {
        throw new ValidationError(
          "System not initialized. Call /initialize first"
        );
      }

      const { lat1, lon1, lat2, lon2 } = body;

      console.log(
        `🗺️ CSA routing from (${lat1}, ${lon1}) to (${lat2}, ${lon2})`
      );

      const result = await csaCoordinateRouting(
        lat1,
        lon1,
        lat2,
        lon2,
        store.preprocessedData.connections,
        store.preprocessedData.stopInfo,
        store.preprocessedData.stopsByGroup
      );

      // ZAMIANA: Tutaj również rzucamy błąd, jeśli trasa nie została znaleziona
      if (!result.success) {
        throw new NotFoundError(
          "No transit route found between these coordinates"
        );
      }

      return result;
    },
    {
      // Walidacja body (t.Numeric automatycznie rzuci błąd VALIDATION,
      // który Twój plugin też przechwyci!)
      body: t.Object({
        lat1: t.Numeric({ minimum: -90, maximum: 90 }),
        lon1: t.Numeric({ minimum: -180, maximum: 180 }),
        lat2: t.Numeric({ minimum: -90, maximum: 90 }),
        lon2: t.Numeric({ minimum: -180, maximum: 180 }),
        options: t.Optional(t.Object({})),
      }),
    }
  );

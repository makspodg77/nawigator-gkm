import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger"; // 1. Add this (bun add @elysiajs/swagger)
import { cors } from "@elysiajs/cors"; // 2. Add this (bun add @elysiajs/cors)
import { preprocess } from "./main/preprocess";
import { errorPlugin } from "./utils/errors";
import { transitRouter } from "./routes/main";

const port = 2137;

// Pre-startup logic
console.log("Building routing graph...");
const routingData = await preprocess();
console.log("✓ Routing graph ready");

const app = new Elysia()
  /* PLUGINS FIRST 
     Order matters: Load CORS and Swagger before your routes
  */ .use(errorPlugin)
  .use(cors()) // Allows your frontend (Vite) to call this backend
  .use(
    swagger({
      documentation: {
        info: {
          title: "Transit API Documentation",
          version: "1.0.0",
        },
      },
    })
  )

  // GLOBAL STATE
  .state("routingData", routingData)

  // ROUTES
  .get("/health", () => ({ ready: !!routingData }))
  .use(transitRouter)

  // PROTECTED ROUTES
  .guard({
    beforeHandle({ set, state }) {
      if (!state.routingData) {
        set.status = 503;
        return { error: "Data still loading..." };
      }
    },
  })

  .listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📖 Docs available at http://localhost:${port}/swagger`);
  });

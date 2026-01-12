import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { errorPlugin } from "./utils/errors";
import { transitRouter } from "./routes/main";

const port = 2137;

const app = new Elysia()
  .use(errorPlugin)
  .use(cors())
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

  .use(transitRouter)

  .listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📖 Docs available at http://localhost:${port}/swagger`);
  });

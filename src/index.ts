import "dotenv/config";
import { createApp } from "./app.js";

const token = process.env.SCIM_BEARER_TOKEN;
if (!token) {
  console.error("SCIM_BEARER_TOKEN is required (see .env.example)");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);
const { app } = createApp({ bearerToken: token });

app.listen(port, () => {
  console.log(`(Demonstration) SCIM 2.0 lab server listening on http://localhost:${port}`);
  console.log(`SCIM base: http://localhost:${port}/scim/v2`);
});
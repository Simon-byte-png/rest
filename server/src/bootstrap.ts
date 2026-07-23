import { createServer } from "./api/create-server.js";
import { buildServerDependencies } from "./composition.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const server = createServer(buildServerDependencies(config));

const close = async (signal: string): Promise<void> => {
  server.log.info({ signal }, "shutting down");
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void close("SIGINT");
});
process.on("SIGTERM", () => {
  void close("SIGTERM");
});

try {
  await server.listen({
    host: "0.0.0.0",
    port: config.PORT
  });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}

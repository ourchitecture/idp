import { resolveBffHost, resolveBffPort } from "./config";
import { createApp } from "./app";

async function start(): Promise<void> {
  const app = await createApp();
  const host = resolveBffHost();
  const port = resolveBffPort();

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ msg: "Received shutdown signal", signal });

    try {
      await app.close();
      process.exitCode = 0;
    } catch (error) {
      app.log.error({
        msg: "Failed to shutdown gracefully",
        error,
      });
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    await app.listen({
      port,
      host,
    });

    app.log.info({
      msg: "IDP BFF listening",
      host,
      port,
    });
  } catch (error) {
    app.log.error({
      msg: "Failed to start IDP BFF",
      error,
    });

    process.exitCode = 1;
    await app.close();
  }
}

void start();

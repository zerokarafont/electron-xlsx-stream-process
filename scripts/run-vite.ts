/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
import { createServer, InlineConfig, Plugin } from "vite";
import * as chalk from "chalk";
import config from "../vite.config";
import { consoleViteMessagePrefix, srcPath } from "./common";

function LoggerPlugin(): Plugin {
  return {
    name: "electron-scripts-logger",
    handleHotUpdate: (ctx) => {
      for (const file of ctx.modules) {
        // eslint-disable-next-line no-continue
        if (!file.file) continue;
        const path = file.file.replace(srcPath, "");
        console.log(
          chalk.yellow(consoleViteMessagePrefix),
          chalk.yellow("hmr update"),
          chalk.grey(path)
        );
      }
      return ctx.modules;
    },
  };
}

export async function startViteServer(): Promise<void> {
  const cfg = config as InlineConfig;
  const server = await createServer({
    ...cfg,
    configFile: false,
    logLevel: "silent",
    plugins: [...(cfg.plugins ?? []), LoggerPlugin()],
  });
  await server.listen();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const address = server.httpServer!.address();
  if (address && typeof address === "object") {
    const { port } = address;
    console.log(
      chalk.green(consoleViteMessagePrefix),
      chalk.green(`Dev server running at: localhost:${port}`)
    );
  }
}

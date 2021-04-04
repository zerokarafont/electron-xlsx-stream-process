/* eslint-disable no-console */
import { startViteServer } from "./run-vite";
import * as tscDev from "./dev-tsc";
import {
  cannotFoundTSConfigMessage,
  CompileError,
  finishMessage,
  formatDiagnosticsMessage,
  startMessage,
} from "./common";
import { startElectron } from "./run-electron";
// eslint-disable-next-line import/order
import chalk = require("chalk");

const VITE_OPTION = "--vite";

function reportError(errors: CompileError[]) {
  const reportingMessage = formatDiagnosticsMessage(errors);
  console.error(reportingMessage);
}

function buildStart() {
  console.log(startMessage);
}

function buildComplete(dir: string) {
  console.log(finishMessage);
  startElectron(dir);
}

function notFoundTSConfig() {
  console.error(chalk.red(cannotFoundTSConfigMessage));
  process.exit();
}

async function main() {
  // Start vite server
  if (process.argv.includes(VITE_OPTION)) {
    await startViteServer();
  }
  // Start dev for main process
  tscDev.watchMain(reportError, buildStart, buildComplete, notFoundTSConfig);
}

main();

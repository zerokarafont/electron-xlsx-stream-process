import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import { resolve } from "path";
import { outDirRenderer, rendererPath } from "./scripts/common";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh()],
  base: "./",
  publicDir: resolve(__dirname, "public"),
  root: rendererPath,
  build: {
    outDir: outDirRenderer,
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      {
        find: "@renderer",
        replacement: resolve(__dirname, "src/renderer"),
      },
      {
        find: "@common",
        replacement: resolve(__dirname, "src/common"),
      },
    ],
  },
});

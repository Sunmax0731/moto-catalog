import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || "/";
  const outDir = process.env.VITE_OUT_DIR || env.VITE_OUT_DIR || "dist";

  return {
    plugins: [react()],
    base,
    build: {
      outDir,
    },
  };
});

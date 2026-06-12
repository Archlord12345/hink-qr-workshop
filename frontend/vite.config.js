import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build statique -> dossier dist/ (qu'on enverra sur S3).
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
});

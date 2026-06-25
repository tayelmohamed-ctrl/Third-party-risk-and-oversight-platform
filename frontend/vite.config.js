import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server runs on http://localhost:5173 and the API is expected at
// http://localhost:3001. The data spec lives in ../spec and is imported
// directly as seeded offline fallback, so reads above root must be allowed.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [".."],
    },
  },
  preview: {
    host: "localhost",
    port: 5173,
  },
});

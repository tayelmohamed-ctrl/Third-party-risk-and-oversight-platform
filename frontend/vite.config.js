import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The data spec lives in ../spec and is imported directly as the source of
// truth, so the dev server must be allowed to read one level above root.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
  },
});

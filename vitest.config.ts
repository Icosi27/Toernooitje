import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true, // nodig voor auto-cleanup van @testing-library/react
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

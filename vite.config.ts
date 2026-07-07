import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // relatieve paden zodat de app ook op GitHub Pages (subpad) werkt
  base: "./",
  plugins: [react(), tailwindcss()],
});

import { VitePWA } from "vite-plugin-pwa";

export function createPwaPlugin() {
  return VitePWA({
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.ts",
    injectRegister: false,
    registerType: "prompt",
    includeAssets: ["favicon.svg", "icons/*.svg", "icons/*.png"],
    manifest: {
      name: "Jet Lag Map Companion",
      short_name: "Jetlag",
      description: "Live map annotations for Jet Lag Hide & Seek",
      theme_color: "#0E132C",
      background_color: "#0E132C",
      display: "standalone",
      orientation: "portrait",
      start_url: "/",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2}"],
    },
  });
}

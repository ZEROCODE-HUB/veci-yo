import { defineConfig, devices } from "@playwright/test";

/**
 * Cuarta suite: los recorridos en el navegador.
 *
 *   npm test                  unitarias. Lógica pura, sin red.
 *   npm run test:componentes  pantallas y componentes, en jsdom.
 *   npm run test:rls          contra el Supabase real, con sesiones de verdad.
 *   npm run test:e2e          la aplicación entera, en un navegador, como una persona.
 *
 * Usa la exportación web (`npm run e2e:exportar`, que deja `dist-e2e`) contra
 * el Supabase real y el edificio de pruebas. Una a una (`workers: 1`): las
 * pruebas preparan datos en las mismas viviendas, y en paralelo se pisarían.
 *
 * Con `E2E_URL` se puede apuntar a otra dirección, por ejemplo a Expo en
 * marcha (`http://localhost:8081`) para no exportar en cada cambio.
 */
const URL_E2E = process.env.E2E_URL ?? "http://localhost:8090";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 7"],
    baseURL: URL_E2E,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "e2e/resultados",
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: "node e2e/servidor.mjs",
        url: URL_E2E,
        reuseExistingServer: true,
      },
});

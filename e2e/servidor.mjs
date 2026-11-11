/**
 * Sirve la exportación web (`dist-e2e`) para los recorridos en el navegador.
 * Lo que no es un archivo devuelve `index.html`, que es lo que hace Vercel
 * con la aplicación: las rutas las resuelve ella.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..", "dist-e2e");
const PUERTO = Number(process.env.PUERTO_E2E ?? 8090);
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  let archivo = join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(archivo)).isFile()) throw new Error("no es archivo");
  } catch {
    archivo = join(RAIZ, "index.html");
  }
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream" });
    res.end(cuerpo);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PUERTO, () => console.log(`e2e en http://localhost:${PUERTO}`));

/**
 * Qué ilustración le toca a una zona.
 *
 * En la maqueta cada zona lleva su dibujo redondo (piscina, parque, gimnasio…)
 * y en la aplicación salía un emoji: la lista buscaba el dibujo por el **id**
 * de la zona, que en la maqueta era «piscina» y en la base es un uuid, así que
 * no lo encontraba nunca (comparación con la maqueta, 16/10/2026).
 *
 * Se busca, en este orden: la clave que eligió la administración (la columna
 * `emoji` guarda la clave del icono, o un emoji en las zonas antiguas) y el
 * nombre de la zona («Piscina», «Lavandería 2»). Sin coincidencia, `null`: se
 * queda el emoji.
 */
const CLAVES = ["piscina", "parque", "bbq", "gym", "coworking", "tenis", "sala-juegos", "lavanderia"];

const PARECIDOS: Record<string, string> = {
  gimnasio: "gym",
  parrilla: "bbq",
  asador: "bbq",
  tennis: "tenis",
  juegos: "sala-juegos",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function claveDeIcono(zona: { emoji?: string | null; nombre?: string | null }): string | null {
  const elegida = normalizar(zona.emoji ?? "").trim();
  if (CLAVES.includes(elegida)) return elegida;

  const nombre = normalizar(zona.nombre ?? "");
  const directa = CLAVES.find((clave) => nombre.includes(clave.replace("-", " ")) || nombre.includes(clave));
  if (directa) return directa;
  const parecida = Object.keys(PARECIDOS).find((palabra) => nombre.includes(palabra));
  return parecida ? PARECIDOS[parecida] : null;
}

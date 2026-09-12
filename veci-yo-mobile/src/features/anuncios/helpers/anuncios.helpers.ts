import type { Anuncio } from "../types/anuncios";

export const TODOS_DEPARTAMENTOS = [
  "A100",
  "A101",
  "A102",
  "A103",
  "A138",
  "A158",
  "A177",
  "B100",
  "B101",
  "B102",
  "B120",
  "B143",
  "B991",
  "C100",
  "C101",
  "C102",
  "C103",
  "C108",
  "C183",
];

export function parseAnuncioDate(dateStr: string) {
  const [day, month, year] = dateStr.split("/");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isAnuncioVotingClosed(anuncio?: Anuncio) {
  if (!anuncio?.votacion || !anuncio.fechaFinalizacion) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseAnuncioDate(anuncio.fechaFinalizacion) < today;
}

export function getDepartamentosNoVotaron(anuncio?: Anuncio) {
  if (!anuncio?.votacion || !isAnuncioVotingClosed(anuncio)) return [];
  const votaron = new Set([
    ...(anuncio.votosSi || []),
    ...(anuncio.votosNo || []),
  ]);
  return TODOS_DEPARTAMENTOS.filter(
    (departamento) => !votaron.has(departamento),
  );
}

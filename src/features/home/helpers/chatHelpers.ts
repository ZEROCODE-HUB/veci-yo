export function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// `filtrarPersonas`, `getAvatarEmoji`, `TORRES_FILTER_OPTIONS` y
// `DEPTOS_FILTER_OPTIONS` se fueron con los mocks: las personas y las unidades
// salen de la base, y el emoji lo decide el tipo de conversacion en
// `chat.repo.ts`.

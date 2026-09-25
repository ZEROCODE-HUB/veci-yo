/**
 * Buscar un texto que react-native-web parte en varios nodos.
 *
 * `<Text>` con hijos --«{horario} · N°{numero}»-- se renderiza como un `div`
 * con varios `div` dentro, uno por trozo. Así que `getByText("06:00 - 07:00 ·
 * N°2")` no encuentra nada aunque en pantalla se lea exactamente eso.
 *
 * La salida fácil sería partir la prueba en trozos --buscar «06:00» por un
 * lado y «N°2» por otro--, y entonces dejaría de comprobar lo que importa:
 * que se lean **juntos**. Un usuario lee la frase, no los nodos.
 *
 * Se descarta el elemento que solo contiene el texto a través de sus hijos,
 * porque si no cada frase aparece dos o tres veces --el `div` de fuera y el
 * de dentro-- y `getByText` falla por ambigua.
 */
export function textoCompleto(esperado: string | RegExp) {
  const normaliza = (valor: string | null | undefined) =>
    (valor ?? "").replace(/\s+/g, " ").trim();

  return (_contenido: string, elemento: Element | null) => {
    if (!elemento) return false;
    const texto = normaliza(elemento.textContent);
    if (!texto) return false;

    const algunHijoLoTieneEntero = Array.from(elemento.children).some(
      (hijo) => normaliza(hijo.textContent) === texto,
    );
    if (algunHijoLoTieneEntero) return false;

    return typeof esperado === "string"
      ? texto === esperado
      : esperado.test(texto);
  };
}

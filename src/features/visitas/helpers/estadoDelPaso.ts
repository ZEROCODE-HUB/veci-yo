/** Lo que el timeline de un invitado sabe de cada paso. */
export interface TimelineDeInvitado {
  [clave: string]: unknown;
  verificacionAprobada?: boolean | null;
}

/**
 * En que punto esta un paso del preregistro de un huesped.
 *
 * **Dos estados, no tres: o paso, o todavia no.**
 *
 * La version anterior tenia un tercero, «rechazado», para los terminos y
 * condiciones: si `terminosAceptados` venia `false`, pintaba una ❌ roja. Y
 * `invitado.terminos_aceptados` es `boolean not null default false`, con cero
 * sentencias en todo el esquema que lo pongan en `false` --las cuatro
 * funciones del precheckin solo saben ponerlo en `true`-- asi que ese `false`
 * es «no ha abierto su enlace todavia», no «se nego».
 *
 * Resultado: un huesped recien invitado salia con una ❌ y, al lado, un boton
 * «Aprobar por excepcion» que se lee como saltarse una negativa que nunca
 * existio. Lo vio el cliente el 09/10/2026 al crear sus primeros huespedes.
 *
 * El tercer estado no estaba en el dato: se lo inventaba la pantalla. Si algun
 * dia el producto quiere que un huesped pueda **negarse**, eso es una columna
 * nueva --o un `null` que hoy la columna no admite-- y entonces vuelve aqui.
 *
 * Vive aparte y pura por lo de siempre: dentro del `map` del JSX es una regla
 * que nadie puede comprobar sin montar media pantalla.
 */
export function estadoDelPaso(
  timeline: TimelineDeInvitado,
  clave: string,
): "aprobado" | "pendiente" {
  /*
    La verificacion de antecedentes tiene dos formas de estar superada: que el
    proveedor la apruebe, o que la administracion la apruebe a mano. Las dos
    cuentan, y por eso se miran las dos claves.
  */
  if (clave === "verificacionPasada") {
    return timeline.verificacionAprobada === true || Boolean(timeline[clave])
      ? "aprobado"
      : "pendiente";
  }
  return timeline[clave] ? "aprobado" : "pendiente";
}

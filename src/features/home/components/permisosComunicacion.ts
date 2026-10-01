/**
 * Quién puede usar el chat y las llamadas internas.
 *
 * El KT lo dice sin rodeos en la tabla de roles: la portería tiene
 * «chat/llamadas **si el Administrador se lo habilita**». Son `permisoChat` y
 * `permisoLlamadas`, dos interruptores en la pantalla de Seguridad.
 *
 * No los miraba nadie: el botón flotante de comunicaciones se pintaba igual
 * para todos los roles, así que un guardia con los dos apagados seguía teniendo
 * chat y llamadas. Los interruptores del administrador eran decoración —el
 * séptimo y el octavo caso de lo mismo en este proyecto—. La consulta de sesión
 * ni siquiera cargaba la columna.
 *
 * La regla vive aquí y no dentro del componente para poder invertirla en una
 * prueba: una casilla que expresa un permiso necesita una que compruebe que el
 * comportamiento cambia, o está decorativa por definición.
 */
export interface PermisosComunicacion {
  puedeChatear: boolean;
  puedeLlamar: boolean;
}

export function permisosDeComunicacion(params: {
  /** El rol con el que se está operando ahora mismo. */
  rolActivo: string | null;
  /** `membresia_condominio.permisos` de la membresía de portería, si la hay. */
  permisos: Record<string, unknown> | undefined;
}): PermisosComunicacion {
  /*
    Solo se recorta a la portería. Para un residente estas dos vías no dependen
    de ningún permiso, y quitárselas sería inventar una regla que nadie pidió.
  */
  if (params.rolActivo !== "guardia") {
    return { puedeChatear: true, puedeLlamar: true };
  }

  const permisos = params.permisos ?? {};
  // Un permiso se concede, no se supone: cualquier cosa que no sea `true`
  // —ausente, `null`, `"si"`— cuenta como no habilitado.
  return {
    puedeChatear: permisos.chat === true,
    puedeLlamar: permisos.llamadas === true,
  };
}

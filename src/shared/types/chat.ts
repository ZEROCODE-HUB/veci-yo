export interface MensajeChat {
  id: number | string;
  /** El nombre de quien escribio. Siempre el nombre, tambien el propio. */
  de: string;
  /**
   * Si lo escribio quien esta en sesion. Decide a que lado va la burbuja.
   *
   * Iba dentro de `de`, que valia el literal `"yo"` para los propios. En una
   * conversacion de dos no se notaba --el nombre del autor no se pinta-- pero
   * en un grupo si: el autor de mis propios mensajes salia escrito **«yo»**,
   * en minuscula, al lado de su depto. Visto en el navegador el 05/10/2026.
   *
   * Es el defecto de «un dato no se guarda ya formateado», con un centinela
   * en lugar de un separador: un campo que significaba dos cosas, y la
   * segunda se colo en la pantalla.
   */
  esMio: boolean;
  texto: string;
  hora: string;
  fecha: string;
  avatarEmoji?: string;
  leido: boolean;
  persona?: string;
  /**
   * El depto desde el que se escribio, congelado al enviar.
   *
   * Null para quien no vive en el condominio --la administracion, la
   * porteria--. Lo deriva la base: `autor_nombre` lo manda el cliente, y el
   * depto no se le deja poner a nadie.
   */
  unidad?: string | null;
  /**
   * Quién lo retiró, cuando se retiró. `null` mientras sigue publicado.
   *
   * Decide qué lápida se pinta, y la diferencia importa: «Mensaje retirado» es
   * alguien que se arrepintió de lo que dijo, y «Mensaje retirado por la
   * administración» es moderación. Sin distinguirlas, el hueco en la
   * conversación no explica nada.
   *
   * Cuando viene con valor, `texto` llega **vacío**: el texto de un mensaje
   * retirado no sale de la base (ver `mensajes_de_conversacion`).
   */
  retiradoPor?: "autor" | "administracion" | null;
}

export interface GrupoChat {
  id: string;
  tipo: 'residentes' | 'personal' | 'admin';
  nombre: string;
  avatarEmoji: string;
  mensajes: MensajeChat[];
}

export interface LlamadaHistorial {
  id: string;
  tipo: 'entrante' | 'saliente' | 'perdida';
  contacto: string;
  duracion: string;
  hora: string;
  fecha: string;
}

export interface Conversation {
  id: string;
  tipo: 'individual' | 'grupo';
  nombre: string;
  ultimoMensaje: string;
  ultimaHora: string;
  ultimaFecha: string;
  avatarEmoji: string;
  noLeidos: number;
  grupoId?: string;
  /**
   * Cuando se envio el ultimo mensaje, en ISO. Ordena la lista.
   *
   * El repositorio lo ponia y el tipo no lo declaraba, asi que el `as
   * Conversation` del mapeo lo borraba: el `sort` que lee este campo compilaba
   * por el `any` de la fila, y cualquiera que leyera el tipo creeria que la
   * lista no se puede ordenar por fecha.
   */
  ultimoEnviadoEn?: string | null;
  /**
   * Si esta persona silencio la conversacion.
   *
   * Lo unico que Veciyo avisa hoy de un mensaje es el contador de no leidos,
   * asi que silenciar es ponerlo a cero --y decirlo en la lista, que si no
   * seria un interruptor que no se nota--.
   */
  silenciado?: boolean;
  /** Un canal retirado. No se puede escribir en el; lo dicho se conserva. */
  archivado?: boolean;
  /**
   * De que area es el hilo, cuando lo es: `seguridad` o `administracion`.
   *
   * Esta aqui porque el filtro de la porteria decidia **leyendo el titulo**
   * --`nombre.startsWith("Seguridad")`-- y eso es el mismo defecto que ya
   * costo el borde de «esta en turno»: dos sitios poniendose de acuerdo en un
   * texto. El dia que la etiqueta diga «Porteria» en vez de «Seguridad», la
   * pestaña se vacia sola y nadie sabe por que.
   */
  area?: string | null;
  /** El codigo de la vivienda del hilo --«301»--, cuando lo tiene. */
  unidadCodigo?: string | null;
}

export interface Notificacion {
  id: number;
  emoji: string;
  titulo: string;
  mensaje: string;
  hora: string;
  fecha: string;
  leida: boolean;
}

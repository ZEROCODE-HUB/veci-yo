import type { PermisoVivienda } from "@/shared/types";

/**
 * Qué pasa con un permiso que nadie ha decidido.
 *
 * En módulo propio y sin dependencias a propósito: es una regla, no un acceso
 * a datos, y tenerla junto al repositorio la dejaba fuera del alcance de las
 * pruebas --el repositorio importa el cliente de Supabase, que arrastra React
 * Native, y en Node no se puede cargar--. Una regla que no se puede probar es
 * una regla que se separa de su gemela sin que nadie lo note, que es
 * exactamente lo que pasó aquí.
 */

/** NULL = sin decidir, y sin decidir no se prohíbe. */
export const permitido = (valor: boolean | null | undefined) => valor ?? true;

/**
 * Lo que ve la pantalla mientras el condominio no haya configurado nada.
 *
 * **Todas las banderas empiezan en permitido**, y eso no es una preferencia:
 * es la misma regla que ya aplica la capa de datos. Desde 20260923130000 las
 * columnas admiten NULL --nadie lo ha decidido-- y `permitido()` lo traduce a
 * `true`, porque un condominio que no ha dicho nada no está prohibiendo nada.
 *
 * Aquí decían lo contrario: `huespedesTemporales: false`,
 * `corta.permiteVisitas: false`, `entregaDirecta: false`. Dos sitios
 * decidiendo lo mismo con criterios opuestos, cada uno coherente consigo
 * mismo, que es el defecto que más veces ha salido en este proyecto.
 *
 * La consecuencia caía justo en el trabajo del administrador: en un edificio
 * **recién dado de alta** no hay fila, así que el formulario arrancaba con
 * todo prohibido, y pulsar «Guardar» sin tocar nada apagaba la renta corta
 * del condominio entero y prohibía las visitas de estancia corta. Nadie lo
 * habría decidido y nadie sabría por qué dejó de funcionar.
 *
 * Los números son otra cosa y se quedan como están: el KT (flujo 4.1 paso 5)
 * manda tratarlos como advertencia, no como bloqueo.
 */
export const PERMISOS_INICIALES: PermisoVivienda = {
  entregaDirecta: true,
  huespedesTemporales: true,
  diferenciaEstancia: false,
  estanciaCorta: {
    permiteVisitas: true,
    permiteHuespedNinos: true,
    permiteMascotas: true,
    permiteCocherasVisit: true,
    estanciaMinima: 1,
    estanciaMaxima: null,
    horarioCheckin: "",
  },
  estanciaLarga: {
    permiteVisitas: true,
    permiteHuespedNinos: true,
    permiteMascotas: true,
    permiteCocherasVisit: true,
    estanciaMinima: 1,
    estanciaMaxima: null,
    horarioCheckin: "",
  },
};

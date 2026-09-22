import { supabase } from "@/shared/services/supabase";
import type { Guardia, Turno, TurnoOverride } from "@/shared/types";
import type { Porteria } from "@/stores/admin-store";

/**
 * Guardias del condominio.
 *
 * Un guardia es una `membresia_condominio` con rol 'guardia', no una tabla
 * aparte: es una persona con un rol, igual que el administrador. Su portería es
 * una FK, lo que resuelve el campo `garita` que era texto libre y que la sesión
 * del 22/07/2026 pidió renombrar por ser un término regional — al ser relación,
 * el nombre visible pasa a ser un dato y la decisión deja de bloquear.
 *
 * Los turnos eran arrays embebidos con el día de la semana como texto
 * ('Lunes', 'Miercoles' sin tilde). Ahora son tablas con el día como entero.
 */

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DIA_A_NUMERO: Record<string, number> = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  "Miércoles": 3,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  "Sábado": 6,
  Sabado: 6,
};

const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : "");

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function mapearGuardia(fila: any): Guardia {
  const turnos: Turno[] = (fila.turnos ?? [])
    .slice()
    .sort((a: any, b: any) => a.dia_semana - b.dia_semana)
    .map((t: any) => ({
      uuid: t.id,
      dia: DIAS[t.dia_semana] ?? "",
      hora: `${hhmm(t.hora_inicio)} - ${hhmm(t.hora_fin)}`,
    }));

  const overrides: TurnoOverride[] = (fila.overrides ?? []).map((o: any) => ({
    uuid: o.id,
    fecha: o.fecha,
    horaInicio: hhmm(o.hora_inicio),
    horaFin: hhmm(o.hora_fin),
  }));

  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    // El nombre viaja en la membresia: `perfil` es privado y guarda el
    // documento de identidad, que el administrador no tiene por que ver.
    nombre: fila.nombre ?? "Sin nombre",
    correo: "",
    cedula: fila.documento ?? "",
    garita: fila.porteria?.nombre ?? "",
    porteriaId: fila.porteria_id ?? undefined,
    diasCalendario: turnos.map((t) => t.dia).join(", "),
    turnos,
    overrides,
    permisoChat: Boolean(fila.permisos?.chat),
    permisoLlamadas: Boolean(fila.permisos?.llamadas),
    rotacionActiva: fila.rotacion_activa ?? false,
    tipoRotacion: fila.tipo_rotacion ?? "",
  } as Guardia;
}

const SELECT = `
  id, porteria_id, documento, permisos, rotacion_activa, tipo_rotacion, activo, nombre,
  porteria:porteria_id ( id, nombre ),
  turnos:turno_guardia ( id, dia_semana, hora_inicio, hora_fin ),
  overrides:turno_override ( id, fecha, hora_inicio, hora_fin )
`;

export interface Seguridad {
  guardias: Guardia[];
  porterias: Porteria[];
}

export async function obtenerSeguridad(
  condominioId: string,
): Promise<Seguridad> {
  const [guardias, porterias] = await Promise.all([
    supabase
      .from("membresia_condominio")
      .select(SELECT)
      .eq("condominio_id", condominioId)
      .eq("rol", "guardia")
      .eq("activo", true),
    supabase
      .from("porteria")
      .select("id, nombre, tipo, ubicacion, telefono")
      .eq("condominio_id", condominioId)
      .is("deleted_at", null)
      .order("nombre"),
  ]);

  if (guardias.error) throw guardias.error;
  if (porterias.error) throw porterias.error;

  return {
    guardias: (guardias.data ?? []).map(mapearGuardia),
    porterias: (porterias.data ?? []).map((p: any) => ({
      uuid: p.id,
      id: idNumerico(p.id),
      nombre: p.nombre,
      tipo: p.tipo,
      ubicacion: p.ubicacion ?? "",
      telefono: p.telefono ?? "",
    })) as unknown as Porteria[],
  };
}

/** Permisos que el administrador concede al guardia: chat y llamadas. */
export async function actualizarGuardia(
  membresiaUuid: string,
  datos: {
    porteriaId?: string | null;
    documento?: string;
    permisoChat?: boolean;
    permisoLlamadas?: boolean;
    rotacionActiva?: boolean;
    tipoRotacion?: string;
  },
) {
  const cambios: Record<string, any> = {};
  if (datos.porteriaId !== undefined) cambios.porteria_id = datos.porteriaId;
  if (datos.documento !== undefined) cambios.documento = datos.documento;
  if (datos.rotacionActiva !== undefined)
    cambios.rotacion_activa = datos.rotacionActiva;
  if (datos.tipoRotacion !== undefined) cambios.tipo_rotacion = datos.tipoRotacion;

  if (datos.permisoChat !== undefined || datos.permisoLlamadas !== undefined) {
    const { data: actual } = await supabase
      .from("membresia_condominio")
      .select("permisos")
      .eq("id", membresiaUuid)
      .maybeSingle();

    cambios.permisos = {
      ...((actual?.permisos as Record<string, unknown>) ?? {}),
      ...(datos.permisoChat !== undefined ? { chat: datos.permisoChat } : {}),
      ...(datos.permisoLlamadas !== undefined
        ? { llamadas: datos.permisoLlamadas }
        : {}),
    };
  }

  const { error } = await supabase
    .from("membresia_condominio")
    .update(cambios as never)
    .eq("id", membresiaUuid);
  if (error) throw error;
}

/** Baja logica: el historial de visitas sigue apuntando a quien las registro. */
export async function darDeBajaGuardia(membresiaUuid: string) {
  const { error } = await supabase
    .from("membresia_condominio")
    .update({ activo: false })
    .eq("id", membresiaUuid);
  if (error) throw error;
}

export async function guardarTurnos(
  membresiaUuid: string,
  turnos: Array<{ dia: string; horaInicio: string; horaFin: string }>,
) {
  // Se reemplaza el horario completo: es como lo edita la pantalla.
  const { error: errorBorrado } = await supabase
    .from("turno_guardia")
    .delete()
    .eq("membresia_id", membresiaUuid);
  if (errorBorrado) throw errorBorrado;

  if (!turnos.length) return;

  const { error } = await supabase.from("turno_guardia").insert(
    turnos.map((t) => ({
      membresia_id: membresiaUuid,
      dia_semana: DIA_A_NUMERO[t.dia] ?? 0,
      hora_inicio: t.horaInicio,
      hora_fin: t.horaFin,
    })),
  );
  if (error) throw error;
}

/** Ajuste puntual de un dia. Sin horas significa que ese dia no trabaja. */
export async function guardarOverride(
  membresiaUuid: string,
  fecha: string,
  horaInicio?: string,
  horaFin?: string,
  motivo?: string,
) {
  const { data: existente } = await supabase
    .from("turno_override")
    .select("id")
    .eq("membresia_id", membresiaUuid)
    .eq("fecha", fecha)
    .maybeSingle();

  const valores = {
    hora_inicio: horaInicio || null,
    hora_fin: horaFin || null,
    motivo: motivo || null,
  };

  if (existente) {
    const { error } = await supabase
      .from("turno_override")
      .update(valores)
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("turno_override")
    .insert({ membresia_id: membresiaUuid, fecha, ...valores });
  if (error) throw error;
}

export async function quitarOverride(overrideUuid: string) {
  const { error } = await supabase
    .from("turno_override")
    .delete()
    .eq("id", overrideUuid);
  if (error) throw error;
}

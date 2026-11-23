import { View } from "react-native";
import { useTrabajadoresDeLaVivienda } from "@/features/propietario/hooks/useTrabajadoresDeLaVivienda";
import { ListaDeTrabajadores } from "@/features/propietario/components/invitar/ListaDeTrabajadores";

/**
 * El profesional permanente de esta visita, con lo que se puede hacer con él:
 * en qué va, «Editar privilegios», «Reenviar invitación» y «Dar de baja»
 * (23/11/2026, pedido del cliente: «añadir estas opciones a la sección visitas
 * directamente, a la vista del profesional permanente»).
 *
 * Solo sale a quien gestiona la vivienda: a los demás la base no les da su
 * situación, y entonces no se pinta nada.
 */
export function ProfesionalDeLaVisita({ visitaId, unidadId }: { visitaId: string; unidadId: string }) {
  const t = useTrabajadoresDeLaVivienda(unidadId);
  const id = Object.keys(t.situacion).find((k) => t.situacion[k].visitaId === visitaId);
  const trabajador = t.trabajadores.find((x) => x.id === id);
  if (!trabajador) return null;

  return (
    <View className="gap-1">
      <ListaDeTrabajadores
        titulo="Profesional permanente"
        trabajadores={[trabajador]}
        situacion={t.situacion}
        onDarDeBaja={t.darDeBaja}
        dandoDeBajaId={t.dandoDeBajaId}
        onCambiarPermisos={t.cambiarPermisos}
        guardandoPermisos={t.guardandoPermisos}
        onReenviar={t.reenviarInvitacion}
        reenviandoId={t.reenviandoId}
      />
    </View>
  );
}

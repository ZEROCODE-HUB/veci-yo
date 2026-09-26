import { useUIStore } from "@/stores/ui-store";
import { theme } from "@/config";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import type { Guardia, Turno } from "@/shared/types";
import { PageHeader } from "@/shared/layouts";
import { formatRangoHoras } from "@/shared/utils";
import {
  GuardiaForm,
  GuardiasList,
  SeguridadActionOverlays,
  GuardiaConfirmation,
  SeguridadFilters,
  GuardiaTurnosModal,
} from "../components/seguridad";
import { useAdministradorSeguridad } from "../hooks";
import {
  emptyGuardiaForm,
  guardiaToForm,
  type GuardiaFormValues,
  type SecurityView,
} from "../types";
import { shiftOfHour } from "../helpers/seguridad.helpers";

export function AdministradorSeguridadScreen() {
  const { guardias, porterias, updateGuardia, deleteGuardia, saveTurnos } =
    useAdministradorSeguridad();
  const addToast = useUIStore((s) => s.addToast);
  const [view, setView] = useState<SecurityView>("list");
  const [editing, setEditing] = useState<Guardia | null>(null);
  const [draftForm, setDraftForm] = useState<GuardiaFormValues>(() =>
    emptyGuardiaForm(porterias[0]?.nombre || ""),
  );
  const [filterSchedule, setFilterSchedule] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [menuGuardia, setMenuGuardia] = useState<Guardia | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guardia | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnsTarget, setTurnsTarget] = useState<Guardia | null>(null);

  const filteredGuardias = useMemo(
    () =>
      guardias.filter((guardia) => {
        const matchesSchedule =
          !filterSchedule ||
          guardia.turnos.some(
            (turno) =>
              formatRangoHoras(turno.horaInicio, turno.horaFin) ===
              filterSchedule,
          );
        const matchesShift =
          !filterShift ||
          guardia.turnos.some(
            (turno) => shiftOfHour(turno.horaInicio) === filterShift,
          );
        const matchesDay =
          !filterDay || guardia.turnos.some((turno) => turno.dia === filterDay);
        return matchesSchedule && matchesShift && matchesDay;
      }),
    [guardias, filterSchedule, filterShift, filterDay],
  );

  /*
    El horario, a la base.
    `saveTurnos` estaba importado del hook y **nadie lo llamaba**: ni el modal
    de rotacion ni la confirmacion del formulario, que son los dos sitios donde
    se edita. Se guardaban los permisos, la porteria y el documento; el horario
    se quedaba en el estado de la pantalla y desaparecia al cerrar.
  */
  const guardarHorario = (uuid: string, turnos: Turno[]) => {
    saveTurnos(
      uuid,
      turnos
        .filter((turno) => turno.dia && turno.horaInicio)
        .map((turno) => ({
          dia: turno.dia,
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
        })),
    );
  };

  const openCreate = () => {
    setEditing(null);
    setDraftForm(emptyGuardiaForm(porterias[0]?.nombre || ""));
    setView("form");
  };

  const openEdit = (guardia: Guardia) => {
    setEditing(guardia);
    setDraftForm(guardiaToForm(guardia));
    setMenuGuardia(null);
    setView("form");
  };

  const submitForm = (form: GuardiaFormValues) => {
    setDraftForm(form);
    if (editing) {
      setView("confirmation");
      return;
    }
    // Un guardia necesita cuenta para iniciar sesion, asi que el alta es una
    // invitacion por correo, no un insert directo. La pantalla de invitaciones
    // es la que la emite; aqui solo se gestiona a quien ya es miembro.
    addToast(
      "Para dar de alta un guardia, invitalo por correo desde Coadministradores",
      "info",
    );
    setView("list");
  };

  const confirmEdit = () => {
    // Solo se actualiza lo que es del ROL en el condominio. El nombre y el
    // documento de la persona viven en su perfil y no se editan desde aqui.
    if (editing?.uuid) {
      updateGuardia(editing.uuid, {
        porteriaId:
          porterias.find((p) => p.nombre === draftForm.garita)?.uuid ?? null,
        documento: draftForm.cedula,
      });
      guardarHorario(editing.uuid, draftForm.turnos);
    }
    setView("list");
  };

  const handleUpdateGuardia = (guardia: Guardia) => {
    if (guardia.uuid) {
      updateGuardia(guardia.uuid, {
        permisoChat: guardia.permisoChat,
        permisoLlamadas: guardia.permisoLlamadas,
        rotacionActiva: guardia.rotacionActiva,
        tipoRotacion: guardia.tipoRotacion,
      });
      guardarHorario(guardia.uuid, guardia.turnos);
    }
    setTurnsTarget(guardia);
  };

  if (view === "form") {
    return (
      <GuardiaForm
        editing={editing}
        initial={draftForm}
        porterias={porterias}
        onBack={() => setView("list")}
        onSubmit={submitForm}
      />
    );
  }

  if (view === "confirmation" && editing) {
    return (
      <GuardiaConfirmation
        form={draftForm}
        onBack={() => setView("form")}
        onConfirm={confirmEdit}
      />
    );
  }

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader
        title="Seguridad del condominio"
        action={
          <Pressable
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Añadir guardia"
            className="items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: theme.colors.warning,
            }}
          >
            <Ionicons name="add" size={27} color={theme.colors.textInverse} />
          </Pressable>
        }
      />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <SeguridadFilters
          filterSchedule={filterSchedule}
          filterShift={filterShift}
          filterDay={filterDay}
          onScheduleChange={setFilterSchedule}
          onShiftChange={setFilterShift}
          onDayChange={setFilterDay}
          onClear={() => {
            setFilterSchedule("");
            setFilterShift("");
            setFilterDay("");
          }}
        />
        <GuardiasList guardias={filteredGuardias} onMenu={setMenuGuardia} />
      </ScrollView>

      <SeguridadActionOverlays
        menuGuardia={menuGuardia}
        success={success}
        createdName={draftForm.nombre}
        deleteTarget={deleteTarget}
        onCloseMenu={() => setMenuGuardia(null)}
        onEdit={openEdit}
        onManageShifts={(guardia) => {
          setTurnsTarget(guardia);
          setMenuGuardia(null);
        }}
        onRequestDelete={(guardia) => {
          setDeleteTarget(guardia);
          setMenuGuardia(null);
        }}
        onCloseSuccess={() => setSuccess(false)}
        onCloseDelete={() => setDeleteTarget(null)}
        onConfirmDelete={() => {
          if (deleteTarget) deleteGuardia(deleteTarget.uuid ?? "");
          setDeleteTarget(null);
        }}
      />
      <GuardiaTurnosModal
        guardia={turnsTarget}
        onClose={() => setTurnsTarget(null)}
        onUpdate={handleUpdateGuardia}
      />
    </View>
  );
}

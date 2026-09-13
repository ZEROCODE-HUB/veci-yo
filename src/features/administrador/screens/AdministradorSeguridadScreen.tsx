import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import type { Guardia } from "@/shared/types";
import { PageHeader } from "@/shared/layouts";
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
  const { data, createGuardia, updateGuardia, deleteGuardia } =
    useAdministradorSeguridad();
  const [view, setView] = useState<SecurityView>("list");
  const [editing, setEditing] = useState<Guardia | null>(null);
  const [draftForm, setDraftForm] = useState<GuardiaFormValues>(() =>
    emptyGuardiaForm(data.porterias[0]?.nombre || ""),
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
      data.guardias.filter((guardia) => {
        const matchesSchedule =
          !filterSchedule ||
          guardia.turnos.some((turno) => turno.hora === filterSchedule);
        const matchesShift =
          !filterShift ||
          guardia.turnos.some(
            (turno) => shiftOfHour(turno.hora) === filterShift,
          );
        const matchesDay =
          !filterDay || guardia.turnos.some((turno) => turno.dia === filterDay);
        return matchesSchedule && matchesShift && matchesDay;
      }),
    [data.guardias, filterSchedule, filterShift, filterDay],
  );

  const openCreate = () => {
    setEditing(null);
    setDraftForm(emptyGuardiaForm(data.porterias[0]?.nombre || ""));
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
    createGuardia.mutate(form);
    setSuccess(true);
    setView("list");
  };

  const confirmEdit = () => {
    if (editing) updateGuardia.mutate({ ...editing, ...draftForm });
    setView("list");
  };

  const handleUpdateGuardia = (guardia: Guardia) => {
    updateGuardia.mutate(guardia);
    setTurnsTarget(guardia);
  };

  if (view === "form") {
    return (
      <GuardiaForm
        editing={editing}
        initial={draftForm}
        porterias={data.porterias}
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
          <Pressable onPress={openCreate}>
            <Ionicons name="add-circle" size={27} color="#F5B800" />
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
          if (deleteTarget) deleteGuardia.mutate(deleteTarget);
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

import React, { useMemo, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollView, Text, View } from "react-native";
import {
  Button,
  CampoFecha,
  CampoHora,
  EtiquetaDelCampo,
  ImageUploadCard,
  Input,
  Modal,
  Select,
  Tabs,
  Toggle,
} from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { crearGestionZonaSchema } from "../../schemas/gestionZona.schema";
import {
  DIAS_ZONA,
  TIPOS_FECHA_ESPECIAL,
  TIPOS_ZONA,
  type GestionZonaFormValues,
} from "../../types/gestionZona";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";
import { GaleriaDeIconos } from "./GaleriaDeIconos";
import { useFormatoDeArchivo } from "@/shared/hooks/useFormatoDeArchivo";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useMonedas } from "@/shared/hooks/useMonedas";
import { ahora } from "@/shared/utils/reloj.util";
import { textoDelPlazo } from "@/features/zonas/helpers/textoDelPlazo";

const TIPO_A_ID: Record<string, string> = {
  Barbecue: "bbq",
  "Swimming Pool": "piscina",
  "Children's Park": "parque",
  Gym: "gym",
  "Coworking Space": "coworking",
  "Tennis Court": "tenis",
  "Game Room": "sala-juegos",
  "Laundry Room": "lavanderia",
};

/** Del plazo del comprobante: 0 a 72 horas, y minutos de 5 en 5. */
const OPCIONES_DE_HORAS = Array.from({ length: 73 }, (_, h) => ({ value: String(h), label: `${h} h` }));
const OPCIONES_DE_MINUTOS = Array.from({ length: 12 }, (_, i) => ({ value: String(i * 5), label: `${i * 5} min` }));

function NumberField({
  control,
  name,
  label,
  placeholder = "0",
  explicacion,
}: {
  control: Control<GestionZonaFormValues>;
  name: keyof GestionZonaFormValues;
  label: string;
  placeholder?: string;
  /** Una «i» junto a la etiqueta (23/11/2026). */
  explicacion?: string;
}) {
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          explicacion={explicacion}
          value={String(field.value ?? "")}
          // Solo cifras: una letra daba `NaN` y el mensaje de zod en inglés.
          onChangeText={(value) => {
            const cifras = value.replace(/[^0-9]/g, "");
            field.onChange(cifras === "" ? 0 : Number(cifras));
          }}
          placeholder={placeholder}
          soloCifras
          error={fieldState.error?.message}
          showEditIcon={false}
        />
      )}
    />
  );
}

function FechaEspecialRow({
  value,
  onChange,
  onRemove,
}: {
  value: GestionZonaFormValues["fechasEspeciales"][number];
  onChange: (value: GestionZonaFormValues["fechasEspeciales"][number]) => void;
  onRemove: () => void;
}) {
  const tipo = TIPOS_FECHA_ESPECIAL.find(
    (option) => option.value === value.tipo,
  );
  return (
    <View className="gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <CampoFecha
            enLinea
            minima={ahora()}
            value={value.fecha}
            onChange={(fecha) => onChange({ ...value, fecha })}
          />
        </View>
        <Button variant="ghost" size="sm" onPress={onRemove}>
          <Text className="text-lg text-danger">✕</Text>
        </Button>
      </View>
      <Select
        value={value.tipo}
        options={TIPOS_FECHA_ESPECIAL}
        onChange={(selected) => onChange({ ...value, tipo: String(selected) })}
        placeholder="Tipo de excepción"
      />
      <Input
        value={value.motivo}
        onChangeText={(motivo) => onChange({ ...value, motivo })}
        placeholder="Motivo (ej: Mantenimiento anual)"
        showEditIcon={false}
      />
      {tipo?.value === "horario_especial" && (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <CampoHora
              label="Apertura *"
              enLinea
              paso={30}
              value={value.horaApertura || ""}
              onChange={(horaApertura) => onChange({ ...value, horaApertura })}
            />
          </View>
          <View className="flex-1">
            <CampoHora
              label="Cierre *"
              enLinea
              paso={30}
              value={value.horaCierre || ""}
              onChange={(horaCierre) => onChange({ ...value, horaCierre })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export function GestionZonaForm({
  initial,
  onSave,
  onSuccess,
  isNew,
  duracionRangoMaximo,
  documentoDelReglamento,
}: {
  initial: GestionZonaFormValues;
  /** El documento del reglamento, debajo del texto (Para Claude 201). */
  documentoDelReglamento?: React.ReactNode;
  /** Tope en minutos de la duración de una reserva (`zona_duracion_rango_maximo`). */
  duracionRangoMaximo: number;
  /** Se espera: el éxito se enseña cuando el guardado terminó. */
  onSave: (value: GestionZonaFormValues) => Promise<void>;
  onSuccess: () => void;
  isNew: boolean;
}) {
  // El tope de la plataforma (`archivo_tamano_maximo_mb`), para decirlo antes.
  const parametros = useParametrosDeLaBase();
  const IMAGEN_ZONA = useFormatoDeArchivo("foto_zona");
  const topeMb = parametros.listo ? parametros.numero("archivo_tamano_maximo_mb") : null;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GestionZonaFormValues>({
    resolver: zodResolver(crearGestionZonaSchema({ duracionRangoMaximo })),
    defaultValues: initial,
    mode: "onSubmit",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const days = watch("diasHabilitados");
  const usaSlots = watch("usaSlots");
  const cuantas = Math.min(Math.max(Number(watch("cuposSimultaneos")) || 0, 0), 50);
  const nombresDeZonas = watch("nombresDeZonas") ?? [];
  const hayCosto =
    Number(watch("costoReserva")) > 0 || Number(watch("montoGarantia")) > 0 || Number(watch("costoLimpieza")) > 0;
  // Las de la base, con el código solo: el campo va a media columna.
  const monedasDeLaZona = useMonedas(watch("moneda")).monedas.map((m) => m.codigo);
  const fechasEspeciales = watch("fechasEspeciales");
  const tipo = watch("tipo");
  const tipoId = TIPO_A_ID[tipo];
  const defaultSource = tipoId
    ? (zonaBanners as Record<string, number>)[tipoId] ||
      (zonaIcons as Record<string, number>)[tipoId]
    : undefined;

  /*
    Sin `reset(initial)` en cada cambio (13/11/2026): la URL de la foto o la
    moneda llegaban después, `initial` cambiaba y el formulario volvía a
    empezar, borrando lo que ya se había escrito. La pantalla monta el
    formulario cuando ya tiene todo, así que `defaultValues` basta.
  */

  const errorMessages = useMemo(() => {
    const messages: string[] = [];
    const collect = (error: unknown) => {
      if (!error || typeof error !== "object") return;
      const mensaje = (error as { message?: unknown }).message;
      if (typeof mensaje === "string") messages.push(mensaje);
      // Los errores de react-hook-form se anidan como el formulario: cada campo
      // puede llevar los suyos dentro.
      Object.values(error).forEach((hijo) => {
        if (hijo && typeof hijo === "object" && hijo !== error) collect(hijo);
      });
    };
    collect(errors);
    return [...new Set(messages)];
  }, [errors]);

  /*
    El «creada con éxito» salía al pulsar, antes de saber nada: si el guardado
    fallaba se veían el éxito y, un segundo después, el error.
  */
  const submit = async (value: GestionZonaFormValues) => {
    try {
      await onSave(value);
      setShowSuccess(true);
    } catch {
      // El motivo ya salió en pantalla (`onError` del hook).
    }
  };
  const addFechaEspecial = () =>
    setValue("fechasEspeciales", [
      ...fechasEspeciales,
      {
        fecha: "",
        tipo: "cerrada",
        motivo: "",
        horaApertura: "",
        horaCierre: "",
      },
    ]);

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-3.5 p-4">
        {/* Lo primero (18/11/2026, pedido del cliente): si está activa o no. */}
        <AdminSectionCard title="Estado">
          <Controller
            control={control}
            name="activa"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight={field.value ? "Activa" : "Inactiva"}
              />
            )}
          />
          <Text className="text-xs text-gray-400">
            {watch("activa")
              ? "La zona estará disponible para reservas de los residentes."
              : "Al estar inactiva, no aparecerá para reservas de los residentes."}
          </Text>
        </AdminSectionCard>
        <AdminSectionCard title="Información General">
          <Controller
            control={control}
            name="nombre"
            render={({ field, fieldState }) => (
              <Input
                label="Nombre de la zona *"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Ej: BBQ Principal"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="tipo"
            render={({ field, fieldState }) => (
              <Select
                label="Tipo de zona *"
                explicacion="Sirve para agruparla y elegir su icono: recreación (piscina, parrilla), servicios (lavandería) o eventos (salón)."
                value={field.value}
                options={TIPOS_ZONA}
                onChange={field.onChange}
                placeholder="Selecciona un tipo"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="descripcion"
            render={({ field, fieldState }) => (
              <Input
                label="Descripción (opcional)"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Dónde está, su tamaño y qué incluye. Ej: terraza del piso 12, 4 parrillas, mesas para 10 personas y baño."
                multiline
                rows={3}
              error={fieldState.error?.message}
              />
            )}
          />
          {/*
            La galería. Hasta el 03/10/2026 el icono salía del **tipo**, así
            que dos zonas del mismo tipo se veían idénticas y una de un tipo
            raro se quedaba sin ninguno. Los ocho dibujos ya estaban en
            `assets` y no había forma de escogerlos.
          */}
          <Controller
            control={control}
            name="icono"
            render={({ field }) => (
              <GaleriaDeIconos
                value={field.value || ""}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="imagen"
            render={({ field }) => (
              <ImageUploadCard
                label="Imagen / Banner (opcional)"
                value={field.value}
                onChange={field.onChange}
                defaultSource={!isNew ? defaultSource : undefined}
                placeholder="Subir imagen personalizada"
                /*
                  Los requisitos **por delante**, no al fallar. Los pidió el
                  cliente el 02/10/2026, y la tarjeta solo mencionaba el tope
                  cuando ya habías elegido un archivo demasiado grande.
                */
                helperText={`${IMAGEN_ZONA.extensiones}${topeMb ? `, hasta ${topeMb} MB` : ""}.${
                  !isNew && defaultSource
                    ? " Si no subes ninguna, se usa la del tipo de zona."
                    : ""
                }`}
                tiposAceptados={IMAGEN_ZONA.tiposMime}
                height={140}
              />
            )}
          />
        </AdminSectionCard>

        {/*
          Cuántas hay, cómo se llaman y cuántos caben (18/11/2026, pedido del
          cliente). «Reservas a la misma hora» no se entendía: son cuántas
          zonas iguales hay (tres parrillas), y cada una con su nombre. Quien
          reserva elige siempre cuál: ya no hay interruptor.
        */}
        <AdminSectionCard title="Cuántas hay y cuántos caben">
          <NumberField
            control={control}
            name="cuposSimultaneos"
            label="¿Cuántas de estas zonas hay? *"
            explicacion="Si tienes varias iguales, por ejemplo 3 parrillas, pon 3. Cada una se reserva por separado y puedes darle su propio nombre."
            placeholder="1"
          />
          <Text className="text-xs leading-4 text-gray-500">
            Por ejemplo, 3 parrillas iguales. Cada una se reserva por separado.
          </Text>
          {cuantas > 1 ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-500">Nombre de cada una (opcional)</Text>
              {Array.from({ length: cuantas }, (_, i) => (
                <Input
                  key={i}
                  value={nombresDeZonas[i] ?? ""}
                  onChangeText={(texto) => {
                    const lista = Array.from({ length: cuantas }, (_, k) => nombresDeZonas[k] ?? "");
                    lista[i] = texto;
                    setValue("nombresDeZonas", lista);
                  }}
                  placeholder={`${watch("nombre") || "Zona"} ${i + 1}`}
                  showEditIcon={false}
                />
              ))}
            </View>
          ) : null}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="personasPorReserva"
                label="Personas por reserva (opcional)"
                explicacion="Cuántas personas puede traer cada reserva, contando a quien reserva. En 0, sin límite."
              />
            </View>
            <View className="flex-1">
              <NumberField
                control={control}
                name="capacidadMaxima"
                label="Capacidad total a la vez (opcional)"
                explicacion="Cuántas personas caben en todo el espacio al mismo tiempo, sumando todas las reservas de esa hora. En 0, sin límite."
              />
            </View>
          </View>
          <Text className="text-xs leading-4 text-gray-500">
            «Personas por reserva» cuenta a quien reserva y sus invitados. La capacidad total es la del espacio
            entero, sumando todas las reservas de esa hora. En 0, sin límite.
          </Text>
        </AdminSectionCard>

        <AdminSectionCard title="Configuración de horarios">
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Controller
                control={control}
                name="horarioApertura"
                render={({ field, fieldState }) => (
                  <CampoHora
                    label="Hora de apertura *"
                    error={fieldState.error?.message}
                    paso={30}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="horarioCierre"
                render={({ field, fieldState }) => (
                  <CampoHora
                    label="Hora de cierre *"
                    error={fieldState.error?.message}
                    paso={30}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="duracionMinimaMin"
                label="Duración mínima (min) *"
                explicacion="Lo menos que puede durar una reserva, en minutos."
                placeholder="1"
              />
            </View>
            <View className="flex-1">
              <NumberField
                control={control}
                name="duracionMaximaMin"
                label="Duración máxima (min) *"
                explicacion="Lo más que puede durar una reserva, en minutos. Con «Por bloques», es el largo de cada bloque."
                placeholder="1"
              />
            </View>
          </View>
          <NumberField
            control={control}
            name="tiempoMinimoEntreReservas"
            label="Tiempo mínimo entre reservas (min) (opcional)"
            explicacion="Minutos libres entre una reserva y la siguiente, para limpiar o preparar la zona. En 0, pueden ir seguidas."
          />
          <EtiquetaDelCampo label="Días habilitados *" explicacion="Los días de la semana en que se puede reservar. Para cerrar un día puntual, usa «Fechas especiales»." />
          <View className="flex-row flex-wrap gap-1.5">
            {DIAS_ZONA.map((day) => {
              const active = days.includes(day);
              return (
                <Button
                  key={day}
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  onPress={() =>
                    setValue(
                      "diasHabilitados",
                      active
                        ? days.filter((item) => item !== day)
                        : [...days, day],
                    )
                  }
                >{`${day}${active ? " ✓" : ""}`}</Button>
              );
            })}
          </View>
          {errors.diasHabilitados?.message ? (
            <Text className="text-xs text-danger font-medium">{errors.diasHabilitados.message}</Text>
          ) : null}
        </AdminSectionCard>

        {/* Cuántas reservas y con cuánto tiempo (18/11/2026, pedido del cliente). */}
        <AdminSectionCard title="Límites para reservar">
          <NumberField
            control={control}
            name="reservasActivasMaximas"
            label="Reservas por delante que puede tener cada uno (opcional)"
            explicacion="Cuántas reservas futuras puede tener a la vez cada vivienda (o cada persona, si eliges «Por persona»). Cuando llega al tope, puede editar la que tiene pero no hacer otra. En 0, sin límite."
            placeholder="1"
          />
          <Controller
            control={control}
            name="limiteReservasPor"
            render={({ field }) => (
              <Tabs
                tabs={[
                  { value: "vivienda", label: "Por vivienda" },
                  { value: "persona", label: "Por persona" },
                ]}
                active={field.value}
                allowDeselect={false}
                onChange={(v) => field.onChange(v === "persona" ? "persona" : "vivienda")}
              />
            )}
          />
          <Text className="text-xs leading-4 text-gray-500">
            {watch("reservasActivasMaximas") > 0
              ? `Con ${watch("reservasActivasMaximas")} reserva(s) por delante ${watch("limiteReservasPor") === "persona" ? "cada persona" : "cada vivienda"} ya no puede hacer otra: puede editar la que tiene. En 0, sin límite.`
              : "Sin límite de reservas por delante."}
          </Text>
          <NumberField
            control={control}
            name="anticipacionMinimaHoras"
            label="Anticipación mínima (horas) (opcional)"
            explicacion="Con cuántas horas de anticipación hay que reservar. Por ejemplo, 12: hoy a las 8:00 ya no se puede reservar para hoy a las 15:00. En 0, se puede reservar al momento."
          />
          <Text className="text-xs leading-4 text-gray-500">
            {watch("anticipacionMinimaHoras") > 0
              ? `Hay que reservar con al menos ${watch("anticipacionMinimaHoras")} horas de anticipación.`
              : "Se puede reservar al momento."}
          </Text>
        </AdminSectionCard>

        <AdminSectionCard title="Configuración de reserva">
          <Controller
            control={control}
            name="usaSlots"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                label={
                  field.value ? "Por bloques (horarios fijos)" : "Horario libre"
                }
              />
            )}
          />
          {/*
            Aqui habia una lista de bloques --«numero de bloques» y un inicio y
            un fin por cada uno-- que **nadie guardaba**: el guardado los componia
            en un texto y no los mandaba, porque las franjas no salen de ahi sino
            de la hora de apertura, la de cierre y la duracion maxima
            (`franjas()`). El administrador rellenaba una lista que no se leia.

            Decision del cliente del 29/09/2026: se quitan. La zona se configura
            con apertura, cierre y duracion, y de ahi salen las franjas. Si algun
            dia hace falta ofrecer «10:00-12:00 y 16:00-18:00 y nada en medio»
            --que con apertura y cierre no se puede expresar-- habra que anadir la
            columna y el guardado de verdad. Punto 45 de `REVISAR-A-OJO.md`.
          */}
          <Text className="text-xs leading-4 text-gray-500">
            {usaSlots
              ? `Los residentes eligen una franja fija, calculada con el horario de apertura y cierre y la duración máxima.`
              : "Los residentes reservan un rango de horas dentro del horario de apertura y cierre."}
          </Text>
          {/*
            Aqui habia un segundo campo, "Duración máxima de reserva
            (horas)", que escribia **la misma columna** que "Duración
            máxima (min)" de mas arriba. Dos campos del mismo formulario
            sobre el mismo dato y con unidades distintas: ganaba el que se
            rellenara ultimo, y el significado cambiaba con el. La columna
            es `duracion_maxima_min` y se pide en minutos, una sola vez.
          */}
          <Controller
            control={control}
            name="reglamento"
            render={({ field, fieldState }) => (
              <Input
                label="Reglamento de la zona (opcional)"
                explicacion="Las reglas de uso. Quien reserva tiene que aceptarlas antes de confirmar."
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Reglamento que verán los residentes"
                multiline
                rows={8}
                error={fieldState.error?.message}
              />
            )}
          />
          {documentoDelReglamento}
        </AdminSectionCard>

        <AdminSectionCard title="Fechas especiales">
          <Text className="text-xs leading-4 text-gray-500">
            Administra excepciones como mantenimiento, eventos privados o
            feriados.
          </Text>
          {fechasEspeciales.map((fecha, index) => (
            <FechaEspecialRow
              key={`${index}-${fecha.fecha}`}
              value={fecha}
              onChange={(value) => setValue(`fechasEspeciales.${index}`, value)}
              onRemove={() =>
                setValue(
                  "fechasEspeciales",
                  fechasEspeciales.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            />
          ))}
          <Button variant="ghost" fullWidth onPress={addFechaEspecial}>
            + Agregar fecha especial
          </Button>
        </AdminSectionCard>

        <AdminSectionCard title="Configuración económica">
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="montoGarantia"
                label="Monto de garantía (opcional)"
                explicacion="Un depósito que se devuelve después si la zona queda en buen estado. En 0, sin garantía."
              />
            </View>
            <View className="flex-1">
              <NumberField
                control={control}
                name="costoLimpieza"
                label="Costo de limpieza (opcional)"
              />
            </View>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="costoReserva"
                label="Costo de reserva (opcional)"
                explicacion="Lo que se paga por usar la zona. Con un costo, quien reserva adjunta el comprobante de pago."
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="moneda"
                render={({ field }) => (
                  <Select
                    label="Moneda *"
                    value={field.value}
                    options={monedasDeLaZona}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
          </View>
          {hayCosto ? (
            <>
              {/*
                En horas y minutos (23/11/2026, pedido del cliente): antes eran
                horas enteras. Se guarda en minutos (`plazo_adjunto_minutos`).
              */}
              <EtiquetaDelCampo
                label="Plazo para adjuntar el comprobante (opcional)"
                explicacion="Desde que se hace la reserva. Si en ese tiempo no adjunta el comprobante de pago, la reserva se cancela sola y se le avisa. Con 0 horas y 0 minutos, no hay plazo."
              />
              <Controller
                control={control}
                name="plazoAdjuntoMinutos"
                render={({ field, fieldState }) => {
                  const total = Number(field.value) || 0;
                  const horas = Math.floor(total / 60);
                  const minutos = total % 60;
                  return (
                    <View className="gap-1">
                      <View className="flex-row gap-2.5">
                        <View className="flex-1">
                          <Select
                            label="Horas"
                            value={String(horas)}
                            options={OPCIONES_DE_HORAS}
                            onChange={(v) => field.onChange(Number(v) * 60 + minutos)}
                          />
                        </View>
                        <View className="flex-1">
                          <Select
                            label="Minutos"
                            value={String(minutos)}
                            options={OPCIONES_DE_MINUTOS}
                            onChange={(v) => field.onChange(horas * 60 + Number(v))}
                          />
                        </View>
                      </View>
                      {fieldState.error?.message ? (
                        <Text className="text-xs text-danger font-medium">{fieldState.error.message}</Text>
                      ) : null}
                    </View>
                  );
                }}
              />
              <Text className="text-xs leading-4 text-gray-500">
                {watch("plazoAdjuntoMinutos") > 0
                  ? `Quien reserva tiene ${textoDelPlazo(watch("plazoAdjuntoMinutos"))} para adjuntar el comprobante; si no, la reserva se cancela sola y se le avisa.`
                  : "Sin plazo para adjuntar el comprobante."}
              </Text>
            </>
          ) : null}
        </AdminSectionCard>

        <AdminSectionCard title="Aprobación del administrador">
          <Controller
            control={control}
            name="requiereAprobacion"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight="Las reservas requieren aprobación del administrador"
                labelRightClassName="flex-1"
              />
            )}
          />
          <Text className="text-xs leading-4 text-gray-400">
            {watch("requiereAprobacion")
              ? "Las reservas quedarán en estado Pendiente y deberán ser aprobadas por el administrador. El usuario podrá subir comprobante de pago."
              : "Las reservas se confirmarán automáticamente."}
          </Text>

          {/*
            Qué hace falta para que se la aprueben. Hasta el 03/10/2026 esto
            era un interruptor y nada más: la reserva quedaba «Pendiente» y
            quien la hacía no tenía forma de saber qué tenía que cumplir.

            Solo con la aprobación encendida: en una zona que se confirma sola
            no hay nada que aprobar, y un texto ahí sería uno que nadie va a
            leer. La base lo rechaza igualmente.
          */}
          {watch("requiereAprobacion") && (
            <Controller
              control={control}
              name="condicionesAprobacion"
              render={({ field, fieldState }) => (
                <Input
                  label="Condiciones para aprobarla (opcional)"
                  value={field.value || ""}
                  onChangeText={field.onChange}
                  placeholder="Ej: avisar con una semana, pagar la garantía antes y dejar un responsable de contacto"
                  multiline
                  rows={3}
                error={fieldState.error?.message}
                />
              )}
            />
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Permitido por tipo de estancia">
          <Controller
            control={control}
            name="permiteCorta"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight="Permitido para estancias cortas"
              />
            )}
          />
          <Controller
            control={control}
            name="permiteLarga"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight="Permitido para estancias largas"
              />
            )}
          />
          <Text className="text-xs leading-4 text-gray-400">
            Quién vive en el edificio cuenta como estancia larga. Un huésped es de estancia corta o larga según
            las noches que el edificio define en Permisos › Renta corta; si el edificio no las distingue, todo
            huésped cuenta como corta. Pueden estar activas las dos.
          </Text>
        </AdminSectionCard>

        {errorMessages.length > 0 && (
          <View className="gap-1 rounded-xl bg-red-50 px-4 py-3">
            {errorMessages.map((error) => (
              <Text key={error} className="text-xs leading-4 text-red-600">
                ⚠ {error}
              </Text>
            ))}
          </View>
        )}
        <Button
          fullWidth
          loading={isSubmitting}
          onPress={() => void handleSubmit(submit)()}
        >
          {isNew ? "Crear Zona Común" : "Guardar Cambios"}
        </Button>
        <View className="h-4" />
      </ScrollView>
      <Modal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        title=""
      >
        <View className="items-center gap-4 py-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Text className="text-3xl text-green-600">✓</Text>
          </View>
          <Text className="text-center text-base font-semibold text-gray-900">
            {isNew
              ? "Zona común creada con éxito"
              : "Zona común actualizada con éxito"}
          </Text>
          <Button fullWidth onPress={onSuccess}>
            Ir a Gestión de Zonas
          </Button>
        </View>
      </Modal>
    </>
  );
}

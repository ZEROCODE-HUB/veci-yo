import { Text } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Button, CampoTelefono, Input, Select } from "@/shared/components";
import {
  AREAS,
  DESTINATARIOS,
  MEDIOS_CONTACTO,
  TIPOS,
  TIPOS_POR_AREA,
} from "../../services";
import type { ReclamoFormularioValores } from "../../schemas/reclamo.schema";

const ETIQUETAS_AREA = Object.values(AREAS);
const ETIQUETAS_DESTINATARIO = Object.values(DESTINATARIOS);
const ETIQUETAS_MEDIO = Object.values(MEDIOS_CONTACTO);

interface Props {
  control: Control<ReclamoFormularioValores>;
  errors: FieldErrors<ReclamoFormularioValores>;
  area: string;
  onAreaChange: (value: string) => void;
  onSubmit: () => void;
  enviando: boolean;
  /** El bloque de adjuntos; lo arma la pantalla, que es quien los retiene. */
  adjuntos?: React.ReactNode;
  /**
   * Las viviendas del edificio, para poder señalar una.
   *
   * Las trae la pantalla: este componente no sabe pedir datos, y la lista ya
   * la tiene quien lo monta.
   */
  viviendas?: Array<{ value: string; label: string }>;
}

export function ReclamoFormulario({
  control,
  errors,
  area,
  onAreaChange,
  onSubmit,
  enviando,
  adjuntos,
  viviendas = [],
}: Props) {
  // Cada área ofrece sus propios tipos; "Constructora TyC" y "Documentos
  // antiguos" no piden ninguno.
  const claveArea = Object.entries(AREAS).find(([, etiqueta]) => etiqueta === area)?.[0];
  const tiposDisponibles = claveArea
    ? TIPOS_POR_AREA[claveArea as keyof typeof TIPOS_POR_AREA].map((t) => TIPOS[t])
    : [];
  const esAppVeciyo = area === AREAS.aplicacion;

  return (
    <>
      <Controller
        control={control}
        name="titulo"
        render={({ field }) => (
          <Input
            label="Titulo*"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Describe brevemente el motivo"
            error={errors.titulo?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="descripcion"
        render={({ field }) => (
          <Input
            label="Descripción*"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Describe el problema con el mayor detalle posible"
            multiline
            error={errors.descripcion?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="area"
        render={({ field }) => (
          <Select
            label="Categoría*"
            value={field.value}
            options={ETIQUETAS_AREA}
            onChange={(value) => {
              const next = String(value) || "";
              field.onChange(next);
              onAreaChange(next);
            }}
            placeholder="Seleccione una categoría"
          />
        )}
      />
      {errors.area?.message && (
        <Text className="text-xs text-red-500 font-medium -mt-2">
          {errors.area.message}
        </Text>
      )}

      {tiposDisponibles.length > 0 && (
        <>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                label="Subcategoría*"
                value={field.value}
                options={tiposDisponibles}
                onChange={(value) => field.onChange(String(value) || "")}
                placeholder="Seleccione una subcategoría"
              />
            )}
          />
          {errors.tipo?.message && (
            <Text className="text-xs text-red-500 font-medium -mt-2">
              {errors.tipo.message}
            </Text>
          )}
        </>
      )}

      {/*
        Contra quien va la queja, si va contra alguien.

        `reclamo.unidad_denunciada` existe desde la primera migracion, esta
        indexada y **no la escribia ni la leia nadie**: una queja de convivencia
        --ruido, humedades, un huesped que molesta-- no tenia donde decir contra
        quien iba.

        Señala a la **vivienda**, no a la persona: es menos invasivo y es lo que
        la administracion necesita para actuar. Y solo en las quejas del
        condominio; en un reporte sobre la aplicacion no significa nada.

        Quien lo lee no cambia: la politica ya dice «quien la escribio y la
        administracion», asi que el denunciado no la ve ni sabe que existe.
      */}
      {!esAppVeciyo && viviendas.length > 0 && (
        <Controller
          control={control}
          name="unidadDenunciada"
          render={({ field }) => (
            <Select
              label="¿Va contra una vivienda? (opcional)"
              value={field.value ?? ""}
              options={[
                { value: "", label: "No va contra ninguna" },
                ...viviendas,
              ]}
              onChange={(valor) => field.onChange(String(valor))}
            />
          )}
        />
      )}

      {esAppVeciyo && (
        <Controller
          control={control}
          name="modelo"
          render={({ field }) => (
            <Input
              label="Modelo del dispositivo*"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. iPhone 15 Pro, Samsung Galaxy S24, Pixel 9"
              error={errors.modelo?.message}
            />
          )}
        />
      )}

      <Controller
        control={control}
        name="destinatario"
        render={({ field }) => (
          <Select
            label="Destinatario"
            value={field.value}
            options={ETIQUETAS_DESTINATARIO}
            onChange={(value) => field.onChange(String(value))}
            placeholder="Seleccione un destinatario"
          />
        )}
      />

      <Controller
        control={control}
        name="correo"
        render={({ field, fieldState }) => (
          <Input
            label="Correo electrónico"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="correo@ejemplo.com"
            type="email"
          error={fieldState.error?.message}
          />
        )}
      />

      {/*
        El teléfono con su país. `reclamo.codigo_pais_contacto` existe desde la
        primera migración y **nadie la escribía**: el número quedaba como texto
        libre, con o sin prefijo según quien lo escribiera, y en una PQRS ese
        teléfono es para que la administración llame.

        Dos `Controller` anidados porque este componente recibe el `control` de
        fuera --la pantalla es la que tiene el formulario-- y el campo compuesto
        necesita los dos valores a la vez. Es más feo que un `setValue`, y es lo
        que hay sin cambiar la frontera del componente.
      */}
      <Controller
        control={control}
        name="codigoPais"
        render={({ field: pais, fieldState }) => (
          <Controller
            control={control}
            name="telefono"
            render={({ field: numero }) => (
              <CampoTelefono
                label="Teléfono"
                codigoPais={pais.value}
                onCodigoPaisChange={pais.onChange}
                telefono={numero.value}
                onTelefonoChange={numero.onChange}
              error={fieldState.error?.message}
              />
            )}
          />
        )}
      />

      <Controller
        control={control}
        name="medioContacto"
        render={({ field }) => (
          <Select
            label="Medio de contacto preferido"
            value={field.value}
            options={ETIQUETAS_MEDIO}
            onChange={(value) => field.onChange(String(value))}
            placeholder="Seleccione un medio"
          />
        )}
      />

      {adjuntos}

      <Button variant="primary" fullWidth onPress={onSubmit} disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar"}
      </Button>
    </>
  );
}

import { Text, View } from "react-native";
import { Select, Toggle } from "@/shared/components";
import { useLista } from "@/shared/hooks/useLista";
import type { EstanciaConfig } from "@/shared/types";
import { horasDeLaOpcion, opcionDelHorario } from "../../services/horarioDeEntrada";

/**
 * Los permisos de un tipo de estancia.
 *
 * Estaba escrito en una sola línea de dos mil caracteres —contra la regla 12—
 * y comparaba `values[field] === "Sí" || values[field] === "Si"` porque los
 * permisos eran texto y convivían tres grafías del mismo valor. Ahora son
 * booleanos y no hay nada que interpretar.
 */

type CampoBooleano =
  | "permiteVisitas"
  | "permiteHuespedNinos"
  | "permiteMascotas"
  | "permiteCocherasVisit";

const PERMISOS: Array<[CampoBooleano, string]> = [
  ["permiteVisitas", "Permite visitas"],
  ["permiteHuespedNinos", "Permite huésped niños"],
  ["permiteMascotas", "Permite mascotas"],
  ["permiteCocherasVisit", "Permite cocheras de visita"],
];

/** El valor del desplegable para un horario guardado que no es de la lista. */
const OTRO_HORARIO = "__guardado";

interface Props {
  values: EstanciaConfig;
  onChange: <C extends keyof EstanciaConfig>(
    campo: C,
    valor: EstanciaConfig[C],
  ) => void;
}

export function StayFields({
  values,
  onChange,
}: Props) {
  /*
    Los horarios son la lista `horarios_de_entrada`: el administrador los
    nombra y ordena, y cada uno trae sus dos horas. Se guarda la hora, no el
    nombre, así que renombrar uno no cambia lo que ya está escrito.
  */
  const horarios = useLista("horarios_de_entrada").opciones;
  const { checkinDesde: desde, checkinHasta: hasta } = values;
  const elegido = opcionDelHorario(horarios, desde, hasta);
  const valorDelHorario = elegido ? elegido.codigo : desde && hasta ? OTRO_HORARIO : "";
  const elegirHorario = (codigo: string) => {
    if (codigo === OTRO_HORARIO) return;
    const horas = horasDeLaOpcion(horarios.find((o) => o.codigo === codigo));
    onChange("checkinDesde", horas?.desde ?? null);
    onChange("checkinHasta", horas?.hasta ?? null);
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-y-3">
        {PERMISOS.map(([campo, etiqueta]) => (
          <View key={campo} className="w-[48%]">
            <Text className="text-sm text-gray-500 mb-1.5 font-medium">
              {etiqueta}
            </Text>
            {/* El rotulo esta arriba, en su propio `<Text>`: sin esto los
                cuatro interruptores se anuncian iguales y sin nombre. */}
            <Toggle
              value={values[campo]}
              onChange={(valor) => onChange(campo, valor)}
              accessibilityLabel={etiqueta}
            />
          </View>
        ))}
      </View>

      {/*
        Aqui estaban «Estancia mínima (días)» y «Estancia máxima (días)», que
        escribian `corta/larga_estancia_minima` y `_maxima` de
        `permiso_vivienda`. **Nadie las leia**: ni la base las imponia ni la
        aplicacion las mostraba --`reglas_de_estancia` las devuelve y su unico
        consumidor, `ficha_alojamiento`, solo usa las mascotas y los niños--.

        Decision del cliente del 29/09/2026: el limite de noches es **del
        edificio**, y para eso ya esta `limite_renta_corta_condominio`, que el
        anfitrion ve como advertencia al configurar su vivienda. Punto 62.

        La frontera entre estancia corta y larga no se toca: la marca
        `corta_hasta_noches`, que tiene su propio campo arriba.
      */}

      <Select
        label="Horario de check-in"
        value={valorDelHorario}
        options={[
          { value: "", label: "Sin horario" },
          ...horarios.map((o) => ({ value: o.codigo, label: o.etiqueta })),
          // Un rango guardado que no es de los de la lista: sin esto el
          // desplegable sale vacío y parece que no hay nada guardado.
          ...(valorDelHorario === OTRO_HORARIO
            ? [{ value: OTRO_HORARIO, label: `${desde} a ${hasta}` }]
            : []),
        ]}
        placeholder="Seleccionar"
        onChange={(valor) => elegirHorario(String(valor))}
      />
    </View>
  );
}

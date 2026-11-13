import React from "react";
import { Text, View } from "react-native";
import { Cargando, ImageUploadCard, SegunLaCarga } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { BloqueDeContactos } from "./BloqueDeContactos";
import { useContactosDelCondominio } from "../../hooks/useContactosDelCondominio";
import { useFormatoDeArchivo } from "@/shared/hooks/useFormatoDeArchivo";
import { useParametrosDeLaBase } from "@/shared/hooks";

/**
 * Lo que la maqueta de Condominio pedía y no tenía dónde guardarse: la foto, el
 * equipo administrativo y las empresas de seguridad y limpieza (16/10/2026).
 * Cada cosa se guarda al momento, sin el «Guardar» del formulario de arriba.
 *
 * Dónde se enseña la foto está por decidir (hueco en el GSheet).
 */
export function ContactosYFotoDelCondominio() {
  const {
    contactos,
    estadoContactos,
    estadoFoto,
    fotoUrl,
    guardar,
    retirar,
    retirando,
    subirFoto,
    subiendoFoto,
  } = useContactosDelCondominio();
  const deTipo = (tipo: string) => contactos.filter((c) => c.tipo === tipo);
  // El tope de la plataforma (`archivo_tamano_maximo_mb`), para decirlo antes.
  const parametros = useParametrosDeLaBase();
  const topeMb = parametros.listo ? parametros.numero("archivo_tamano_maximo_mb") : null;
  const FOTO_CONDOMINIO = useFormatoDeArchivo("foto_condominio");
  /*
    Cada bloque lleva su propio «guardando»: con uno solo para los tres, guardar
    en el equipo hacía girar también los de seguridad y limpieza (13/11/2026).
  */
  const comun = {
    onGuardar: async (c: Parameters<typeof guardar>[0]) => {
      await guardar(c);
    },
    onRetirar: retirar,
    retirando,
  };

  return (
    <>
      <AdminSectionCard title="Foto del condominio">
        <SegunLaCarga estado={estadoFoto} texto="la foto" enLinea>
          <ImageUploadCard
            value={fotoUrl}
            onChange={(uri) => subirFoto(uri)}
            placeholder={subiendoFoto ? "Subiendo…" : "Tocar para agregar foto"}
            helperText={`${FOTO_CONDOMINIO.extensiones}${topeMb ? `, hasta ${topeMb} MB` : ""}.`}
            tiposAceptados={FOTO_CONDOMINIO.tiposMime}
            height={120}
          />
        </SegunLaCarga>
        {/*
          Con una foto ya puesta, el «Subiendo…» del hueco no se ve: la subida
          de una nueva no daba ninguna señal (13/11/2026).
        */}
        {subiendoFoto ? (
          <View className="flex-row items-center justify-center gap-2" aria-busy>
            <Cargando variante="control" texto="la foto" />
            <Text className="text-xs text-gray-500">Subiendo la foto…</Text>
          </View>
        ) : null}
      </AdminSectionCard>
      <SegunLaCarga estado={estadoContactos} texto="los contactos del edificio" forma="filas" enLinea>
      <BloqueDeContactos
        titulo="Equipo Administrativo"
        tipo="equipo"
        contactos={deTipo("equipo")}
        textoAgregar="Agregar persona"
        {...comun}
      />
      <BloqueDeContactos
        titulo="Empresa de Seguridad"
        tipo="empresa_seguridad"
        contactos={deTipo("empresa_seguridad")}
        textoAgregar="Agregar empresa de seguridad"
        {...comun}
      />
      <BloqueDeContactos
        titulo="Empresa de Limpieza"
        tipo="empresa_limpieza"
        contactos={deTipo("empresa_limpieza")}
        textoAgregar="Agregar empresa de limpieza"
        {...comun}
      />
      </SegunLaCarga>
    </>
  );
}

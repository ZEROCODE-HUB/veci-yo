import React from "react";
import { ImageUploadCard } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { BloqueDeContactos } from "./BloqueDeContactos";
import { useContactosDelCondominio } from "../../hooks/useContactosDelCondominio";
import { FOTO_CONDOMINIO } from "../../services/contactos.repo";
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
    fotoUrl,
    guardar,
    guardando,
    retirar,
    subirFoto,
    subiendoFoto,
  } = useContactosDelCondominio();
  const deTipo = (tipo: string) => contactos.filter((c) => c.tipo === tipo);
  // El tope de la plataforma (`archivo_tamano_maximo_mb`), para decirlo antes.
  const parametros = useParametrosDeLaBase();
  const topeMb = parametros.listo ? parametros.numero("archivo_tamano_maximo_mb") : null;
  const comun = {
    guardando,
    onGuardar: async (c: Parameters<typeof guardar>[0]) => {
      await guardar(c);
    },
    onRetirar: retirar,
  };

  return (
    <>
      <AdminSectionCard title="Foto del condominio">
        <ImageUploadCard
          value={fotoUrl}
          onChange={(uri) => subirFoto(uri)}
          placeholder={subiendoFoto ? "Subiendo…" : "Tocar para agregar foto"}
          helperText={`${FOTO_CONDOMINIO.extensiones}${topeMb ? `, hasta ${topeMb} MB` : ""}.`}
          tiposAceptados={FOTO_CONDOMINIO.tiposMime}
          height={120}
        />
      </AdminSectionCard>
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
    </>
  );
}

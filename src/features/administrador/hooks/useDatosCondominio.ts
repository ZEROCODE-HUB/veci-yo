import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminStore, useAuthStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import {
  obtenerArquitectura,
  obtenerGuardias,
  obtenerTipologias,
} from "../services/arquitectura.repo";

/**
 * Llena el store de administración con los datos del condominio real.
 *
 * El store arrancaba sembrado con `adminMockData`, así que el directorio, el
 * alojamiento del huésped y el perfil del guardia mostraban tres torres de
 * Quito y dos guardias inventados aunque el condominio fuera otro. Ahora
 * arranca vacío y se llena aquí.
 *
 * Se monta una sola vez, en el navegador raíz: media docena de pantallas leen
 * el store por selector y no tiene sentido que cada una dispare su consulta.
 */
export function useDatosCondominio() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const condominioId = useCondominioActivo() ?? "";
  const habilitado = Boolean(autenticado && condominioId);

  const setTorres = useAdminStore((s) => s.setTorres);
  const setUnidades = useAdminStore((s) => s.setUnidades);
  const setDepositos = useAdminStore((s) => s.setDepositos);
  const setPorterias = useAdminStore((s) => s.setPorterias);
  const setTipologias = useAdminStore((s) => s.setTipologias);
  const setGuardias = useAdminStore((s) => s.setGuardias);
  const setEstacionamientos = useAdminStore(
    (s) => s.setEstacionamientosVisitantes,
  );

  const arquitectura = useQuery({
    queryKey: ["condominio", "arquitectura", condominioId],
    queryFn: obtenerArquitectura,
    enabled: habilitado,
  });

  const tipologias = useQuery({
    queryKey: ["condominio", "tipologias", condominioId],
    queryFn: () => obtenerTipologias(condominioId),
    enabled: habilitado,
  });

  const guardias = useQuery({
    queryKey: ["condominio", "guardias", condominioId],
    queryFn: () => obtenerGuardias(condominioId),
    enabled: habilitado,
  });

  useEffect(() => {
    const datos = arquitectura.data;
    if (!datos) return;
    setTorres(datos.torres);
    setUnidades(datos.unidades);
    setDepositos(datos.depositos);
    setPorterias(datos.porterias);

    // El contador de estacionamientos de visita sale de las filas, no de un
    // `{total: 20, ocupados: 5}` fijo.
    const visitantes = datos.estacionamientos.filter(
      (e) => e.tipo === "visitante",
    );
    setEstacionamientos({
      total: visitantes.length,
      ocupados: visitantes.filter((e) => e.ocupado).length,
    });
  }, [
    arquitectura.data,
    setTorres,
    setUnidades,
    setDepositos,
    setPorterias,
    setEstacionamientos,
  ]);

  useEffect(() => {
    if (tipologias.data) setTipologias(tipologias.data as never);
  }, [tipologias.data, setTipologias]);

  useEffect(() => {
    if (guardias.data) setGuardias(guardias.data as never);
  }, [guardias.data, setGuardias]);
}

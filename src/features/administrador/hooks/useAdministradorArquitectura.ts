import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/admin-store";
import {
  administradorArquitecturaQueryKey,
  createDepositRequest,
  createPorteriaRequest,
  createTowerRequest,
  createUnitRequest,
  deleteDepositRequest,
  deletePorteriaRequest,
  deleteTowerRequest,
  deleteUnitRequest,
  fetchArchitectureSnapshot,
  getCurrentArchitectureSnapshot,
  updateDepositRequest,
  updatePorteriaRequest,
  updateTowerRequest,
  updateUnitRequest,
} from "../services/administradorArquitectura.service";

export function useAdministradorArquitectura() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: administradorArquitecturaQueryKey });

  const query = useQuery({
    queryKey: administradorArquitecturaQueryKey,
    queryFn: fetchArchitectureSnapshot,
    initialData: getCurrentArchitectureSnapshot,
  });

  const createTower = useMutation({
    mutationFn: createTowerRequest,
    onSuccess: (data) => {
      useAdminStore.getState().agregarTorre(data);
      invalidate();
    },
  });
  const updateTower = useMutation({
    mutationFn: updateTowerRequest,
    onSuccess: (data) => {
      useAdminStore.getState().actualizarTorre(data);
      invalidate();
    },
  });
  const deleteTower = useMutation({
    mutationFn: deleteTowerRequest,
    onSuccess: (data) => {
      useAdminStore.getState().eliminarTorre(data);
      invalidate();
    },
  });

  const createUnit = useMutation({
    mutationFn: createUnitRequest,
    onSuccess: (data) => {
      useAdminStore.getState().agregarUnidad(data);
      invalidate();
    },
  });
  const updateUnit = useMutation({
    mutationFn: updateUnitRequest,
    onSuccess: (data) => {
      useAdminStore.getState().actualizarUnidad(data);
      invalidate();
    },
  });
  const deleteUnit = useMutation({
    mutationFn: deleteUnitRequest,
    onSuccess: (id) => {
      useAdminStore.getState().eliminarUnidad(id);
      invalidate();
    },
  });

  const createDeposit = useMutation({
    mutationFn: createDepositRequest,
    onSuccess: (data) => {
      useAdminStore.getState().agregarDeposito(data);
      invalidate();
    },
  });
  const updateDeposit = useMutation({
    mutationFn: updateDepositRequest,
    onSuccess: (data) => {
      useAdminStore.getState().actualizarDeposito(data);
      invalidate();
    },
  });
  const deleteDeposit = useMutation({
    mutationFn: deleteDepositRequest,
    onSuccess: (id) => {
      useAdminStore.getState().eliminarDeposito(id);
      invalidate();
    },
  });

  const createPorteria = useMutation({
    mutationFn: createPorteriaRequest,
    onSuccess: (data) => {
      useAdminStore.getState().agregarPorteria(data);
      invalidate();
    },
  });
  const updatePorteria = useMutation({
    mutationFn: updatePorteriaRequest,
    onSuccess: (data) => {
      useAdminStore.getState().actualizarPorteria(data);
      invalidate();
    },
  });
  const deletePorteria = useMutation({
    mutationFn: deletePorteriaRequest,
    onSuccess: (id) => {
      useAdminStore.getState().eliminarPorteria(id);
      invalidate();
    },
  });

  return {
    ...query,
    data: query.data ?? getCurrentArchitectureSnapshot(),
    createTower,
    updateTower,
    deleteTower,
    createUnit,
    updateUnit,
    deleteUnit,
    createDeposit,
    updateDeposit,
    deleteDeposit,
    createPorteria,
    updatePorteria,
    deletePorteria,
  };
}

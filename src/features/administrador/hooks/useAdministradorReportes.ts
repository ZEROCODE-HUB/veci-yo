import { useMutation } from "@tanstack/react-query";
import { generateReportRequest } from "../services/administradorReportes.service";
export function useAdministradorReportes() { const mutation = useMutation({ mutationFn: generateReportRequest }); return { generateReport: mutation.mutate, generating: mutation.isPending }; }

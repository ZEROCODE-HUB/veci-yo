export type ReporteSolicitud = {
  reporteId: string;
  desde?: string;
  hasta?: string;
  todoHistorial: boolean;
};
export async function generateReportRequest(request: ReporteSolicitud) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return request;
}

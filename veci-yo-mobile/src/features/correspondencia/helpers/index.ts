
export const getIcon = (empresa: string) => {
  if (empresa.toLowerCase().includes('rappi')) return '🛵';
  if (empresa.toLowerCase().includes('dhl')) return '📦';
  return '📬';
};

export const textoPaso = (tipo: string, datos?: { fecha?: string; hora?: string; por?: string; a?: string }) => {
  if (!datos || !datos.fecha) {
    if (tipo === 'registro') return 'Registro: Pendiente';
    if (tipo === 'recibido') return 'Recibido: Pendiente';
    return 'Entregado: Pendiente';
  }
  if (tipo === 'registro') return `Registrado ${datos.fecha} hora ${datos.hora} por ${datos.por}`;
  if (tipo === 'recibido') return `Recibido ${datos.fecha} hora ${datos.hora} por ${datos.por}`;
  return `Entregado ${datos.fecha} hora ${datos.hora} a ${datos.a || datos.por}`;
};

export const COLOR_TODOS = '#F5B800';

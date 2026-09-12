export type CumplimientoDepartamento = {
  antirruido: boolean;
  noFumar: boolean;
  sensor: boolean;
};

export type DepartamentoRentaCorta = {
  id: number;
  departamento: string;
  responsable: string;
  estado: 'Inscripto' | 'No inscripto' | 'Pendiente';
  administrador: string;
  anfitrion: string;
  propietario: string;
  telAdmin?: string;
  telAnfitrion?: string;
  telPropietario?: string;
  mascotas: boolean;
  ocultarNumero: boolean;
  cumplimiento: CumplimientoDepartamento;
};

export const reglasEstados = ['Inscripto', 'No inscripto', 'Pendiente'];
export const reglasTorres = ['A', 'B', 'C'];
export const reglasDepartamentosFiltro = ['100', '101', '102'];
export const reglasPisos = ['1', '2', '3', '4'];

export const reglasDepartamentos: DepartamentoRentaCorta[] = [
  { id: 1, departamento: 'Dpto 100 A', responsable: 'Maria Perez', estado: 'Inscripto', administrador: 'Carlos Gómez', anfitrion: 'María Pérez', propietario: 'Juan López', telAdmin: '+51999888777', telAnfitrion: '+51999777666', telPropietario: '+51999666555', mascotas: true, ocultarNumero: false, cumplimiento: { antirruido: true, noFumar: true, sensor: true } },
  { id: 2, departamento: 'Dpto 101 A', responsable: 'Maria Perez', estado: 'No inscripto', administrador: 'Carlos Gómez', anfitrion: 'María Pérez', propietario: 'Juan López', telAdmin: '+51999888777', telAnfitrion: '+51999777666', telPropietario: '+51999666555', mascotas: false, ocultarNumero: false, cumplimiento: { antirruido: false, noFumar: true, sensor: false } },
  { id: 3, departamento: 'Dpto 102 B', responsable: 'Maria Perez', estado: 'Pendiente', administrador: 'Carlos Gómez', anfitrion: 'María Pérez', propietario: 'Juan López', telAdmin: '+51999888777', telAnfitrion: '+51999777666', telPropietario: '+51999666555', mascotas: true, ocultarNumero: true, cumplimiento: { antirruido: true, noFumar: false, sensor: true } },
];

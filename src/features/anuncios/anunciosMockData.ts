import type { Anuncio } from "./types/anuncios";
export type { Anuncio } from "./types/anuncios";
export const anunciosCategorias = ['Servicios', 'Eventos', 'Mantenimiento', 'Seguridad', 'Administración'];

export const anuncios: Anuncio[] = [
  {
    id: 697,
    categoria: 'Servicios',
    titulo: 'Corte de Gas',
    descripcion: 'Se plantean mejoras para el espacio compartido para que todos podamos disfrutar en familia, anexando juegos para menores con seguridad, mas tachos de basura y un baño con cambiador. $50 por departamento para el mes de julio.',
    fechaPublicada: '10/04/2025',
    fechaFinalizacion: '16/04/2025',
    fechaCorta: '22/10/2024',
    votacion: true,
    progreso: 50,
    umbral: 70,
    ocultarResultados: true,
    opcionesVotacion: ['A favor', 'En contra', 'Abstención'],
    votosSi: ['A100', 'B100', 'C100', 'A101', 'B101', 'C101', 'A102', 'B102', 'C102', 'A103', 'B103', 'C103'],
    votosNo: ['A101', 'B120', 'C103', 'A158', 'B991', 'C108', 'A177', 'B102', 'C102', 'A138', 'B143', 'C183'],
  },
  {
    id: 698,
    categoria: 'Servicios',
    titulo: 'Corte de Gas',
    descripcion: 'Se informa a todos los residentes que el día 24/10/2024 se realizará un corte programado del suministro de gas para tareas de mantenimiento preventivo en la red del condominio.',
    fechaPublicada: '08/04/2025',
    fechaFinalizacion: '14/04/2025',
    fechaCorta: '22/10/2024',
    votacion: false,
    paraHuespedes: true,
  },
  {
    id: 699,
    categoria: 'Servicios',
    titulo: 'Corte de Gas',
    descripcion: 'Recordatorio: durante el corte de gas programado, los ascensores y bombas de agua funcionarán con normalidad gracias al generador de emergencia.',
    fechaPublicada: '06/04/2025',
    fechaFinalizacion: '12/04/2025',
    fechaCorta: '22/10/2024',
    votacion: false,
    paraHuespedes: true,
  },
];

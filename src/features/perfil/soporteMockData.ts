export interface FaqItem {
  id: number;
  categoria: string;
  pregunta: string;
  respuesta: string;
}

export interface CategoriaPQRS {
  id: string;
  subcategorias: string[];
}

export const CATEGORIA_COLORS: Record<string, { bg: string; color: string }> = {
  Seguridad: { bg: "#F59E0B", color: "#fff" },
  Comunidad: { bg: "#6B7280", color: "#fff" },
  Puntos: { bg: "#2563EB", color: "#fff" },
};

export const CATEGORIAS: string[] = ["Seguridad", "Comunidad", "Puntos"];

export const faqItems: FaqItem[] = [
  {
    id: 1,
    categoria: "Seguridad",
    pregunta: "¿Cómo cambio mi contraseña?",
    respuesta:
      "Ingresa a Perfil > Seguridad > Cambiar Contraseña. Te enviaremos un enlace de restablecimiento a tu correo de respaldo, válido por 15 minutos.",
  },
  {
    id: 2,
    categoria: "Seguridad",
    pregunta: "¿Cómo configuro mi F2A?",
    respuesta:
      'En Perfil > Seguridad > Usabilidad, activa el interruptor "Factor F2A" y sigue los pasos para vincular tu app de autenticación.',
  },
  {
    id: 3,
    categoria: "Comunidad",
    pregunta: "¿Cómo uso el chat?",
    respuesta:
      "Desde el inicio, toca el ícono de mensaje flotante para abrir el chat con portería o administración.",
  },
  {
    id: 4,
    categoria: "Comunidad",
    pregunta: "¿Me puede escribir el portero?",
    respuesta:
      "Sí, el personal de portería puede iniciar una conversación contigo a través del chat de la app cuando sea necesario.",
  },
  {
    id: 5,
    categoria: "Puntos",
    pregunta: "¿Cómo sumo puntos?",
    respuesta:
      "Sumas puntos al participar en actividades de la comunidad, reciclar y completar tu agenda de tareas como Residente Inquilino Lider.",
  },
  {
    id: 6,
    categoria: "Puntos",
    pregunta: "¿Se vencen los puntos?",
    respuesta:
      "Sí, los puntos acumulados vencen a los 12 meses de haber sido otorgados si no se canjean.",
  },
  {
    id: 7,
    categoria: "Puntos",
    pregunta: "¿Qué beneficio me dan los puntos?",
    respuesta:
      "Los puntos pueden canjearse por descuentos en cuotas, beneficios con comercios aliados y reconocimientos dentro de tu nivel de reputación.",
  },
];

export const CATEGORIAS_PQRS: CategoriaPQRS[] = [
  {
    id: "Condominio",
    subcategorias: ["Pregunta", "Queja", "Reclamo", "Sugerencia"],
  },
  { id: "Aplicación VeciYo", subcategorias: ["Idea", "Soporte"] },
  { id: "Constructora TyC", subcategorias: [] },
  { id: "Documentos antiguos", subcategorias: [] },
];

export const estadosReclamo = ["Pendiente", "En curso", "Resuelto"];

export const contactoSoporte = {
  telefono: "+593 952507151",
  email: "VeciYomanda@gmail.com",
  ubicacion: "Peru, Miraflores, san salvador 123",
  horarios: "10am → 18:00pm",
};

export const reclamosInit = [
  {
    id: 1234,
    numero: "1234",
    nombre: "Ana Flores",
    ci: "1782753581",
    titulo: "Consulta sobre horarios de piscina",
    descripcion:
      "Quisiera saber cuáles son los horarios habilitados para usar la piscina durante los fines de semana y si hay restricciones para menores de edad.",
    modelo: "iPhone 14",
    categoria: "Consulta",
    tipo: "Convivencia",
    estado: "Resuelto",
    fechaCreacion: "15/05/2024",
    fechaRevision: "18/05/2024",
    resolucionAdmin:
      "Los horarios de piscina son de 08:00 a 20:00 todos los días. Los menores deben estar acompañados de un adulto responsable.",
  },
  {
    id: 5463,
    numero: "5463",
    nombre: "Ana Flores",
    ci: "1782753581",
    titulo: "Fuga de agua en la cocina perdida constante",
    descripcion:
      "Fuga de agua en la cocina perdida constante\nFuga de agua en la cocina perdida constante\nFuga de agua en la cocina perdida constante",
    modelo: "iPhone 16 pro max",
    categoria: "Reclamo",
    tipo: "Mantenimiento",
    estado: "En curso",
    fechaCreacion: "22/10/2024",
    fechaRevision: "24/10/2024",
  },
  {
    id: 2535,
    numero: "2535",
    nombre: "Anuel Flores",
    ci: "1785643581",
    titulo: "Sugerencia para mejorar la iluminación del estacionamiento",
    descripcion:
      "El estacionamiento del sótano tiene poca iluminación. Sugiero instalar luces LED con sensores de movimiento para mayor seguridad.",
    modelo: "Samsung Galaxy S23",
    categoria: "Sugerencia",
    tipo: "Seguridad",
    estado: "Pendiente",
    fechaCreacion: "15/05/2024",
    fechaRevision: "15/05/2024",
  },
  {
    id: 5679,
    numero: "5679",
    nombre: "Anuel Flores",
    ci: "1785643581",
    titulo: "Cobro duplicado en cuota de mantenimiento",
    descripcion:
      "En el último estado de cuenta aparece el cobro de la cuota de mantenimiento dos veces para la misma unidad.",
    modelo: "Motorola Edge 40",
    categoria: "Reclamo",
    tipo: "Pagos",
    estado: "Pendiente",
    fechaCreacion: "15/05/2024",
    fechaRevision: "15/05/2024",
  },
  {
    id: 8910,
    numero: "8910",
    nombre: "Carlos Méndez",
    ci: "1791234567",
    titulo: "¿Cómo puedo registrar a un familiar como residente?",
    descripcion:
      "Necesito saber cuál es el procedimiento para registrar a mi hermana como residente permanente del departamento.",
    modelo: "iPhone 15",
    categoria: "Pregunta",
    tipo: "Otras",
    estado: "Resuelto",
    fechaCreacion: "10/03/2025",
    fechaRevision: "12/03/2025",
    resolucionAdmin:
      "Debe ingresar a Configuración > Agregar Familiar y completar los datos solicitados. Si tiene dudas, puede contactar a soporte.",
  },
  {
    id: 8911,
    numero: "8911",
    nombre: "María Juarez",
    ci: "1723456789",
    titulo: "Consulta sobre días de recolección de basura",
    descripcion:
      "¿Cuáles son los días y horarios de recolección de basura? Encontré bolsas acumuladas y no sé cuándo sacarlas.",
    modelo: "Samsung Galaxy S24",
    categoria: "Consulta",
    tipo: "Servicios",
    estado: "Resuelto",
    fechaCreacion: "05/02/2025",
    fechaRevision: "07/02/2025",
    resolucionAdmin:
      "La recolección de basura se realiza los lunes, miércoles y viernes de 18:00 a 20:00. Los residuos deben sacarse en bolsas cerradas.",
  },
  {
    id: 8912,
    numero: "8912",
    nombre: "Sofia Martinez",
    ci: "1759632584",
    titulo: "Sugerencia de taller de convivencia vecinal",
    descripcion:
      "Propongo organizar un taller trimestral de convivencia para mejorar la comunicación entre vecinos y resolver conflictos de forma pacífica.",
    modelo: "Pixel 8",
    categoria: "Sugerencia",
    tipo: "Otras",
    estado: "Resuelto",
    fechaCreacion: "20/01/2025",
    fechaRevision: "22/01/2025",
    resolucionAdmin:
      "Gracias por la sugerencia. Se evaluará la propuesta en la próxima reunión de administración.",
  },
];

export const DESTINATARIOS = ["Administrador", "Propietario", "Aplicación"];
export const MEDIOS_CONTACTO = ["Correo electrónico", "Teléfono", "Cualquiera"];

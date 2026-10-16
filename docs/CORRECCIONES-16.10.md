# Correcciones 16.10

Observaciones de la responsable de producto (M) del 16/10/2026, en el orden en
que llegaron. Estado: **hecho** (con prueba), **a medias** (qué falta),
**pregunta** (no se puede decidir sin el cliente), **pendiente**.

## Web del preregistro (veciyo-web)

| # | Observación | Estado |
|---|---|---|
| W1 | Título «Preregistro de Seguridad del Condominio» + nombre del edificio | hecho |
| W2 | Cantidad de huéspedes: «La indicas tú (máximo N)», N del anfitrión o, si no, del edificio | hecho (función `consultar_precheckin` devuelve el del edificio) |
| W3 | «Te lo envió Sofía tu anfitrión, para…» | hecho |
| W4 | «En este condominio es requisito completar…», más grande | hecho |
| W5 | «Para completar tu pre registro de seguridad, ten a la mano lo siguiente:» | hecho |
| W6 | «El personal de seguridad en recepción lo verifica cuando ingreses» | hecho |
| W7 | Al inicio, tres opciones: entrar como invitado, crear cuenta, iniciar sesión. La cuenta no se crea al empezar | hecho (`ComoEntrar`) |
| W8 | Horas: «personal de seguridad» en vez de «portería», y opción «Aún no sé» | hecho (`CampoHora`) |
| W9 | Texto de acompañantes: los términos los acepta cada miembro y reciben el instructivo por correo | hecho |
| W10 | «…no está en capacidad de aceptar por su cuenta…» | hecho |
| W11 | «¿Por qué no está en capacidad de aceptar los términos y condiciones por sí mismo(a)?» | hecho |
| W12 | Texto de protección de menores (explotación comercial sexual de NNA) | hecho (web y app) |
| W13 | Parentesco: quitar «Otra persona» | hecho (web y app) |
| W14 | Acompañante: tres opciones, documentos obligatorios, mismos campos (motivo, dirección) y mismos términos | hecho; las fotos pasan a obligatorias también para el titular |
| W15 | Pantalla final del acompañante: «El equipo de seguridad te espera…» + «recibirás confirmación… con un QR» | hecho (texto). El correo con el QR al completar el grupo: ver A21 |
| W16 | Pantalla final: lista nueva de «Por qué crear tu cuenta y descargar la aplicación», logos de App Store y Google Play con enlaces provisionales, sin el enlace escrito | hecho |

## Aplicación

| # | Observación | Estado |
|---|---|---|
| A1 | «Departamentos habilitados para renta corta» solo para seguridad y administración | hecho (pantalla y base; pruebas en `conversaciones` y `anfitrion-configura-alojamiento`) |
| A2 | «Hoy» del anfitrión como el del guardia, solo sus viviendas, hoy y mañana, con filtro | hecho (recorrido como Sofía) |
| A3 | Nombre del edificio en Viviendas | hecho (recorrido) |
| A4 | Origen de la reserva: logo Airbnb / Booking (calendario) o «Directo»; al crear a mano elegir Airbnb, Booking o Directo; fuente y método del dato | hecho (`visita.plataforma`; recorrido creando una de Airbnb) |
| A5 | Al no autorizar a un huésped: decir al anfitrión que gestione la cancelación con su plataforma | hecho (recorrido) |
| A6 | Clave de la puerta por reserva: la pone el anfitrión, la ve solo el huésped en Alojamiento | hecho (en el Vault; prueba mutada) |
| A7 | Guardia: estado en vez del paso a paso («Incompleto», «Falta aceptar términos», «Falta aprobación del anfitrión» sin decir por qué) | hecho (recorrido como Juan; la base le dice si falta el anfitrión, sin el motivo) |
| A8 | Guardia en la entrada: ver el documento guardado y confirmar que es la misma persona; luego escanear el documento (no se guarda) y compararlo. Primero lo visual | hecho lo visual (recorrido: ve las dos fotos); la comparación automática queda pendiente |
| A9 | Gratitud: solo entre residentes; el cuadro de Inicio vuelve 30 días después de dar uno; en gris «En X días podrás…» | hecho (prueba mutada) |
| A10 | Botón «Dar reconocimiento» → «Gratitud» | hecho (recorrido) |
| A11 | Insignias: Reciclador → «Amigable con el medio ambiente»; Puntual → huellita «Mascotalover» | hecho (recorrido) |
| A12 | Selector de propiedades de arriba: decir el rol (aclarar el de Sofía) | hecho («Propietario · …», recorrido) |
| A13 | Cuota de administración en 2 modalidades | pregunta |
| A14 | Parametrizar si se muestran los morosos en Cuadro de Honor | ya existía (Permisos › Visibilidad de cuotas); se aclaró el texto |
| A15 | PQRS: la administración/portería la registra eligiendo departamento, o desde la reserva del huésped | hecho (`reclamo.visita_id`; botón en la reserva del anfitrión y de la portería) |
| A16 | Historial por alojamiento (visitas, domicilios, zonas, salidas de objetos…) en el detalle de la reserva | hecho, salvo salidas de objetos (no hay dónde anotarlas) |
| A21 | Correo al huésped con QR cuando todo el grupo completó el registro | hecho (sale cuando hay proveedor de correo; prueba en la base) |

## Encontrado de paso

- La portería veía «Preregistro completo» con consultas falladas: no puede
  leerlas, así que la base le dice solo si falta el anfitrión.
- El aviso de «ingreso aprobado» habría salido al cerrar, antes de las
  consultas: el disparador espera al final de la operación.
- La validación del titular decía que al acompañante le faltaban documentos
  si los subió con la pantalla abierta.
- «Compartí este mensaje» (voseo) y «no la autorizaste» (sale para cualquiera).
- Una corrida de pruebas detenida a mitad dejó textos `[prueba]` en la 102;
  limpiados.

## Comparación con la maqueta — Propietario (16/10/2026)

Maqueta: rama `feature/mobile-app` con «Demo Propietario»; app: Sofía.
Igual en Login, Correspondencia, Anuncios, Cuadro de Honor, Perfil y la
estructura de Configuración. Cambiado para seguirla:

1. Inicio abre con Reputación; «Tus huéspedes» va debajo de «Hoy», con 2
   avisos y «Ver todas».
2. Viviendas: el apodo es el título; la torre, el código y el edificio,
   encima.
3. Configuración: los huéspedes temporales en su propio bloque, fuera de
   «Residentes actuales».
4. Zonas comunes: las ilustraciones de la maqueta (por la clave elegida o
   el nombre); sin dibujo, el emoji.
5. Perfil: silueta neutra en vez de la misma foto de hombre para todos.

Se quedan distintos a propósito: Reglamentos (la lista de renta corta es
solo de portería y administración, lo pidió M), las pestañas y filtros de
Visitas, y la barra de morosos (según lo que publique la administración).

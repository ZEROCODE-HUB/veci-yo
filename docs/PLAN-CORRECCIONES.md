# Plan de correcciones — revisión del 13/10/2026

Pedido del cliente: revisar **todo lo demás** con el mismo rigor que la renta
corta y las visitas, y armar el plan de correcciones.

## Cómo se hizo, y qué vale

- Cuatro revisiones de código, una por zona de la aplicación, siguiendo cada
  botón hasta la base. **No se pulsó nada**: la extensión del navegador no
  estaba conectada ese día.
- De los hallazgos graves comprobé a mano ocho (seis en el código, dos en la
  base real). Los ocho eran ciertos.
- Así que esta lista es **fiable pero no recorrida**. Cada fase termina
  recorriéndola en el navegador con el papel que la usa, como manda la regla
  10 de `AGENTS.md`. Ahí pueden salir más cosas, o caerse alguna.

Total: **72 hallazgos**. Uno ya está corregido (el de seguridad, abajo).

## Ya corregido hoy

- **Cualquier residente, un huésped o el guardia podían cambiar la clave de
  la puerta, el wifi y el token del ministerio de una vivienda.** Cerrado en
  la base y con su prueba (`20261013160000`).

---

## Fase 1 — Lo que dice «hecho» y no lo hace

Es lo más caro: quien lo pulsa no vuelve a intentarlo.

| # | Qué pasa | Dónde |
|---|---|---|
| 1 | **No se puede dar de alta un guardia.** El formulario pide todo y al final dice «invítalo desde Coadministradores», donde solo se invita a coadministradores. | Administración → Seguridad |
| 2 | **«Modificar turno puntual» no guarda nada.** | Administración → Seguridad |
| 3 | **Al editar un guardia, los permisos de chat y llamadas no se guardan**, y pide un correo que luego tira. | Administración → Seguridad |
| 4 | **Las llamadas son un simulacro.** No marcan ningún número, el contador arranca en 00:15 y «Rechazar» guarda una llamada perdida que no existió. | Inicio → Llamadas |
| 5 | **«Marcar Comité de Propietarios» no se guarda.** | Directorio |
| 6 | **«Dejar en borrador» una encuesta cerrada no cambia nada.** | Anuncios |
| 7 | **«Terminar turno» del guardia no hace nada** y dice que le quitó los privilegios. La tarjeta dice siempre «En turno activo». | Perfil → Configuración |
| 8 | **«Enviar a PQRs» desde una reserva no envía nada.** | Zonas (portería) |
| 9 | **El teléfono del perfil no se guarda nunca.** Sin él no se pueden activar avisos por WhatsApp. | Perfil → Configuración |
| 10 | **«Correo de respaldo» se pierde al cerrar.** | Perfil → Seguridad |
| 11 | **«Editar» a un residente** muestra nombre, teléfono, rol y contacto de emergencia, dice «Cambios guardados» y no guarda ninguno. | Propietario → Configuración |
| 12 | **«Eliminar» a un residente o un servicio dice «eliminado» aunque no se haya eliminado**, cuando quien lo pulsa no tiene permiso. | Propietario → Configuración |
| 13 | **«Mis vehículos» no deja registrar ninguno.** Siempre «0 de 0». | Propietario → Configuración |
| 14 | **La zona común pierde cuatro campos**: imagen, días habilitados, fechas especiales y horarios. | Administración → Zonas |
| 15 | **La casilla «Avisar a quien le toque» no cuenta**: el anuncio avisa siempre. | Anuncios |
| 16 | **«¿Integrar con un PMS? Sí» no se guarda.** | Renta corta |
| 17 | **El horario de entrada que pone el anfitrión no lo ve nadie**: el huésped y la portería ven el de la administración. | Renta corta |
| 18 | **El registro pide «fecha de último ingreso al país» y «motivo» y los tira.** Los términos aceptados tampoco quedan anotados. | Registro |
| 19 | «Eliminar cuenta» y «Pausar cuenta» piden motivo y confirmación para decir que no están disponibles. | Perfil |

## Fase 2 — Lo que falla o deja datos mal

| # | Qué pasa | Dónde |
|---|---|---|
| 20 | **Permisos de vivienda: la pantalla no carga lo guardado y «Guardar» lo pisa** con valores por defecto. | Administración → Permisos |
| 21 | **Un coadministrador invitado con permisos apagados entra con todos.** | Administración → Coadministradores |
| 22 | **Editar una reserva de zona falla siempre**, con un error en inglés. | Administración → Reservas |
| 23 | **Guardar turnos puede dejar al guardia sin ningún horario** si se repite un día y hora. | Administración → Seguridad |
| 24 | **Reservar «mañana» reserva para hoy.** | Zonas |
| 25 | **De noche la grilla de zonas se descuadra** (ofrece horas pasadas; mañana sale recortado). | Zonas |
| 26 | **Las últimas horas del día abren un formulario sin hora** y sin forma de elegirla. | Zonas |
| 27 | **La encuesta cierra un día antes de lo que dice la pantalla**: el último día el vecino vota y recibe error. Una encuesta de un solo día es imposible. | Anuncios |
| 28 | **El voto múltiple no cuadra con el voto por vivienda.** | Anuncios |
| 29 | **Depósitos: asignar departamento falla**, al crear y al editar. | Administración → Arquitectura |
| 30 | **Una torre con numeración repetida se crea sin viviendas**, y al reintentar se duplica. | Administración → Arquitectura |
| 31 | **Un edificio sin administrador no se puede arreglar desde el panel**: no hay dónde reenviar la invitación. | Plataforma |
| 32 | **El S.O.S. cancelado mientras dice «Avisando…» queda abierto**: los guardias lo reciben igual. | Perfil → S.O.S. |
| 33 | **El S.O.S. y las PQRS salen de «la primera vivienda»**, no de la elegida. | Perfil |
| 34 | **El monto del alquiler con puntos se guarda mal** («850.000» queda en 850). | Propietario → Contratos |
| 35 | **Un contrato no se puede finalizar.** | Propietario → Contratos |
| 36 | **La carga de pagos promete Excel y lo lee como texto**; un CSV con más columnas marca viviendas equivocadas. | Directorio → Pagos |
| 37 | **Nadie puede crear el mes de la cuota.** | Directorio → Pagos |
| 38 | **Una PQRS no se puede dejar en «Pendiente»**, y al intentarlo se borra la resolución. | PQRS |
| 39 | **«Crear cuenta» desde una invitación pierde la invitación.** | Registro |
| 40 | **Interruptor «notificaciones en datos alternativos»** queda encendido en pantalla y apagado en la base. | Perfil |
| 41 | **«Nuevo chat»: el selector no muestra lo elegido.** La pestaña «Torres» del guardia solo vacía la lista. | Chat |
| 42 | **Directorio: el detalle dice «Sin asignar»** con dueño, y «Llamar» marca a un número vacío. | Directorio |
| 43 | **Deshacer una entrega reescribe quién recibió el paquete.** Si falla una foto, el paquete queda creado y se anuncia como fallido. | Correspondencia |
| 44 | Se puede invitar dos veces al mismo correo, y «ana@» pasa como correo. | Propietario → Invitar |
| 45 | La configuración de renta corta puede guardarse en blanco si la lectura falló. | Renta corta |
| 46 | La reserva de zona se crea en dos pasos y puede quedar a medias. | Zonas |

## Fase 3 — Validaciones y mensajes

- **Borrados a un toque, sin confirmar**: vivienda, cochera, depósito, rol de plataforma. «Rechazar» una reserva también. «Eliminar permanentemente» una reserva solo la cancela.
- **«Publicar» se queda mudo** si falta categoría u opciones. Se puede publicar sin audiencia. Doble toque publica dos veces.
- **Formularios sin validar**: datos del condominio (se puede dejar sin nombre), zona común (horas en texto libre), reportes (fechas al revés), PQRS (correo y teléfono), contrato (fechas imposibles), renta corta (números negativos, iCal).
- **Registro**: el teléfono se guarda con el prefijo a mano y sin país.
- **Errores en inglés o sin motivo**: registro, chat, zonas, cuotas, renta corta.
- **Fallos que no se dicen**: «marcar todos leídos», silenciar, verificar equipamiento, «Mi alojamiento».
- **Botones sin bloquear mientras envían**: recuperar contraseña, Google, publicar, marcar pagado.
- Los filtros de fecha de anuncios no filtran. No hay cómo eliminar un anuncio.
- El chat borra lo escrito antes de saber si se envió.
- Otros «hoy» mal calculados de 19:00 a medianoche (invitar, estancias, periodo pagado).

## Fase 4 — Textos

- **El trato**: unas pantallas hablan de vos, otras de tú y otras de usted. Hay que elegir uno. Propongo **tú**.
- Faltas de tilde en mensajes y etiquetas.
- Etiquetas equivocadas: «Días del calendario» ofrece ciudades de Ecuador; «RUC» fijo; «(Titular)» en un acompañante; «Persona» repite departamentos.
- Tres pantallas que fingen y a las que hoy no se llega: se borran.

---

## Estado al 13/10/2026

Las ocho decisiones de abajo están respondidas y aplicadas:

1. Llamadas: abren el marcador del teléfono.
2. Guardias: se dan de alta por invitación.
3. Profesional permanente: registro por día, con los días que elige la vecina.
4. Horario de entrada: el del anfitrión, dentro del límite del edificio.
5. Comité, vehículos, terminar turno, correo de respaldo y PMS: construidos.
6. Trato: tú.
7. Cuotas: importe, moneda y vencimiento configurables; importe propio por
   vivienda; el mes se crea solo o a mano.
8. «Pausar cuenta» se quitó; «Eliminar cuenta» funciona.

Lo que elegí por mi cuenta al construirlo está en `REVISAR-A-OJO.md`, punto 196.

**Falta**, y no está hecho:

- Recorrerlo todo en el navegador (la extensión no conectó).
- La reserva de zona en dos pasos (46).
- La verificación de identidad no guarda las fotos y pide reverso al pasaporte.
- El QR de reputación: no se revisó.

## Decisiones que necesito del cliente

1. **Llamadas.** ¿Se quitan hasta que haya llamada de verdad, o se dejan como «abrir el marcador del teléfono»?
2. **Guardias.** ¿Cómo se da de alta uno? Propongo: por invitación, igual que un coadministrador.
3. **Profesional permanente.** Propongo un registro por día: la portería marca entrada y salida cada día, y la vecina elige qué días trabaja. (Pendiente del día anterior.)
4. **Horario de entrada.** ¿Manda el del anfitrión o el de la administración? Propongo: el del anfitrión, dentro del límite que ponga el edificio.
5. **Comité de propietarios**, **vehículos del residente**, **«Terminar turno»**, **correo de respaldo**, **PMS**: ¿se construyen o se quitan de la pantalla?
6. **Trato**: ¿tú, usted o vos?
7. **Cuotas.** ¿Quién crea el mes y con qué importe?
8. **Eliminar / pausar cuenta.** ¿Se construye o se quita el botón?

## Orden propuesto

Fase 1 y 2 primero, por zona, para recorrer cada una una sola vez:

1. Administración (seguridad, permisos, coadministradores, arquitectura, zonas)
2. Zonas comunes y anuncios
3. Perfil, registro y S.O.S.
4. Propietario y renta corta
5. Directorio, pagos, chat y correspondencia
6. Fase 3 y 4, transversales

## Lo que esta revisión no cubre

- Nada se recorrió en pantalla. Lo visual, lo que solo sale pulsando.
- Renta corta: la salida del huésped, entrar con el código de Airbnb, eliminar una estancia y dar de baja el servicio siguen sin recorrer.
- Las visitas creadas desde la cuenta de administración.
- La regla del niño y del adulto sin documento: probada contra la base, no en pantalla.

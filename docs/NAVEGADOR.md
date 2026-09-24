# Verificación en el navegador

Los 40 recorridos de `RECORRIDOS.md` comprueban las políticas y el mapeo de
datos llamando a las funciones del repositorio. **No comprueban que haya un
botón conectado a esas funciones**, ni que la pantalla navegue, ni que el
argumento que envía sea el correcto.

Esta lista cubre ese hueco: recorrer la aplicación a mano, con sesión de verdad,
y comprobar contra Supabase que lo que se pulsa **llega a la base**.

## Cómo se verifica cada punto

No basta con que la pantalla no dé error. Un punto queda en verde cuando:

1. se pulsa el control desde la interfaz;
2. la pantalla responde lo que promete (estado, aviso, navegación);
3. y **la fila cambia en Supabase**, comprobado con una consulta aparte.

El tercer paso no es paranoia: el defecto más repetido de este proyecto es
justo ese hueco —la pantalla decía que sí y la base no se enteraba—.

## Lo que esta lista NO cubre

- **Maquetación a ancho de teléfono.** La ventana la fija el usuario con F12 y
  no se puede redimensionar desde aquí (`resize_window` deja la ventana
  inservible). El juicio visual a 414px es del cliente.
- **El modo demo.** Los botones «Demo Propietario», «Demo Seguridad», etc.
  ponen `modo: 'demo'` y **no abren sesión en Supabase**: son el modo en
  memoria del prototipo. Las pantallas se pintan con datos inventados, así que
  un recorrido ahí no prueba nada del backend. No se usa para verificar.

## Acceso

Las contraseñas las escribe el cliente. Una sesión abierta persiste en el
navegador, así que con un acceso se recorre el rol entero.

---

## Portería — `guardia@veciyo.test` (Juan Franco)

Es el rol donde más cambió el comportamiento.

- [ ] La pantalla de inicio carga y no ofrece «Administrar mis ubicaciones»
- [ ] No ofrece «Agregar propiedad»
- [ ] «Departamentos habilitados para renta corta» lleva a una pantalla con sentido
- [ ] El filtro de visitas tiene «Todos» y muestra todo
- [ ] El modal de una visita abre, tiene X y se cierra
- [ ] El modal muestra fecha **y hora** de ingreso y salida
- [ ] Marcar llegada → `invitado.llego` y `ingreso_en` en la base
- [ ] Registrar salida → `salida_en` en la base
- [ ] El estado de la visita pasa de `programada` a `ingresada` y a `finalizada`
- [ ] El botón de llamar abre un `tel:` con número, y hay forma de copiarlo
- [ ] «Asignar estacionamiento» abre **encima**, no detrás
- [ ] Asignar un cupo → la fila del cupo queda ocupada
- [ ] Al terminar la visita, el cupo se suelta
- [ ] Foto de ingreso: se guarda con ruta del bucket, **no** como `blob:`
- [ ] Verificación de documento: escribe en la base
- [ ] Correspondencia: registrar un paquete → nace `en_porteria`
- [ ] Cambiar a entregado → `entregada_en` y `entregada_a`
- [ ] Reportar incidencia → fila colgada del paquete
- [ ] Chat con una vivienda: escribir llega a `mensaje`
- [ ] La pestaña «Viviendas» (decisión pendiente en `REVISAR-A-OJO.md`)

## Vecina residente — `vecino@veciyo.test` (Sofía, 102)

- [ ] Reservar una zona común: **no** deja elegir fecha pasada
- [ ] Reservar → fila en `reserva_zona` con número asignado por la base
- [ ] Apuntar acompañantes → filas en `participante_reserva`
- [ ] Cancelar la reserva → **la reserva queda cancelada de verdad**
- [ ] Registrar una visita → fila en `visita` + `invitado`
- [ ] Abrir PQRS con adjunto → fila + archivo en el bucket
- [ ] Anuncios: ver y votar → fila de voto
- [ ] Notificaciones: se ven las propias y se marcan leídas
- [ ] Chat con administración y con portería, en hilos separados

## Propietario — `propietario@veciyo.test` (Guillermo, 101 y 205)

- [ ] Cambio entre sus dos viviendas
- [ ] Residentes de la vivienda: alta y baja
- [ ] Cuotas: ver estado y registrar pago
- [ ] `ReservaPropietarioDetail` pinta el documento (pendiente en `REVISAR-A-OJO.md`)

## Anfitriona de renta corta — `vecino@veciyo.test` (Sofía, 102)

- [ ] Configurar el alojamiento: guardar y **releer** lo guardado
- [ ] Precheckin: los seis pasos se recorren enteros
- [ ] Los botones del precheckin escriben en la base
- [ ] TRA/SIRE: el botón aparece cuando se puede usar y escribe
- [ ] El RNT que carga el propietario llega al reporte
- [ ] Invitar a un huésped → fila de invitación (el correo sigue apagado)

## Huésped — `nuevo.inquilino@veciyo.test` (Tomás, alojado)

- [ ] El libro del alojamiento muestra las credenciales de la puerta
- [ ] Reservar una zona común (era el 403 de la lavandería)
- [ ] Apuntar a quien va con él
- [ ] No ve lo que no es suyo

## Administración — `admin@veciyo.test` (Marcela)

- [ ] Cambio de rol entre administradora y propietaria de la 301
- [ ] Arquitectura: alta de torre, vivienda, portería y cupo
- [ ] Resolver una reserva: aprobar y rechazar
- [ ] Anuncio con votación: crear y ver resultados
- [ ] Cuotas: carga masiva y filtro de morosidad
- [ ] Generar un reporte → filas + `solicitud_reporte` asentada
- [ ] Guardias y turnos: fijar horario, ajuste puntual, baja
- [ ] PQRS: resolver una
- [ ] **No** lee el hilo de una vivienda con portería

---

## Hallazgos

Se van anotando aquí según aparecen, con la pantalla y qué se esperaba.

_(vacío por ahora)_

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

## Transversal, en cualquier rol

- [ ] **Un fallo de escritura muestra aviso.** El aviso central de
  `providers.tsx` está probado en su regla --a quién le toca hablar-- pero el
  cableado a React Query solo lo garantiza el typecheck. Se confirma forzando
  un fallo real: intentar guardar algo que RLS rechace y ver que sale el aviso,
  y que donde la mutación trae el suyo sale **uno solo**, no dos.

## Portería — `guardia@veciyo.test` (Juan Franco)

Es el rol donde más cambió el comportamiento.

- [x] La pantalla de inicio carga y no ofrece «Administrar mis ubicaciones»
- [x] No ofrece «Agregar propiedad»
- [x] «Departamentos habilitados para renta corta» lleva a una pantalla con sentido
- [x] El filtro de visitas tiene «Todos» y muestra todo
- [x] El modal de una visita abre, tiene X y se cierra
- [x] El modal muestra fecha **y hora** de ingreso y salida
- [x] Marcar llegada → `invitado.llego` y `ingreso_en` en la base
- [x] Registrar salida → `salida_en` en la base
- [x] El estado de la visita pasa de `programada` a `ingresada` y a `finalizada`
- [~] El botón de llamar muestra el nombre de la residente (antes era un `tel:` vacío); falta comprobar el `tel:` y el copiar
- [x] «Asignar estacionamiento» abre **encima**, no detrás
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

### 0. La tarjeta de confirmación decía «Pendiente» siempre — **arreglado**

`VisitaSuccessView` llevaba `<Badge status="Pendiente" />` **escrito a fuego**.
Cuando la portería registra a alguien que ya está en la puerta, la visita nace
`ingresada` --lo pone `crearVisita`, y el disparador rellena `ingreso_en` y marca
al invitado--, así que el guardia acababa de dejar entrar a una persona y la
pantalla le decía «Pendiente». Dos toques más allá, la lista ya decía «Ingreso el
24/09/2026 a las 15:26».

Es el defecto de siempre --la decisión vivía en la pantalla-- y es la cola del
que reportó el cliente: *«hay un status que dice Pendiente... por mas que marco
llegada y salida sigue en pendiente»*. La lista y el detalle ya estaban
arreglados; quedaba la tarjeta de confirmación.

Ninguna prueba automática lo habría pillado: no es una regla de datos, es un
literal en un componente. Salió de registrar una visita a mano.

Se comprobó el otro literal de la misma forma (`Badge status="En Portería"` en
correspondencia) y ese **sí** es correcto por construcción: un paquete recién
registrado siempre está en portería.

### 1. Nadie podía votar una encuesta desde la aplicación — **arreglado**

`AnuncioVotacionCard` estaba **entera decorativa**: los botones «Sí» y «No»
llevaban `onPress={() => {}}` y las opciones eran `Pressable` sin `onPress`
ninguno.

Lo llamativo es que todo lo demás estaba escrito desde el principio: la función
`votar` del repositorio, la mutación `emitirVoto` del hook, y hasta `miVoto` y
`yaVote` para saber qué había elegido cada quien. Faltaba **solo el eslabón de
en medio**, así que la pantalla enseñaba la encuesta y el voto no salía de ahí.

Por qué no lo vio nada de lo que ya había:

- el recorrido `administracion-anuncio-con-votacion` llama a `votar`
  directamente, así que pasaba en verde;
- `npm run sueltas` tampoco, porque `votar` **sí** se llama —desde un hook que
  no usaba nadie—. La cadena se rompía un eslabón más afuera del que esa
  herramienta mira.

De paso, la tarjeta pintaba `opcionesVotacion`, que es solo la lista de
etiquetas: el `uuid` de cada opción —que es lo que hay que enviar— viaja en
`anuncio.opciones` y se estaba tirando.

Se quitó además la rama de «Sí / No», que era inalcanzable: el formulario exige
dos opciones como mínimo, y `voto.opcion_id` es `not null`, así que una encuesta
sin opciones no se puede votar por construcción.

### 2. Quince escrituras que fallaban en silencio — **arreglado**

Las consultas ya tenían aviso central en `providers.tsx` desde el arreglo de
correspondencia; las **escrituras no**. Quedaban quince mutaciones repartidas
por ocho hooks --el chat, las notificaciones, las ubicaciones del inquilino
líder, los reclamos, el registro, la recuperación, la verificación y los
servicios-- sin `onError` ninguno.

Una consulta que falla deja la pantalla vacía. Una mutación que falla deja a la
persona **creyendo que guardó**, que es peor.

Se añade un `MutationCache` con aviso, que se calla cuando la mutación ya trae
el suyo --son 65 las que lo traen-- para no sacar dos mensajes por un fallo y
tapar el bueno con el genérico.

Ojo con el recuento: el primer barrido decía 32, y trece eran falsos positivos
de `useAdministradorArquitectura` y `useAdministradorSeguridad`, que sí los
manejan con un `...opciones` que el detector no veía.

### 2b. Visitas de prueba que sobrevivían a la suite — **arreglado**

Tres visitas `[prueba]` de la noche anterior seguían en el Supabase del cliente,
y **ninguna corrida se puso roja**. Se vieron mirando la aplicación.

La causa no era la que supuse. Cada recorrido limpia lo suyo en su `afterAll`,
pero ese borrado devolvía un **409**: `reporte_legal` y
`verificacion_antecedentes` apuntan al invitado con `on delete restrict`, y
`supabase-js` no lanza, así que el fallo pasaba de largo. Que esas dos tablas no
cascadeen está bien --una presentación a TRA/SIRE es una constancia ante una
autoridad--, y a la aplicación no le afecta porque `eliminarVisita` es un borrado
**lógico**. Es la limpieza de las pruebas la que borra en duro.

`limpieza-global.ts` barre ahora las visitas marcadas antes de cada suite,
retirando primero lo que bloquea, y **comprueba contando** al terminar. El
reporte legal necesita la clave de servicio: `reporte_legal` solo tiene políticas
de alta, cambio y lectura --no de borrado, y así debe ser--, de modo que con
sesión de persona el `delete` responde éxito y no borra nada.

De paso, un aviso sobre mí mismo: al comprobarlo filtré la salida de
`npm run test:rls` con un `grep` y **me tapó que la suite entera no arrancó**.
Es la lección de no silenciar la salida, repetida.

### 3. Dos pantallas que nadie puede alcanzar — **decisión pendiente**

`AdministradorZonas` --un segundo administrador de zonas comunes, en paralelo al
que sí se usa-- y `AgregarServicio`, que además simula el guardado y no escribe
nada. Ambas registradas como ruta y sin un solo botón que lleve a ellas. En
`REVISAR-A-OJO.md`, punto 11.

### 4. Cuatro botones más que no hacen nada — **decisión pendiente**

`npm run botones` (nuevo) los encuentra. De ninguno existe nada en la base ni en
el KT: son funciones sin construir pintadas como botones. Están en
`REVISAR-A-OJO.md`, punto 10.


## Lecciones del navegador

- **No correr la suite mientras se recorre la app.** `signOut()` es **global**
  por defecto y revoca los tokens de la cuenta en todas partes, así que
  `npm run test:rls` cierra la sesión del navegador si comparten cuenta. La app
  salta a `/login` sin un error en consola y parece que echó al usuario sola.
  `salir()` ya usa `scope: "local"`, pero el consejo sigue en pie.

- **El estilo calculado miente cuando hay Reanimated.** La tarjeta de un modal y
  su velo daban `opacity: 0` en `getComputedStyle` mientras en pantalla se veían
  perfectamente. Estuve a punto de reportar un defecto que no existía. Para
  juicio visual, **captura**; el DOM sirve para textos y para datos, no para
  saber qué se pinta.
- **Una pantalla montada debajo sigue respondiendo.** Pulsar por texto encuentra
  nodos de la pantalla anterior, todavía montada bajo la actual, y el resultado
  parece un fallo de la pantalla nueva. Hay que elegir el nodo visible y dentro
  del área esperada, no el primero que coincida.
- **El viewport de la app son 414×896**, aunque la ventana de Chrome sea mayor:
  se puede juzgar maquetación de teléfono sin redimensionar nada.

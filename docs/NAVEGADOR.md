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
- [x] El botón de llamar abre un `tel:` con número, y el icono de copiar está al lado
- [x] «Asignar estacionamiento» abre **encima**, no detrás
- [~] Asignar un cupo: el modal abre y lista el cupo, pero el único de visita está legítimamente ocupado por una reserva del cliente, así que no se asigna sin tocar sus datos. Cubierto por el recorrido
- [~] Al terminar la visita, el cupo se suelta: mismo motivo. Cubierto por el recorrido y su disparador
- [~] Foto de ingreso: **no verificable desde aquí**. El selector de archivos de Expo abre un diálogo del sistema, que bloquea la extensión entera. La cadena `Seleccionar archivos` → `onAddEntryPhotos` → `adjuntarFotosVisita` está comprobada en el código, y el recorrido cubre la subida al bucket; lo que falta es pulsar
- [x] Verificación de documento: escribe en la base
- [x] Correspondencia: registrar un paquete → nace `en_porteria`
- [~] Cambiar a entregado → `entregada_en` sí; **`entregada_a` se queda en `null`** salvo entrega en puerta (hallazgo 6)
- [x] Reportar incidencia → fila colgada del paquete
- [x] Chat: **no se le ofrece**, y es correcto — este guardia no tiene el permiso (hallazgo 8)
- [x] La pestaña «Viviendas» (decisión pendiente en `REVISAR-A-OJO.md`)

## Vecina residente — `vecino@veciyo.test` (Sofía, 102)

**Empezar por votar un anuncio.** El arreglo de `AnuncioVotacionCard` --la
tarjeta que era decorativa entera-- se hizo **a ciegas**, leyendo código, porque
en ese momento no había sesión con la que abrir la aplicación. Es el único
cambio de toda la ronda que no se ha visto funcionando, así que es lo primero
que hay que comprobar: que las opciones se pulsan, que el voto llega a `voto`
con su `opcion_id`, y que un segundo voto se rechaza como manda el disparador
`validar_voto_unico`.

Lo demás de esta lista toca cuatro arreglos de la noche anterior --la fecha
pasada, el botón de cancelar que no cancelaba, el número de reserva que ponía el
reloj del cliente, y el adjunto de PQRS-- así que es donde más probable es que
aparezca una regresión.

- [x] Reservar una zona común: **no** deja elegir fecha pasada
- [x] Reservar → fila en `reserva_zona` con número asignado por la base
- [x] Apuntar acompañantes → filas en `participante_reserva`
- [x] Cancelar la reserva → **la reserva queda cancelada de verdad**
- [x] Registrar una visita → fila en `visita` + `invitado`
- [~] Abrir PQRS: la fila llega entera (número de la base, enums, autoría, unidad). El **adjunto no es verificable desde aquí**: el selector de archivos abre un diálogo del sistema que bloquea la extensión, igual que las fotos de portería
- [x] Anuncios: ver y votar → fila de voto
- [x] Notificaciones: se ven las propias y se marcan leídas
- [x] Chat con administración y con portería, en hilos separados

## Propietario — `propietario@veciyo.test` (Guillermo, 101 y 205)

- [x] Cambio entre sus dos viviendas — la cabecera pasa de «Torre 1 · 101» a «Torre 2 · 205» y el menú lo sigue. Y aquí «Administrar mis ubicaciones» **sí** corresponde, a diferencia del guardia
- [~] Residentes de la vivienda: la **lectura** coincide con la base (Laura como inquilina líder de la 205, con sus tres permisos, y Guillermo como anfitrión primario aparte). El **alta no se hace desde aquí**: crea una `invitacion`, y esa tabla no tiene política de borrado --con razón, es la constancia de que se invitó--, así que dejaría una fila más en el Supabase del cliente, que ya arrastra 174. Lo cubre el recorrido `invitacion-de-huesped`
- [x] Cuotas: el estado cuadra exacto con la base — septiembre «50% · $360.000 de $720.000 · Al día 2/4 · Deudor 2/4», y la 101, que **no tiene fila**, cuenta como deudora. Registrar el pago no es suyo: lo hace la administración
- [~] `ReservaPropietarioDetail`: confirmado que el título dice «Imágenes del documento» y debajo hay iconos. La ruta está disponible y el guardia sí la pinta. Es decisión de privacidad, no mía: `REVISAR-A-OJO.md` punto 3, ya con los datos concretos

## Anfitriona de renta corta — `vecino@veciyo.test` (Sofía, 102)

- [x] Configurar el alojamiento: guardar y **releer** lo guardado. Los veintitrés campos vuelven iguales, las contraseñas siguen sin releerse --y el campo vacío no las borra: se comprobó que los dos secretos seguían en Vault después de guardar-- y por el camino salieron los hallazgos 14, 15 y 16
- [x] Precheckin: los seis pasos se recorren enteros, y el estado de cada uno cuadra con la fila de `invitado`
- [x] Los botones del precheckin escriben en la base. «Aprobar por excepción» deja `terminos_aceptados`, `terminos_excepcion` y **quién lo aprobó** --Sofía--, y la pantalla lo dice: «(aprobado por anfitrión)». «Aprobar» la verificación nace una fila en `verificacion_antecedentes` con `origen: paquete_base`, cargada contra el `periodo_id` de la suscripción y con `proveedor: "simulado"`, que es lo honesto mientras no haya proveedor contratado
- [~] TRA/SIRE: comprobada **la mitad negativa**, que es la que importa. Los botones de «Reportar TRA» y «Reportar SIRE» no se ofrecen porque Carlos todavía no ha entrado, y el KT manda justo eso: la entrada se reporta cuando la portería confirma el ingreso, la salida cuando hay salida registrada. Para la otra mitad hace falta que el guardia registre la entrada
- [~] El RNT que carga el propietario llega al reporte: bloqueado por lo mismo. El RNT sí se guarda y se relee (123456)
- [x] Invitar a un huésped: la pantalla lee bien --separa «En la vivienda» de «Estancias terminadas», y dice «llega el 02/10/2026» de Nadia--. Aquí salió el hallazgo 17

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

### 17. Cuarenta y seis invitaciones de prueba en la pantalla del anfitrión — **arreglado el origen, quedan las viejas**

«Invitaciones sin aceptar» de Sofía es una pared de cuarenta y seis filas
idénticas: «Alguien · control.positivo@veciyo.test · Residente», encima de lo
que el anfitrión sí tiene que leer. En la base hay **542 invitaciones de
prueba** en total; las 46 `pendiente` son las que se ven.

Es mío. `invitacion` no tiene política de borrado --con razón: es la
constancia de que se invitó a alguien-- así que la limpieza global no puede
barrerlas, y el control positivo de `huesped.test.ts` dejaba una más en cada
corrida. Ahora la revoca al terminar, que es lo que hace el botón «Revocar» de
la pantalla y lo que la política de UPDATE permite. De paso, `apoyo.ts` no
tenía atajo para modificar: había `leer`, `insertar` y `rpc`, y nada para un
PATCH.

Comprobado: tras correr el archivo queda una revocada y ninguna pendiente
nueva. **Las 46 viejas siguen ahí** y no las toco: borrarlas sería borrar
datos, y revocarlas en bloque es una decisión que no me toca tomar sola la
víspera de una demo.


### 16. «Residentes actuales (4)» y debajo ninguna tarjeta — **arreglado**

La pantalla de Configuración de Sofía anunciaba cuatro residentes y no pintaba
ni uno. Dos defectos encima del otro, y por separado ninguno se ve:

1. Las tarjetas salen de `GRUPOS_JERARQUIA`, una lista escrita a mano de
   cuatro roles --inquilino líder, residente, corresidente, coadministrador--
   mientras el número salía de la lista entera. `huesped_temporal` está en el
   enum `rol_unidad`, el repositorio lo traduce a «Huesped Temporal», y no
   caía en ningún grupo: se contaba y no se pintaba. **Un rol sin grupo
   desaparece en silencio**, y los cuatro residentes de la 102 son huéspedes.
2. «Actuales» no miraba la fecha. De los cuatro, Ramiro terminó su estancia el
   7 de agosto y Nadia llega el 2 de octubre. Ninguno de los dos vive ahí hoy.

La regla de vigencia sale del componente a `residentesActuales.ts`, con sus
pruebas --los tres casos son los tres huéspedes reales de la 102-- y `hoy` se
arma en hora local: `toISOString()` daría el día siguiente desde Colombia a
partir de las 19:00, y eso adelanta la entrega de las credenciales de la
puerta. Ahora dice **«Residentes actuales (2)»** con las dos tarjetas de Laura
y Tomás, que es lo que hay en la base.

### 15. «Aprobar huésped por huésped» no guardaba nada — **arreglado**

Tercera opción de «Visitas de huéspedes». La pantalla la llamaba
`aprobar-por-huesped` y el repositorio espera `aprobar-cada-uno`. Rompía las
dos direcciones a la vez:

- **al leer**, la base tenía `aprobar_cada_uno`, el repositorio lo traducía a
  un valor que ninguna de las tres opciones tenía, y **no se marcaba ninguna**;
- **al guardar**, el valor de la pantalla no estaba en el diccionario, se
  mandaba `null`, y la función hace `coalesce(null, lo de antes)`. No cambiaba
  nada y salía «Configuración guardada» en verde.

Comprobado pulsando, y de la única manera que distingue las dos cosas: primero
«Prohibir a todos», que sí está mapeada, y la fila pasó a `prohibir_todos`.
Después «Aprobar huésped por huésped», guardar otra vez, y `updated_at` avanzó
--la escritura ocurrió-- con la columna **igual**. Las otras dos opciones
funcionaban, que es exactamente lo que hacía difícil verlo.

Ningún recorrido lo cazó y no es casualidad: `anfitrion-configura-alojamiento`
hace el viaje de ida y vuelta con `"aprobar-cada-uno"`, el vocabulario del
repositorio, que es consistente consigo mismo. El literal divergente vivía en
el `.tsx`, donde ningún recorrido mira. Ahora el vocabulario está una sola vez
en `visitasDeHuesped.ts`, la pantalla pinta lo que esa lista diga, y hay una
prueba que recorre las tres opciones de ida y vuelta.

### 14. «Habitaciones» se escribía y no se guardaba — **arreglado**

Se escribía un 3, salía «Configuración guardada», y al volver ponía otra vez lo
de antes. El estado existía en el hook, la pantalla lo pintaba, y **no entraba
ni en la lectura ni en la escritura**.

No era un descuido de la pantalla: `config_renta_corta` tenía
`num_habitaciones` y esa tabla se eliminó al consolidar todo en
`suscripcion_renta_corta`, que nació sin la columna. El campo del formulario
sobrevivió a la columna. Mientras tanto `ficha_alojamiento` tapaba el hueco
leyendo `tipologia.habitaciones`, que es lo que el edificio declara del plano:
dos viviendas con la misma tipología no pueden diferir, y una habitación
cerrada al huésped no se puede descontar.

Migración `20260925070000`: vuelve la columna, se rellena con lo que la ficha
mostraba hasta hoy --nadie pierde nada-- y la tipología queda de respaldo.
Comprobado escribiendo 3 en la pantalla y leyendo `num_habitaciones = 3`.


### 9. El número de reserva seguía saliendo del cliente — **arreglado**

Anoche commiteé que «el número de la reserva lo asigna la base». **No era
cierto.** La migración puso la secuencia y el disparador, pero el disparador
solo actúa si el número llega vacío, y dejé el atajo abierto en el repositorio
(`numero: datos.numero ?? undefined`). La pantalla siguió sorteándolo, ahora con
`Math.random()`, así que la secuencia no se usaba nunca por ese camino.

Peor aún: el comentario del repositorio decía «El número lo asigna la base»
justo encima de la línea que lo deshacía. Un comentario que afirma lo contrario
de lo que hace el código es peor que no tener comentario.

Ahora no se manda: `crearReserva` devuelve `{ id, numero }` y la pantalla enseña
el que volvió de la base. Comprobado pulsando: la secuencia estaba en 368784 y
la reserva salió con el **368785**.

### 10. «Comentarios u observaciones» se escribía y se tiraba — **arreglado**

El formulario de reserva pide comentarios, el esquema los valida, la columna
existe y `crearReserva` los acepta. El payload **no los llevaba**. Comprobado
escribiendo uno y viendo `comentarios: null` en la fila; ahora llega.

### 11. Se puede reservar una hora de hoy que ya pasó — **decisión pendiente**

A las 18:45 la pantalla ofrecía «+ Reservar» en la franja de las 06:00 de hoy, y
la reserva se aceptó. El disparador `reserva_no_en_el_pasado` compara solo la
**fecha**, no la hora.

El calendario sí bloquea los días pasados --eso funciona, comprobado: 22 y 23
inhabilitados, del 24 en adelante abiertos--. Lo que queda abierto son las horas
de hoy. El cliente pidió que no se pudieran marcar «fechas pasadas»; de las
horas no se habló, y el KT no lo cubre. En `REVISAR-A-OJO.md`.

### 12. Las pruebas no entraban en el typecheck — **arreglado**

`tsconfig.json` incluía `src/**/*` y nada más, así que los 21 recorridos
--que llaman a las funciones del repositorio-- **no se typecheckeaban**. Cambié
la firma de `crearReserva` y `npm run typecheck` siguió en verde mientras diez
llamadas quedaban rotas; solo habrían fallado al ejecutarse.

Hay ahora un `tsconfig.tests.json` aparte --para no meter los tipos de Node en
el entorno de React Native-- y `npm run typecheck` corre los dos. Al encenderlo
aparecieron **cuatro derivas reales** que llevaban tiempo ahí: un recorrido
pasaba un argumento a `obtenerArquitectura`, que no recibe ninguno, y dos
llamadas a `obtenerReclamos` mandaban `condominioId` y `esAdmin`, que esa
función no tiene.

### 8. Los permisos de chat y llamadas del guardia eran decorativos — **arreglado**

El administrador tiene dos interruptores en su pantalla de Seguridad: «Chat:
permitido / no permitido» y «Llamadas: permitidas / no permitidas». **No los
miraba nadie.**

El botón flotante de comunicaciones se pintaba igual para todos los roles, así
que este guardia —con los dos apagados en la base— tenía chat y llamadas
igualmente. Y la raíz estaba más abajo: la consulta que arma el contexto de
sesión pedía `rol` y `porteria_id` y **no cargaba la columna `permisos`**, de
modo que la aplicación no tenía forma de saberlo aunque quisiera.

No es una regla que me invente: el KT lo dice en la tabla de roles —la portería
tiene «chat/llamadas **si el Administrador se lo habilita**»—.

Son el séptimo y el octavo caso de lo mismo en este proyecto. La regla vive
ahora en `permisosDeComunicacion`, aparte del componente, con una prueba que la
invierte: sin permisos, nada; con `chat: true`, chat y no llamadas.

Comprobado en el navegador de las dos formas, cambiando el dato y volviéndolo a
dejar como estaba: con `{}` el botón desaparece entero; con `{chat: true}`
aparece y ofrece **solo** el chat.

No se toca el botón de «Llamar a …» del detalle de una visita: ese es un `tel:`
al residente, parte del trabajo de anunciar una visita, no la función de
llamadas internas de la app.

### 5. «Informar» una incidencia no hacía nada — **arreglado**

El guardia abre el «⋮» de un paquete, elige «Informar», describe que llegó roto
y pulsa «Agregar». **No pasaba nada**: ni fila, ni aviso, ni error en consola.

Dos cosas estaban mal, una encima de la otra:

1. En modo informe la pantalla registraba una correspondencia **nueva** y le
   pegaba la incidencia, en vez de colgarla del paquete que el guardia tenía
   delante.
2. Y ni siquiera llegaba a eso: el formulario oculta la categoría y el selector
   de unidad en ese modo, mientras el esquema los sigue exigiendo. `handleSubmit`
   validaba contra campos **que no se pintan**, fallaba, y como los errores se
   muestran junto a cada campo --y esos campos no existen-- el botón quedaba
   mudo.

Ahora el informe no pasa por la validación del alta: cuelga la incidencia del
paquete existente. De paso, el aviso decía «¡Correspondencia cargada con exito!»
sobre una tarjeta vacía; ahora dice «Incidencia reportada» y enseña el paquete.

Me equivoqué una vez arreglándolo: puse la salida temprana **dentro** del
manejador, que es justo lo que `handleSubmit` nunca llega a llamar. Lo vi porque
volví a comprobar la fila, no porque la pantalla lo dijera.

El recorrido de correspondencia fija ahora que informar **no crea** un paquete
nuevo.

### 6. La entrega no registra a quién se le dio — **decisión pendiente**

Marcar un paquete como entregado escribe `entregada_en` pero deja `entregada_a`
en `null`. La app solo pregunta el nombre cuando la entrega es **en puerta**; si
el vecino baja a recogerlo a portería, no queda constancia de quién se lo llevó.

La columna existe, el repositorio la acepta, y el comentario de su migración
dice para qué está: *«sin esto, "yo nunca recibí ese paquete" no tiene
respuesta»*. El KT describe el registro del paquete pero **no dice nada** del
momento de la entrega, así que es un hueco y no lo decido yo. Está en
`REVISAR-A-OJO.md`.

### 7. `?informar=[object Object]` en la URL — **menor**

La pantalla de informe recibe el paquete como parámetro de navegación y en web
se serializa como `[object Object]`. Funciona mientras no se recargue; al
recargar, el parámetro es basura. No lo toco junto con lo demás para no mezclar.

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

### 2c. El libro del alojamiento se quedaba vestido de prueba — **arreglado**

Mío, no de la app, y es el que explica por qué el alojamiento de Sofía decía
«[prueba] Red» y «[prueba] Dos habitaciones y una terraza» la víspera de una
demo. `anfitrion-configura-alojamiento` devolvía la fila de
`suscripcion_renta_corta` en el `afterAll` y **no la de `libro_huesped`**: el
wifi, las instrucciones y las notas de la prueba se quedaban escritos encima
de los del anfitrión. La limpieza global no los barre porque borra **filas**
enteras por prefijo, y esa fila tiene que seguir existiendo. Ahora también se
guarda y se devuelve el libro.

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


## Portería: hecho

De los 20 puntos, **14 verificados pulsando y contra la base**, 4 parciales con
el motivo escrito y 2 que resultaron ser decisiones de producto, no defectos.

Cuatro defectos encontrados y arreglados; dos huecos para decidir. Y cuatro
falsas alarmas descartadas por comprobar en vez de fiarme de la primera lectura.

## Vecina residente: hecho

De los 9 puntos, **8 verificados pulsando y contra la base**, 1 parcial (el
adjunto de la PQRS, por el selector de archivos).

Tres defectos arreglados --el número de reserva que seguía saliendo del cliente,
los comentarios que se tiraban, y las pruebas fuera del typecheck-- y un hueco
para decidir (las horas pasadas de hoy).

Verificado sin defecto, además de lo anterior: la votación --que era el arreglo
hecho a ciegas--, el calendario que bloquea días pasados, los participantes de
una reserva, cancelar, las notificaciones (se marcan leídas de una en una y
llega a la base), el chat con **solo** el hilo de su vivienda --la 101 y la 301
tienen los suyos y no los ve--, el mensaje con su autoría, y la visita de
residente naciendo `programada` con fecha futura, que es la otra rama del
arreglo de la tarjeta de confirmación.

Un detalle que resultó ser correcto y no un fallo: el chat decía «Personal de
seguridad de turno: sin turno asignado». Hoy es jueves y el guardia solo tiene
turnos domingo, lunes, miércoles y viernes. La pantalla decía la verdad.

### 13. La restauración de las cuotas dejaba el sello de la carga masiva — **arreglado**

Anoche reparé las cuotas que una prueba había marcado como pagadas, y escribí
que el recorrido se llevaba «la foto entera». Se llevaba la de **todas las
filas**, pero solo de **tres columnas**: `pagado`, `pagado_en` y
`registrado_por`. Dejaba fuera `origen` y `monto`.

Resultado: las viviendas volvían a su estado de pago **con el sello
`carga_masiva` puesto** y un importe que no les tocaba. Se ve en la aplicación,
no en la suite.

Y hay una trampa peor, que es la que explica que sobreviviera: la foto se toma
en el `beforeAll`. Si una corrida anterior dejó una fila mal, **la siguiente
fotografía el daño y lo repone como si fuera lo bueno**. La corrupción se
convierte en la nueva referencia.

Arreglado: la foto es de la fila entera, y además se borran las filas que el
recorrido **creó** --`marcar_pago_cuota` hace `insert ... on conflict`, así que
marcar una vivienda sin fila se la inventa--.

La 301 quedó además incoherente por mi reparación manual de anoche: `pagado` en
false pero con fecha e importe, un estado que el RPC nunca produce. Devuelta a
como el propio RPC la dejaría.

**Queda una pregunta para el cliente**, en `REVISAR-A-OJO.md`: la 205 sigue con
el pago de septiembre marcado por carga masiva. No sé si estaba pagada antes de
que las pruebas la tocaran, y no lo adivino.

## Propietario: hecho

De los 4 puntos, 2 verificados pulsando y contra la base, 2 parciales con el
motivo escrito. Ningún defecto nuevo en la aplicación; el que salió fue de
**mis pruebas** (la restauración de cuotas a medias, hallazgo 13).

Lo que más me gustó comprobar: el Cuadro de Honor cuenta como deudora a la 101,
que **no tiene fila de pago**. Tratar la ausencia como impago en vez de
ignorarla es la decisión correcta y no era obvia.

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

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
- [x] TRA/SIRE: **las dos mitades**. Antes de que Carlos entrara los botones no se ofrecían --que es lo que manda el KT--, y en cuanto la portería registró el ingreso aparecieron «Reportar TRA», «Reportar SIRE» y «Ya hice TRA/SIRE». Pulsados los dos: `reporte_tra` tiene una fila de `entrada` y otra de `salida`, cada una con **quién la reportó**
- [x] El RNT que carga el propietario llega al reporte: las dos filas llevan `rnt: 123456`, que es lo que se escribió en la pantalla de Sofía horas antes. `radicado` va nulo, que es lo honesto mientras no haya integración real con la autoridad
- [x] Invitar a un huésped: la pantalla lee bien --separa «En la vivienda» de «Estancias terminadas», y dice «llega el 02/10/2026» de Nadia--. Aquí salió el hallazgo 17

## Huésped — `nuevo.inquilino@veciyo.test` (Tomás, alojado)

- [x] El libro del alojamiento muestra las credenciales de la puerta. El libro entero, leído por Tomás, con lo que Sofía acababa de escribir: descripción, **3 habitaciones** --el campo que hoy se arregló, visto desde los dos lados--, aforo, mascotas, niños, estacionamientos, el wifi con su clave, el código de la puerta, las instrucciones y las notas. Las claves salen de Vault por `credenciales_alojamiento`, que solo las entrega **desde el día de entrada**; Tomás entró el 22, así que las ve. «Copiar» no es decorativo: pasa a «✓ Copiado» en verde y llama a `Clipboard.setStringAsync`
- [x] Reservar una zona común: **el 403 ya no está**. Reserva N° 368801 de la lavandería, 06:00-07:00, con su número salido de la base. Y por el camino salieron los hallazgos 18 y 19
- [x] Apuntar a quien va con él: Marina y Julián quedan en `participante_reserva` con nombre y tipo `huesped_temporal`
- [x] Cancelar lo suyo: el aviso dice que la franja vuelve a quedar libre, y así es --el contador pasó de 2 a 3--. La fila **no se borra**: queda `cancelada`, que es lo correcto. El botón, en cambio, dice «Eliminar»; está en `REVISAR-A-OJO.md`
- [~] No ve lo que no es suyo: comprobado lo visible --su menú no tiene Correspondencia, ni Cuadro de Honor, ni la configuración de la vivienda; la cabecera dice ALOJAMIENTO y no VIVIENDA; y al entrar en Zonas Comunes sale un aviso propio del huésped, con el Salón de eventos atenuado--. Lo de fondo lo cubren las 484 pruebas de RLS

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

### 31. Una sección de filtros entera que no filtraba nada — **arreglada**

Lo vio el cliente: «*ese filtro de Todos, Reservado, Aprobado, Pendiente no
hace nada, no? deberías quitarlo, y el buscar por departamento igual*».

Tenía razón, y de largo: **la sección entera era decorativa**. Un plegable
titulado «Lista de reservas · Buscar y filtrar» con un buscador por
departamento y seis chips de estado. Los dos alimentaban `filtered`, que el
hook calculaba, la pantalla recibía **y nadie pintaba**. La lista de reservas
que anunciaba el título no existe.

Es el control decorativo más grande que ha salido: no un botón ni una casilla,
una sección con su cabecera. Y estaba bien escondida, porque lo que sí
funcionaba --elegir el día-- vivía dentro del mismo plegable, así que la
sección «servía para algo» y nadie miraba el resto.

Fuera el plegable, el buscador y los chips. Y fuera también lo que los
alimentaba: `filtered`, `zoneReservations`, `relevantDays`, `search`,
`activeTab` y `filtersOpen`, que eran cálculo y estado sin destino.

La tira de días queda **directa**, sin desplegar, que es lo que pidió el
cliente y lo correcto: era el único control útil, escondido detrás de cinco
inútiles. El rango Desde–Hasta sigue para portería y administración, que es
lo único de esa sección que cambiaba algo para ellos.

### 32. «Visitas» en el menú del huésped: el alcance, comprobado

Lo preguntó el cliente: «*¿es normal que haya esa sección de Visitas si soy
huésped temporal? revisa el alcance*». La respuesta es **sí, y el alcance es
correcto** --pero no lo guardaba ninguna prueba, que es lo que se arregló--.

La sección está a propósito. `visita_alta` tiene una cláusula escrita para él:
un huésped con reserva puede dar de alta **sus** visitas, y solo firmadas por
él. Y `visita_lectura` le deja ver únicamente aquellas donde
`registrada_por = auth.uid()`.

Lo que **no** ve es lo importante: las visitas de la vivienda.
`es_miembro_unidad` excluye al `huesped_temporal` explícitamente, con su
comentario. La 102 tiene una visita --Carlos Rojas, la de esta noche-- y
Tomás no la ve.

Eso no estaba comprobado. Ahora hay un caso, con control positivo --Sofía sí
la ve, porque si no la prueba pasaría igual el día que la 102 no tuviera
visitas-- y con mutación: quitando `and mu.rol <> 'huesped_temporal'` de
`es_miembro_unidad`, el caso se pone rojo y arrastra otros tres. La línea
está viva.

**Lo que sí está mal es otra cosa**, y es la de antes: que la sección exista
o no debería depender de `visitas_de_huespedes`, la regla que configura la
anfitriona --«permitir a todos», «prohibir a todos», «aprobar huésped por
huésped»-- y que **no lee nadie**. Sofía eligió «aprobar huésped por huésped»
y Tomás puede registrar visitas sin que nadie apruebe nada. Está en
`REVISAR-A-OJO.md` punto 25.

### 33. El mismo importe significaba dos cosas en los dos extremos — **arreglado**

Lo preguntó el cliente: «*sale ahí el costo por persona y garantía... no me
queda claro eso para el huésped temporal*». Y no estaba claro porque **decía
algo distinto de lo que se escribió**.

La administración rellena tres campos: «Monto de garantía», «Costo de
limpieza» y «Costo de reserva». El huésped leía «Costo: 30.000 COP **por
persona**». El esquema no dice nada de personas --la columna se llama
`costo_reserva`-- así que el «por persona» se lo inventó la pantalla.

Marcela pone 30.000 pensando en lo que cuesta reservar la piscina; Tomás
entiende 30.000 por cabeza. **Con cuatro personas, la diferencia es cuatro
veces el precio.** Es el tipo de desajuste que no se descubre hasta que
alguien reclama.

Y «Costo de limpieza» se configuraba y **no se enseñaba a quien reserva**,
que es precisamente quien lo paga.

Ahora los tres importes se llaman igual en los dos extremos.

Lo que **no** se arregla aquí y queda en `REVISAR-A-OJO.md` punto 27: nadie
cobra nada. Los tres números se leen para pintarlos y no hay tabla de cobros,
ni deuda, ni registro de quién debe qué. Para un residente al menos existe la
cuota de mantenimiento donde podría cargarse; **un huésped temporal no tiene
dónde**, que es justo lo que decía el interruptor muerto que se quitó en el
hallazgo 28.

### 32b. «Solo yo» no era una opción — **arreglado**

Lo dijo el cliente: «*no se puede poner 0 o ninguna en Cantidad de personas...
o solo yo, o algo*». El desplegable iba de «1 persona» en adelante y ir solo
era **dejarlo en blanco**. Tan poco evidente que la etiqueta acabó
explicándolo entre paréntesis, que es la señal de que faltaba una opción y no
una aclaración.

Ahora la lista empieza por «Solo yo», **es el valor de salida** --lo pidió el
cliente en la vuelta siguiente: es la respuesta de casi todas las reservas--
y la etiqueta vuelve a ser una pregunta: «¿Cuántas personas van contigo?».

Y el tope ya no es solo el de la zona. Lo pidió el cliente: «*la cantidad de
personas no debería ser más bien acorde a la cantidad de huéspedes?*». La
piscina admite veinte y la 102 se alquila para cinco, así que a Tomás se le
ofrecen **cuatro** acompañantes, no diecinueve. Manda el más pequeño de los
dos topes, y a un residente no le aplica el de la vivienda.

De paso salió un fuera de rango: la lista llegaba hasta la capacidad de la
zona contando **acompañantes**, así que en la piscina ofrecía veinte
acompañantes que, con el titular, son veintiuno en una zona de veinte. Ahora
llega a diecinueve.

Y la cuenta dejó de funcionar por accidente: era
`Number(opcion.split(" ")[0]) || 0`, que con «Solo yo» daba `NaN || 0` = 0 de
carambola. Funcionaba, y lo que funciona por accidente es lo que se rompe al
tocar una etiqueta.

### 34. Dos controles muertos en la pantalla de Visitas del huésped — **arreglados**

Lo pidió el cliente: «*analiza toda la pantalla mejor*». Salieron dos, y los
dos por lo mismo: agrupar al huésped con la portería y la administración, que
es un atajo que funciona hasta que deja de funcionar.

**Una barra de una sola pestaña.** `tipoTabs` devuelve un único elemento para
el huésped --bien: sin reservas de huésped, «Todos» y «Visitas» enseñarían lo
mismo-- y la pantalla la pintaba igual. Se leía «Visitas», se pulsaba
«Visitas», y seguía en «Visitas».

**Filtros de Torre y Departamento.** `puedeFiltrarTorrePiso` era
`esGuardia || esAdmin || esHuesped`. Un huésped tiene **un** departamento: los
dos desplegables solo podían devolver lo que ya estaba viendo, o nada.

La decisión sale a `permisosDeVisitas`, una función pura con sus casos, que es
como está probado el resto de este proyecto: probarla con `renderHook` habría
comprobado la memorización de React, no la regla.

**Y lo que sí funciona, comprobado**: los chips de estado
--Todas/Programada/Ingresado/Finalizado-- filtran de verdad; `filteredItems`
se pinta y de ahí sale el «Mostrando N de M». Las etiquetas coinciden exactas
con las del repositorio. El buscador y el rango de fechas también. No es el
caso de los filtros de zonas comunes (hallazgo 31), que no filtraban nada.

Queda en pie la pregunta de fondo, que es del punto 25 de `REVISAR-A-OJO.md`:
que el huésped pueda registrar visitas **debería depender** de
`visitas_de_huespedes`, la regla que configura la anfitriona y que no lee
nadie.

### 35. «Mis reservas» tiraba la pantalla al cambiar de rol — **arreglado**

Lo encontró la segunda tanda de pruebas de componente, y no lo había visto
nadie: ni yo pulsando, ni el cliente, ni las otras dos capas de pruebas.

`MisReservas` tenía esto:

```tsx
const { reservas } = useZonas();
if (rol === "guardia" || rol === "administrador") return null;
const propias = useMemo(...);
```

El `return` va **antes** del `useMemo`, o sea que el componente llama a menos
hooks en unos roles que en otros. Mientras la pantalla se desmonte al cambiar
de rol no pasa nada. En cuanto se cambia sin desmontarla, React tira
**«Rendered fewer hooks than expected»** y se cae la pantalla entera.

Y se cambia: **Marcela pasa de administradora a propietaria de la 301 desde
el selector de la cabecera**, que es uno de los puntos de esta misma lista.
La prueba reproduce justo eso --montar como propietaria, cambiar a
administradora, volver a pintar-- y falla con ese error exacto antes del
arreglo. El `return` baja debajo de todos los hooks.

Repasados los demás componentes con retorno temprano --`CommsFab`,
`DemoRoleScreen` y los modales de visitas--: en todos los hooks van antes.
Este era el único. Pero es un fallo que **una regla caza mejor que unos ojos**,
y el proyecto no tiene linter; queda propuesto.

### 36. Tres controles sin nombre para un lector de pantalla — **arreglados**

Los tres los encontraron las pruebas de componente, y ninguno se ve mirando
la pantalla: se ven **preguntándole al árbol** cómo se llama cada cosa.

**La tira de días** usaba `accessibilityRole="button"` con
`accessibilityState={{ selected }}`, y `aria-selected` **no es válido en un
botón**: solo en `option`, `tab`, `row` y similares. O sea que no se anunciaba
nunca qué día estaba elegido. Pasa a ser un `radio` dentro de un
`radiogroup`, que es lo que es: uno entre varios.

**Y ni siquiera emitía el estado.** Ya con el rol correcto, el DOM salía con
`role="radio"` y sin `aria-checked`: `accessibilityState={{ checked }}` no
llega a escribir el atributo. Se usa `aria-checked`, que entienden igual
React Native 0.86 y react-native-web.

**El botón que despliega los filtros de Visitas** solo contiene un icono y no
tenía etiqueta: un lector de pantalla lee «botón» y ya. Ahora dice «Mostrar
filtros» / «Ocultar filtros» y lleva `aria-expanded`, que es la otra mitad de
la información.

Ese último salió de rebote: el caso de la portería fallaba porque **el panel
empieza plegado**, así que la prueba del huésped --«no le ofrece filtrar por
torre»-- estaba pasando sin comprobar nada. Para abrirlo hacía falta poder
nombrar el botón, y no se podía.

## Hallazgos

### 30. El puesto se guardaba y no se veía en ninguna pantalla — **arreglado**

Lo preguntó el cliente: «*¿y dónde veo el número de lavadora después de
reservar?*». En ninguna parte. Eligiendo la N°2, la fila quedaba con su
`numero_recurso = 2`, y después no había forma de saber a qué lavadora ir.

Es mío y de la misma tanda: añadí la columna, el disparador, el desplegable y
la prueba, y **no miré la vuelta**. `SELECT_RESERVA` no traía la columna, así
que ni la tarjeta de la franja, ni «Mis reservas», ni el modal de «se reservó
con éxito» podían enseñarla aunque hubieran querido.

Y lo arreglé **a medias**: lo puse en la tarjeta de la franja y en el modal de
éxito, y no en «Mis reservas», que es donde uno va a mirarlo. Lo volvió a
cazar el cliente al primer vistazo. Era además donde más falta hacía: la 102
tiene tres reservas de lavandería el mismo día a la misma hora, y sin el
número son tres renglones idénticos.

Los sitios donde se pinta una reserva son cuatro, y conviene tenerlos juntos:
`FranjaHoraria` (la tarjeta de la franja), `MisReservas`, el modal de éxito de
`ZonaReservarScreen`, y `ReservaZonaCard` --que **no la usa nadie**; está en
`REVISAR-A-OJO.md` punto 24--.

Ahora:

- la tarjeta de la franja dice «06:00 - 07:00 · N°2»;
- «Mis reservas» igual;
- el modal de éxito dice «Lavanderia N°2», y **el que tocó, no el que se
  pidió**: si la reserva llega sin número lo asigna la base, así que
  `crearReserva` pide de vuelta `numero_recurso` en lugar de repetir lo que
  mandó.

Sobre el método, que es lo que falló: comprobé la **escritura** --leí la fila
y decía 2-- y di el punto por cerrado. No comprobé la **lectura**. Verificar
contra la base dice que el dato llegó; no dice que alguien pueda verlo. Son
dos preguntas y solo me hice una.


### 29. Se podía reservar sin elegir lavadora, y no se notaba — **arreglado**

Lo encontró el cliente: marcó el reglamento, pulsó «Aceptar» **sin elegir N°
de lavandería**, y la reserva se creó. En la base quedó `368887` con
`numero_recurso = 3`.

Dos fallos, y el segundo es mío de hace una hora:

**El esquema no lo pedía.** `numero: z.string().optional()`, siempre, para
cualquier zona. Y el botón se apagaba con `!hora || !acceptTerms`: el número
no entraba en esa cuenta tampoco. Así que la validación lo dejaba pasar por
los dos lados.

**Y yo hice el fallo invisible.** El disparador que añadí en
`20260925110000` asigna el primer puesto libre a quien llega sin número. Esa
defensa está bien --es lo correcto para quien escribe por la API-- pero
convirtió un hueco de validación en un **éxito silencioso**: la reserva salía
bien, con su lavadora, y nadie se enteraba de que la elección se había
tirado. Una defensa en la base no exime a la pantalla de validar; la tapa.

Arreglado en los dos sitios:

- el esquema pide el número **cuando la zona tiene más de un puesto**
  --`construirReservaZonaSchema(pideNumero)`--, porque en la piscina no hay
  nada que elegir;
- y el botón ya no se apaga en silencio: debajo dice **qué falta**. «Falta
  elegir el número y aceptar el reglamento». Un botón apagado sin motivo no
  se distingue de uno roto, que es medio proyecto.

De paso, `duracion` sale también del esquema: el desplegable ya se había
quitado y su valor no se usaba al guardar.

**Y lo que no faltaba**: la cantidad de personas es opcional de verdad --la
lista empieza en «1 persona» y no tiene un cero, así que dejarlo en blanco
**es** ir solo--. Lo que fallaba ahí era la etiqueta, que con su «Seleccione...»
parecía una pregunta pendiente. Ahora lo dice, igual que «Comentarios u
observaciones (opcional)».


### 28. Tres campos del formulario de reserva que no sostenían lo que prometían — **arreglados**

Los tres los vio el cliente mirando la pantalla como huésped temporal.

**«Departamento», un campo de texto libre.** Ya estaba decidido antes de abrir
el formulario: a un vecino se le toma el de su ubicación activa --la del
selector de la cabecera-- y a la portería se le pregunta en un modal antes de
navegar. Este campo era una **tercera** forma de cambiarlo, y para un huésped
no tenía ningún sentido: escribir el número del vecino de al lado no le
reserva nada, le devuelve un error de permisos de la base. Ahora se enseña,
como el día y la hora. Quien tiene dos viviendas cambia en la cabecera, igual
que en el resto de la app.

**«El costo se carga automáticamente a su cuota de mantenimiento».** Un
interruptor que **no se leía en ningún sitio**: ni en el guardado ni en
ninguna cuenta. Y encima le salía al huésped temporal, que no paga cuota de
mantenimiento. Fuera, también del esquema. Cobrar una reserva en la cuota no
es algo que la app sepa hacer; si se quiere, es trabajo nuevo y no un
booleano.

**«Acepta términos y condiciones», sin forma de leerlos.** Se exigía aceptar
algo que no se podía abrir --el botón «Aceptar» está deshabilitado hasta que
se marca--. Los términos existen: son el reglamento de la zona, que la
administración publica y que hasta ahora solo se alcanzaba desde la pantalla
anterior. Ahora el interruptor dice «Acepto el reglamento de la zona» y
debajo hay un enlace que lo abre. Si la administración no ha publicado
ninguno, lo dice en vez de enseñar un recuadro vacío.

Queda una decisión en `REVISAR-A-OJO.md`: **no se guarda que se aceptó**. Para
una zona con reglamento y fianza, eso es justo lo que haría falta si alguien
lo discute.


### 27. La grilla pintaba las reservas canceladas — **arreglado**

Lo cazó el cliente sumando: «*dice quedan 2 de 4, y aparecen 3 ya reservadas,
y me deja elegir la 3 y la 4, o sea serían 5 no?*». La suma era correcta. Lo
que fallaba no era el 4: era que **una de las tres tarjetas estaba cancelada**
--la que él mismo había cancelado probando--.

Otra vez el mismo desajuste, y en la misma pantalla que los hallazgos 19 y 26:
la base y la pantalla no usaban el mismo criterio de «ocupa». `ocupacion_zona()`
y los dos disparadores de la tabla descartan `rechazada` y `cancelada`; la
grilla no descartaba nada y pintaba todas las reservas de la franja al lado de
un contador que sí las descartaba.

El criterio pasa a estar escrito una vez --`ocupaLaFranja`-- y la prueba
recorre **el enum entero** de `estado_reserva` comprobando que la etiqueta de
la app hace lo mismo que hace la base con su estado. Si mañana alguien añade
un estado o cambia una etiqueta, cae ahí en vez de separarse en pantalla.

Un estado desconocido ocupa, por prudencia: esconder una reserva que no se
sabe qué es dejaría el hueco pareciendo libre, y la base rechazaría el
guardado.


### 26. El contador decía dos y el desplegable ofrecía tres — **arreglado**

Lo encontró el cliente: en la franja de las 06:00 la grilla decía «quedan
**2** de 4» y, al entrar, el desplegable ofrecía **tres** lavadoras.

Las dos cuentas eran correctas y medían cosas distintas:

- el **contador** cuenta reservas solapadas: había dos vivas, luego dos huecos;
- el **desplegable** cuenta números ocupados: de esas dos, solo una tenía
  número, así que sobraban tres.

La culpable era una reserva **sin número**, creada minutos antes de que la
columna existiera. Y lo peor no es que existiera: es que yo lo había escrito
como si fuera correcto --«una reserva vieja sin número no bloquea ninguna
lavadora»-- **con su prueba y todo**. Una decisión mala documentada como
decisión buena es más difícil de encontrar que un descuido.

No se tapa en la pantalla, porque la pantalla no puede: no hay forma de saber
qué lavadora ocupa una fila que no lo dice. Se quita el caso. Migración
`20260925110000`:

- `primer_puesto_libre()`, el número más bajo sin reserva viva solapada;
- se rellenan las que ya estaban sin número, de una en una y en orden, porque
  cada asignación cambia lo que queda libre para la siguiente;
- y el disparador, en vez de exigir el número, **lo asigna** cuando falta. Es
  lo que haría quien atiende la lavandería, y no rompe a nadie que escriba por
  la API sin saber de esto.

Y la invariante que faltaba, ahora en una prueba: **con todas las reservas
numeradas, el contador y la lista dan lo mismo**. Sin eso, las dos cuentas
pueden separarse otra vez sin que nadie se entere.

De paso cayó una prueba que hizo justo su trabajo: `reservas.test.ts`
comprueba la lista **entera** de columnas que expone `ocupacion_zona`, que es
`security definer` y devuelve reservas ajenas. Añadir `numero_recurso` la puso
roja. Se revisó y se deja: dice qué lavadora está cogida, no de quién es.


### 25. «Duración» no se usaba al guardar — **arreglado**

Salió al quitar el desplegable de la hora del formulario de reserva: justo
debajo había otro, «Duración (máx 1 hora)», y **su valor no entra en el
guardado**. La hora de fin se saca partiendo el texto de la franja:

```ts
const [horaInicio, horaFin] = String(data.hora).split(/\s*-\s*/);
```

Así que elegir «2 horas» en una zona que las admite no cambiaba nada: la
reserva duraba lo que dijera la franja. Un desplegable obligatorio --el
esquema pide `duracion`-- que se escribía y se tiraba. Es el mismo defecto
que «Habitaciones» y que «Comentarios u observaciones», el tercero de la
misma forma en esta pantalla.

Se quita. **Reservar menos que la franja no es algo que la app sepa hacer
hoy**, y ofrecerlo sin hacerlo es peor que no ofrecerlo; si se quiere, es
trabajo nuevo --horas de inicio y fin de verdad-- y no un desplegable.

### 24b. La grilla desaparecía al elegir un día que no fuera hoy ni mañana — **arreglado**

Mío, de la vuelta anterior. El estado vacío se decidía con
`!dayFilter && !fechaDesde && !fechaHasta`, y **`selectedDate` no entraba en
la cuenta**. Con la tira, cualquier día que no sea hoy ni mañana deja
`dayFilter` en nulo y la fecha en `selectedDate`: la grilla desaparecía y la
pantalla pedía elegir un día **que acababa de elegirse**.

Lo encontró el cliente al primer intento. El mensaje además seguía hablando
de «Hoy, Mañana o un rango», que ya no es lo que hay: ahora dice «Elige un día
en la tira de arriba».


### 24. Tres controles para elegir un día, y el formulario preguntándolo otra vez — **rediseñado**

Lo preguntó el cliente: «*ahí sale para filtrar Hoy y Mañana y abajo un
selector de fecha desde y hasta... si cuando voy a reservar igual me pregunta
la fecha, no tiene sentido*».

Tenía razón, y la pantalla estaba haciendo **dos trabajos con los mismos
controles**: consultar --«¿qué reservas hay?», donde un rango tiene sentido--
y reservar --«quiero un hueco», donde no puede tenerlo, porque no se reserva
«del 25 al 30»--.

La prueba de que la mezcla no cuadraba está en una línea:

```ts
abrirReserva(hour, formatZonaDateParam(fechaDesde || selectedDate || new Date()))
```

Con un rango del 1 al 5 de octubre, pulsar un hueco reservaba **el día 1**, en
silencio. Nadie lo había elegido: era el primer día del rango.

Y el formulario preguntaba la fecha otra vez porque tenía **dos puertas**: la
grilla y un «+» que lo abría en blanco. Esa segunda puerta era además la peor,
porque el desplegable de horas no mira la ocupación: desde el «+» se podía
elegir una franja llena y no enterarse hasta que la base rechazaba el guardado.

Decisiones del cliente (25/09/2026), las cuatro aplicadas:

1. **Fuera el «+».** Se reserva desde la grilla, que es donde se ve lo libre.
2. **Una tira de días de un solo renglón** en lugar de «Hoy» y «Mañana», de
   hoy en adelante. El pasado no se ofrece: la base lo rechaza con un
   disparador, y ofrecer lo que va a fallar es peor que no ofrecerlo.
3. **El formulario enseña el día y la hora, no los pregunta**: «Hoy, viernes
   25 de septiembre · 07:30 - 08:30» en un recuadro, en lugar del calendario
   de mes entero --que a ancho de teléfono tapaba la hora, y por eso parecía
   que no se había elegido nada-- y de los dos desplegables.

   La primera vuelta solo quitó el calendario y dejó el desplegable de la
   hora. Lo cazó el cliente en cuanto lo probó: «*dijimos que ya no*». Tenía
   razón; lo había estrechado yo sin decirlo.

   Y al quitarlo salió el hallazgo 25.
4. **El rango Desde–Hasta solo para portería y administración**, que son
   quienes ven las reservas de todo el edificio. Un vecino solo ve las suyas y
   no tiene nada que buscar.

La tira **no sustituye** al filtro que había debajo: lo alimenta. De
`dayFilter` sale también la lista de nombres de día con la que se filtran las
reservas del histórico, así que hoy y mañana siguen siendo «hoy» y «manana».
Cambia el control; lo de debajo sigue igual.

Queda escrito para después el formato del rango en las pantallas de gestión
(`REVISAR-A-OJO.md` punto 22).


### 23. La mitad de las filas de la grilla perdían su hora — **arreglado**

Lo encontró el cliente: pulsó **07:30** en la grilla de la lavandería, el
formulario se abrió **pidiéndole la hora otra vez**, y preguntó por qué.

Dos listas de horas que se habían separado sin que nadie lo notara:

- la **grilla** de la pantalla de la zona sale de `mediasHoras`, que va **cada
  media hora**: 06:00, 06:30, 07:00, 07:30…
- el **desplegable** del formulario sale de `franjas`, que iba **cada
  duración** --una hora en la lavandería--: «06:00 - 07:00», «07:00 - 08:00»…

El formulario busca una opción que empiece por la hora que llega
(`opcionesHora.find(o => o.startsWith(initialHour))`) y, si no la encuentra,
se cae a `""`. Con cualquier fila de `:30` no la encuentra nunca. **La mitad
de las filas de la grilla no se podían llevar su hora**, y quien pulsaba tenía
que elegirla de nuevo sin entender por qué.

Ninguna de las dos funciones estaba mal por separado, y las dos tenían
pruebas. Lo que faltaba era una prueba de que **dicen lo mismo**, que es
exactamente la forma del defecto de las visitas de huéspedes: dos vocabularios
para una sola cosa, consistentes consigo mismos.

`franjas` acepta ahora cada cuánto empieza una franja --30 minutos, que es lo
que ofrece la grilla-- y hay una prueba que recorre la grilla entera
comprobando que cada hora existe en el desplegable. La única que puede faltar
es la última, porque a las 21:30 no cabe una reserva de una hora antes de
cerrar; eso está en `REVISAR-A-OJO.md` punto 21.

**Y no era el conjunto de las cosas que se ven.** La hora y la fecha **sí**
viajaban: el día llegaba marcado en rojo en el calendario y, cuando la hora
existía, llegaba puesta. Lo que pasa es que a ancho de teléfono el calendario
ocupa toda la pantalla y hay que subir para verlo.


### 22. Una casilla que no se puede desmarcar y no dice por qué — **arreglado**

Lo encontró el cliente probando: «Anfitrión primario» y «Administrador
primario» no se desmarcan. Pulsas y **no pasa absolutamente nada**: ni cambia,
ni avisa.

Que no se desmarquen está bien. La vivienda **tiene que tener** un anfitrión
primario --el libro del huésped dice «contacta al anfitrión primario del
departamento»-- y el índice único de la base no admite dos. No se quita: se le
pasa a otra persona. `designar_primario` solo designa, y apaga al anterior en
la misma operación.

Lo que estaba mal era el silencio. El manejador era
`onChange={() => setAnfitrionPrimario(yo.id)}`: pulsando una casilla ya
marcada volvía a designar a la misma persona. Cero cambios, cero mensaje, y
**indistinguible de un botón roto** --que en este proyecto es justo lo que hay
que descartar ocho veces antes de creérselo--. Las tarjetas de los demás
residentes callaban igual, por la otra rama.

Ahora avisa: «La vivienda necesita un anfitrión primario. Para cambiarlo,
marca a otra persona de la lista.» Sigue pendiente de decidir si la forma
correcta es un radio en vez de una casilla; está en `REVISAR-A-OJO.md`.

### 2d. Un huésped de prueba vivía en la 102 — **arreglado**

«Residentes actuales» decía **(3)**: Laura, Tomás y un «Invitado de prueba»
con estancia de hoy a dentro de cinco días. El número estaba bien --los tres
vigentes-- y por eso costaba verlo: la fila sobraba, no el conteo.

Mío. `huesped.test.ts` borra esa membresía en el `beforeAll` para poder
correrse dos veces, y **no la borraba al terminar**, así que la última corrida
siempre dejaba a alguien alojado. La limpieza global no lo barre porque el
nombre no lleva el prefijo `[prueba]`, y ponérselo habría sido taparlo: lo que
sobra es la fila, no su nombre. Ahora limpia también en el `afterAll`.


### 21. El inicio de la portería no se entera de lo que acaba de registrar — **arreglado**

El guardia registra la llegada, vuelve a Inicio y sigue leyendo «Programado»,
con las horas vacías y «0 de 1 disponibles». En la base estaba todo bien. Un
guardia que ve eso vuelve a registrar.

Es el hallazgo 19 otra vez, en otra pantalla: la mutación invalidaba
`["visitas"]` y nada más. Una visita mueve tres cosas y dos no viven ahí:

- `["home", ...]`, de donde salen «Ingresos y salidas» y el tráfico del día;
- `["condominio", "arquitectura", ...]`, de donde sale el contador de
  estacionamientos de visita. Y este era el más fácil de pasar por alto,
  porque **la app no escribe esa fila**: el cupo lo suelta un disparador al
  terminar la visita, así que no había ninguna mutación que invalidar.

De paso salió una función huérfana: `obtenerEstacionamientosVisita` en
`home.repo.ts`, escrita y nunca llamada. El contador ya sale de
`obtenerArquitectura`. Dos caminos para el mismo número, uno muerto; se queda
el que se usa.

Comprobado sin recargar: deshacer la salida y volver a Inicio muestra
«Ingresó» con su hora. Y comprobado también lo que **no** se arregla solo, que
está en `REVISAR-A-OJO.md` punto 19: al deshacer la salida el cupo del
estacionamiento se queda suelto.


### 20. El puesto que se elegía no se guardaba — **arreglado**

«Seleccione N° de Lavanderia» era obligatorio --sin él no se puede reservar--
y su valor no llegaba a ninguna parte: `reserva_zona` no tenía columna y la
consulta no lo mandaba. Se comprueba solo: reservé la N°1 a las 06:00 y al
volver a esa franja la N°1 seguía ofreciéndose. Dos huéspedes podían
presentarse los dos a la misma lavadora.

Lo que la app sí llevaba eran cupos: `cupos_simultaneos` dice cuántas caben a
la vez y un disparador lo impone. Eso impide que entren cinco, no que dos
coincidan en la N°1.

El cliente decidió el 25/09/2026 asignar por número. Migración
`20260925090000`: la columna, un disparador que rechaza dos reservas vivas con
el mismo puesto y horas solapadas, y `ocupacion_zona()` devolviendo qué números
están cogidos. Esto último hacía falta: el desplegable **no puede deducirlo**,
porque `reserva_zona_lectura` solo entrega a cada quien sus propias reservas.

Ofrecer solo los libres es comodidad; el límite es el disparador, porque a la
API se le puede llamar sin pasar por la pantalla. Comprobadas las dos cosas:
reservada la N°2, el desplegable pasó a ofrecer N°1, N°3 y N°4; y un `insert`
directo con la N°2 solapada lo rechaza la base.

Un detalle del mensaje de error, que también era una afirmación falsa: decía
«El N°2 ya esta reservado de 06:30 a 07:30» citando las horas **que se pedían**
en vez de las de la reserva que estorbaba, y mandaba a mirar la franja
equivocada. Ahora cita las de verdad.


### 19. Reservas una zona y el contador no se mueve — **arreglado**

Se reserva la lavandería, aparece la tarjeta de la reserva, y justo al lado
sigue diciendo «+ Reservar · quedan **4 de 4**». Recargando la página pasa a
«quedan 3 de 4», que es lo correcto.

Son tres consultas y solo se invalidaban dos. La tarjeta sale de
`RESERVAS_QUERY_KEY`; el contador, de `ocupacion_zona()`, que tiene su propia
clave y nadie la refrescaba. Así que los dos números de la misma franja se
contradecían en pantalla hasta recargar.

Casi lo doy por bueno: vi «4 de 4» y pensé que el contador estaba mal
calculado. Recargar antes de escribir nada es lo que separó «el número está
mal» de «el número está viejo», que se arreglan en sitios distintos.
Comprobado con una segunda reserva: ahora pasa a «quedan 2 de 4» sin recargar.

### 18. Dos acompañantes se asentaban como uno — **arreglado**

Tomás reserva la lavandería con Marina y Julián: `participante_reserva` guarda
las dos filas y la columna `acompanantes` dice **1**. La lista y el número no
decían lo mismo, y el número es el que lee la portería.

El cálculo era `asistentes.filter(...).length - 1`, como si el primer nombre
fuera el del titular. La pantalla pregunta «Cantidad de personas que asistirán
**junto al titular**» y pinta esa cantidad de campos: son todos acompañantes,
el titular no está en la lista. El `-1` venía de cuando sí lo estaba.

No lo cazaba ningún recorrido porque todos pasan `acompanantes` y
`participantes` ya calculados, por separado: el `-1` vivía en el formulario.
Ahora sale de `cuentaDeAcompanantes`, con pruebas, y comprobado en la fila
--368802: `acompanantes` 2, participantes 2--.


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

## Anfitriona de renta corta: hecho

Los 6 puntos verificados pulsando y contra la base. Cuatro defectos
encontrados y arreglados --«Habitaciones» que no guardaba, el tercer radio de
las visitas de huéspedes, el conteo fantasma de residentes y, el mío, el libro
que se quedaba vestido de prueba-- y uno más de la pantalla de invitar, las 46
invitaciones de control que se habían ido acumulando.

Lo que mejor salió es lo que no se ve: «Aprobar por excepción» y «Aprobar» la
verificación **dejan constancia de quién lo hizo**, y la verificación se carga
contra el período de la suscripción con `proveedor: "simulado"` --no finge que
hay proveedor contratado--.

## Huésped: hecho

Los 5 puntos. El 403 de la lavandería que reportó el cliente ya no está, y el
libro del alojamiento llega entero: lo que Sofía escribió por la noche lo leyó
Tomás veinte minutos después, credenciales de la puerta incluidas --que la base
solo entrega desde el día de entrada--.

Dos defectos más, los dos al reservar: dos acompañantes que se asentaban como
uno, y el contador de cupos que no se movía. Y dos decisiones que fueron del
cliente: el botón que decía «Eliminar» sin eliminar, y el N° de lavandería, que
ahora se asigna de verdad.

## La cadena entera, de punta a punta

Es lo que faltaba por ver junta, y se vio en una noche:

**Sofía** configura el alojamiento y carga el libro → **aprueba** los términos
y la verificación de Carlos → **la portería** registra su ingreso y su salida,
y el cupo del estacionamiento se suelta solo → **Sofía** reporta el TRA y el
SIRE, con el RNT que ella misma cargó → y **Tomás**, en paralelo, lee el libro
y reserva la lavadora N°2.

Cada eslabón comprobado pulsando y mirando la fila.

## Lecciones del navegador

- **Comprobar que se escribe no es comprobar que se ve.** Es el error que más
  repetí: leer la fila, confirmar que el dato llegó, y dar el punto por
  cerrado. El puesto de la lavadora se guardaba bien y no se veía en ninguna
  pantalla (hallazgo 30). Cada dato que se escribe tiene una segunda pregunta:
  **quién lo lee y dónde**.

- **Un dato guardado que nadie lee es tan decorativo como un botón que no
  hace nada, y se ve menos.** Los permisos de chat del guardia y
  `visitas_de_huespedes` son el mismo caso: la pantalla de configuración
  escribe, sale «guardado» en verde, y del otro lado no hay nadie
  obedeciendo. Un botón muerto se nota al pulsarlo; una regla muerta solo se
  nota cuando alguien la incumple.

- **Una defensa en la base puede tapar un fallo de la pantalla.** El
  disparador que asigna el primer puesto libre es correcto para quien escribe
  por la API, y convirtió un hueco de validación del formulario en un éxito
  silencioso (hallazgo 29). Lo que protege también esconde.

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

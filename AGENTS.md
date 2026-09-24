# VeciYo — Reglas de ingeniería

Proyecto de producción. Estas reglas reemplazan a `GUIDELINES.md`, que fue escrito
para el prototipo web y partía del supuesto contrario: no tocar nada. Aquí sí
cambiamos las cosas que están mal, de forma deliberada y verificada.

## Contexto

- **App móvil:** Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · NativeWind 4.
  Leer los docs versionados exactos: https://docs.expo.dev/versions/v57.0.0/
- **Backend:** Supabase (PostgreSQL). El schema es la fuente de verdad del modelo
  de datos; la app se adapta a él, nunca al revés.
- **Rama de trabajo:** `feature/mobile-app`.
  ⚠️ Cada push a esta rama dispara un **OTA a producción** (`.github/workflows/eas-update.yml`).
  No hacer push sin decisión explícita.

## 1. La fuente de verdad es el schema

- El modelo de datos se define en las migraciones SQL, no en tipos de TypeScript
  ni en stores de Zustand.
- Los tipos del cliente se derivan del schema, no se escriben a mano en paralelo.
- No "arreglar" formas de datos contra mock data: si el modelo está mal, se
  corrige en el schema y la app se migra **una sola vez**.

## 2. Nada de datos sin identidad ni trazabilidad

- Toda entidad tiene `id uuid`, `created_at`, `updated_at`. Las que se borran
  lógicamente, `deleted_at`.
- Toda acción de una persona sobre un dato registra **quién** con una FK real,
  no con un nombre en texto. Esto no es opcional en visitas, correspondencia,
  verificaciones de documento y reportes legales.
- Nada de arrays embebidos para cosas que se referencian, se auditan o se
  reportan por separado (invitados, votos, turnos, vehículos).

## 3. Nada de identificar personas por correo

`auth.users.id` es la identidad. El correo es un atributo que cambia.
Prohibido usarlo como clave de mapas, de relaciones o de permisos.

## 4. Enums en la base, no strings libres

Todo campo `estado`, `tipo`, `rol` o `categoría` es un enum de Postgres.
Si un valor todavía no está decidido por producto, se documenta como pendiente;
no se deja un `text` abierto "por ahora".

## 5. Booleanos, fechas y dinero con su tipo real

- Booleano es `boolean`, nunca `"Sí"` / `"No"`.
- Fecha es `date` / `timestamptz`, nunca `"14/05/2024"`.
- Dinero es `numeric(12,2)` + código de moneda ISO 4217, nunca `string` ni `number` suelto.

## 6. Formateo determinista, nunca dependiente del dispositivo

No usar `toLocaleDateString`, `toLocaleTimeString` ni `toLocaleString`: en React
Native el resultado depende del locale y la zona horaria del teléfono, así que el
mismo dato se ve distinto en cada dispositivo y deja de coincidir con el formato
en que está almacenado.

Usar los helpers de `@/shared/utils`: `formatDate`, `formatTime`, `formatDateTime`,
`formatDateShortMonth`, `formatMonthYear`, `formatAmount`.

Formato canónico de fecha: `dd/MM/yyyy` con ceros a la izquierda.

## 7. RLS desde la primera tabla

Ninguna tabla se crea sin Row Level Security activada y sus políticas escritas.
No existe "después le ponemos permisos": el aislamiento entre condominios y entre
unidades es el requisito de seguridad central del producto.

## 8. La consulta declara su ámbito; RLS es el techo, no el filtro

RLS decide lo que una persona *puede* ver. No decide lo que *debe* ver en cada
pantalla, porque no sabe con qué rol entró: mira su identidad.

Quien administra un condominio y además vive en él tiene ambos permisos a la
vez. Si la consulta pide "todo lo que se permita", al entrar como propietario
sigue viendo lo de la administración, y la elección de rol queda en nada.

Por eso cada consulta dice explícitamente qué ámbito pide (`propias`,
`condominio`, `unidad`) a partir del rol activo. La política sigue siendo el
límite —pedir de más no devuelve nada ajeno—, pero la app deja de pedirlo.

El rol activo **no** viaja en el token. Es un contexto de trabajo que la
persona cambia cuando quiere, no un permiso: ponerlo en un *claim* no
protegería nada y crearía una segunda fuente de verdad que se desincroniza de
las tablas de membresía —un token emitido antes de quitarle un rol a alguien
seguiría afirmando que lo tiene hasta expirar—.

## 9. Secretos y credenciales

- Nada de URLs, claves ni tokens hardcodeados. Todo por `EXPO_PUBLIC_*` (cliente)
  o variables de entorno del servidor.
- Las credenciales de acceso físico a una vivienda (`wifiPassword`, `doorPassword`)
  se cifran en reposo y se leen solo con RLS que verifique reserva activa.

## 10. Verificar antes de declarar terminado

- `npm run typecheck` sin errores.
- `npm test` en verde (unitarias, sin red).
- `npm run test:rls` si se tocó una política, una función o una restricción.
  Va contra el Supabase real con las cuentas de prueba, así que comprueba lo
  que la API devuelve de verdad.
- Lo que cambia comportamiento visible se prueba **en el navegador**. El
  typecheck no detecta una pantalla que no navega ni un botón sin `onPress`;
  varios de los defectos de este proyecto solo aparecieron al recorrer el flujo
  a mano.
- Si un cambio altera comportamiento observable, se dice explícitamente en el
  commit y en el reporte. No se esconde en un refactor.

### Qué se prueba y qué no

La prioridad es el límite de seguridad: quién ve qué. Una política mal escrita
filtra datos de vecinos; un componente mal pintado se ve y se arregla.

Un caso negativo ("no debe ver X") necesita pedir X explícitamente y, a su
lado, un control positivo. Comprobar solo que "lo que veo es mío" pasa igual
con la política abierta de par en par si resulta que soy el único con datos:
así estaba escrita la primera versión del caso de notificaciones, y no detectó
la regresión cuando se relajó la política a propósito para comprobarlo.

Los componentes de React Native quedan fuera por ahora: exigen el entorno de
Expo y cubren mucho menos riesgo.

### Un recorrido es la unica prueba que dice si algo funciona

`npm run typecheck`, `npm test` y `npm run test:rls` pasaban los tres mientras
la aplicacion estaba rota. Ninguno recorre un flujo como un rol: RLS comprueba
politicas fila a fila, las unitarias comprueban funciones puras, y el typecheck
no sabe si un boton hace algo.

Todos los defectos que encontro el cliente el 24/09/2026 salieron de **caminar
un flujo**. Por eso existe `docs/RECORRIDOS.md`: la lista de lo que tiene que
funcionar, con su estado. Un recorrido abre sesion como un rol y llama a **las
funciones del repositorio de la app**, no a HTTP crudo, para que se compruebe
tambien el mapeo de datos --que es donde vivian la mitad de los defectos--.

### Un recorrido puede pasar por un cortocircuito del propio repositorio

Las funciones del repositorio salen antes de tiempo. `obtenerLibroHuesped`
pide la ficha, y si RLS se la oculta hace `if (!data) return null` **sin llegar
a pedir las contraseñas**. Una prueba que solo mire lo que devuelve esa funcion
da por bueno el limite de seguridad de la capa que ni siquiera se ejecuto.

Paso de verdad: al relajar `credenciales_alojamiento` de `es_huesped_alojado`
a `es_huesped_con_reserva` --confundir "tiene reserva" con "esta dentro"--, el
recorrido siguio **verde** mientras el RPC entregaba la clave de la puerta a
alguien que todavia no habia llegado. Lo salvaba, por accidente de orden, la
politica de la ficha.

Donde hay dos defensas, se comprueban las dos por separado: el recorrido para
el camino de la pantalla, y una llamada directa al RPC o a la tabla para la
otra. Un RPC es publico: cualquiera puede llamarlo sin pasar por la pantalla.

Y la comprobacion de que la prueba sirve es **mutar la de dentro**, no la de
fuera. Si la mutacion no la pone roja, la prueba no cubre lo que dice cubrir.

### El navegador: que funciona y que lo rompe

- **Nunca llamar a `resize_window`.** Es lo que deja la ventana en 0x0 o en un
  viewport absurdo de 211px, y de ahi no se recupera: hay que cerrar la
  pestaña y abrir otra. El tamaño lo pone el usuario con F12; se toma el que
  haya.
- **El marco de coordenadas de la captura NO es el viewport CSS.** Con un
  viewport de 414x896 la captura viene en 189x394. Calcular clics a partir de
  `getBoundingClientRect()` no funciona.
- **Pulsar:** `find` para obtener un `ref` y pulsar por `ref`, o despachar el
  clic desde `javascript_tool` buscando por texto. Las dos son fiables.
- **Comprobar:** `javascript_tool` leyendo el DOM --textos, estilos
  calculados--. No ha fallado ni una vez en toda la sesion.
- **Capturar:** solo para juicio visual, a escala 0.6, y con un reintento: el
  primer `screenshot` despues de navegar suele agotar el tiempo.

### Antes de decidir una regla de negocio, buscarla en el KT

`docs/VeciYo_KT_Roles_y_Conocimiento.md` es el traspaso de conocimiento del
proyecto: cincuenta y siete mil caracteres de decisiones tomadas con el
cliente, marcadas `[DECIDIDO]`, `[EN DISCUSION]` o `[SUPOSICION]`, con la
sesion en que se acordaron.

No es documentacion de apoyo: es la fuente de las reglas de negocio, y esta
por encima de lo que parezca razonable al leer el codigo.

Ya paso una vez. Se implemento que el condominio **bloqueara** el alta de una
suscripcion de renta corta si el aforo excedia el suyo. Era razonable y era
contrario a una decision explicita del flujo 4.1: *"El sistema debe mostrar
como **advertencia (no bloqueo duro)** las reglas minimas que ya impone el
edificio"*. Hubo que deshacerlo.

Antes de escribir una regla —quien puede que, que pasa si, que gana cuando dos
cosas se contradicen— **buscarla ahi primero**. Si no esta, decirlo como hueco
y preguntar, en vez de elegir por cuenta propia: el KT tambien lleva una
seccion de huecos conocidos, y ese es su sitio.

### Una casilla que expresa un permiso necesita una prueba que la invierta

El defecto mas repetido de este proyecto tiene una sola forma: **la decision
vivia en la pantalla, no en el dato**. El prototipo era una maqueta con todo en
memoria, asi que cada interruptor funcionaba porque nadie lo comprobaba. Al
migrar a un backend real, los que no se reimplementaron quedaron decorativos.

Han aparecido seis: `restringida_huesped`, `para_propietarios`,
`para_residentes`, `para_huespedes`, `requiere_aprobacion` y
`perfil.verificado`. En todos, la pantalla respetaba la casilla y la base no.

La regla, entonces: **una columna que expresa un permiso, una restriccion o una
afirmacion sobre alguien necesita una prueba que la invierta y compruebe que el
comportamiento cambia.** Si no la tiene, esta decorativa por definicion y nadie
se va a enterar.

Y una variante mas grave: si la afirmacion es **sobre** una persona
—`verificado`, `rol`, `puede_acceder`—, esa persona no puede escribirla. RLS no
sabe comparar el valor viejo con el nuevo, asi que eso va en un disparador.

Para encontrarlas no hace falta recorrer pantallas: se enumeran desde el
esquema y se contrastan con las politicas y funciones. Asi salieron las tres
ultimas, en minutos.

### La restauracion no puede pasar por el codigo que se esta mutando

Un recorrido que deja el mundo como lo encontro suele restaurar llamando a las
funciones de la aplicacion --lo que leyo con `obtenerX`, lo devuelve con
`guardarX`--. Mientras se muta una de esas funciones para comprobar que la
prueba la detecta, **el `afterAll` escribe con el codigo roto**.

Paso: una mutacion forzaba `p_ocultar_numero` a `false`, la restauracion lo
escribio asi, y tres casos de `conversaciones.test.ts` se pusieron rojos por un
dato que otro archivo habia estropeado. El sintoma aparece lejos de la causa y
cuesta media hora entenderlo.

Lo que se guarda para restaurar es la **fila cruda**, y se devuelve con una
escritura directa. Asi la restauracion sigue siendo correcta aunque el
repositorio este roto a proposito.

### Una mutacion que no se aplica parece una prueba robusta

Al mutar, **nunca silenciar la salida**. Una mutacion con un error de sintaxis
no llega a aplicarse, la suite sigue verde, y eso se lee como "la prueba no
detecta esto" o, peor, como "esto esta bien protegido". Las dos lecturas son
falsas y las dos llevan a dejar pasar un agujero.

Paso: `es_admin_condominio` se sustituyo por `(select true) or ...` dentro de
`public.es_admin_condominio`, quedo `public.(select true) or ...`, Postgres lo
rechazo, y el `>/dev/null` se comio el error. La prueba "seguia verde" contra
una funcion intacta.

La mutacion se aplica mirando el resultado, y se comprueba que el cambio esta
antes de correr nada.

### Un recorrido que toca datos compartidos se lleva la foto entera

El recorrido de las cuotas guardaba para restaurar **solo la fila que miraba**,
y la prueba de la carga masiva marca por codigo: dejo pagadas viviendas que no
lo estaban, entre ellas la de Marcela, que existe justamente para estar en mora
y probar los filtros de morosidad. La suite seguia verde; el dato del cliente,
no.

Antes de escribir, guardar el estado de **todo lo que se pueda tocar**, no de
lo que se piensa tocar. Y al terminar, comprobarlo contando, que es lo unico
que no miente.

### Al mutar una política, limpiar lo que escribió

Relajar una política a propósito para comprobar que las pruebas la detectan es
el único modo de saber que sirven. Pero mientras está relajada, los casos que
deberían fallar **escriben de verdad**: quedan filas que la política real habría
rechazado.

Ha pasado dos veces. Un huésped reservó una zona que tiene vedada, y otro emitió
una invitación que no le corresponde; en los dos casos la fila sobrevivió a la
mutación y volvió como un fallo desconcertante varias corridas después —y en el
segundo, la prueba pasaba al correr su archivo suelto y fallaba en la suite
completa—.

Después de restaurar la política, borrar lo que se creó mientras estuvo
relajada. Si no, la base guarda un estado que el propio sistema considera
imposible.

## 11. Un solo lugar para los tokens de diseno

Los colores, radios y tipografias viven en `src/config/palette.js`, que
alimenta a la vez a `tailwind.config.js` (clases de NativeWind) y a
`src/config/theme.ts` (estilos en linea de React Native).

Prohibido escribir un hexadecimal en un componente. Si hace falta un color que
no existe, se agrega a la paleta con un nombre que diga para que sirve, no que
color es. Unica excepcion: los colores de marca de un tercero, como el icono de
Google, que no son tokens del sistema y no deben cambiar con el.

Esta regla estuvo escrita aqui desde el principio y **nadie la comprobaba**, asi
que se fue deshaciendo sola: quedaron 305 literales repartidos en 100 archivos.
El caso que lo destapo: los cuatro modales de la aplicacion repetian a mano el
mismo `rgba(0,0,0,0.5)` que **ya existia en la paleta** como `bgOverlay`, sin
usarlo. Una regla que solo vive en un documento es una intencion, no una
garantia.

Ahora la comprueba `npm run tokens`, que corre solo antes de `npm test`. Los
305 ya estan limpios y **la marca es cero**: cualquier color literal que entre
en un componente rompe `npm test`. La marca vive en `tokens.baseline.json`.

Al limpiarlos aparecieron colores que no tenian token --los del chat y las
llamadas, las superficies de vidrio sobre una foto, los fondos que sustituyen a
una imagen que no hay--. Estan en la paleta con nombres que dicen **para que
sirven**: `chatAcento`, `heroVidrio`, `zonaSinFoto`, `veloPieImagen`. Si hace
falta uno nuevo, se agrega igual; lo que no se hace es escribirlo en el
componente.

### `<Image>` no se dimensiona con clases

React Native Web escribe el tamaño real del archivo como estilo **en linea**
sobre el contenedor de la imagen, y un estilo en linea gana siempre a una
clase. `<Image className="h-14 w-14">` no dimensiona nada: un PNG de 400px se
pinta a 400px. Comprobado en el navegador --`h-7 w-7` daba 30x30, `h-11 w-11`
daba 40x40, `h-14 w-14` daba 400x400: siempre el tamaño del archivo--. Las que
parecian funcionar era casualidad de que el asset ya media lo correcto.

El tamaño de una imagen va en `style`.

### Un componente envuelto en `Animated` pierde sus clases

`Animated.createAnimatedComponent(X)` devuelve un componente nuevo, y la
traduccion de NativeWind estaba puesta sobre `X`, no sobre el envoltorio: el
`className` se pasa como un prop cualquiera y no lo lee nadie. El sintoma fue
un modal **transparente** --se veia la pagina a traves de la tarjeta-- porque
el `bg-white` no llegaba a aplicarse, y con el fondo se perdia tambien el
contraste de la X de cerrar.

Lo que pinta un componente animado va en `style`.

## 12. Estilo

- Un archivo por componente. Nada de componentes escritos en una sola línea.
- Pantallas por encima de ~400 líneas se dividen; la lógica va a hooks.
- Comentarios solo donde el *porqué* no es evidente. El *qué* lo dice el código.
- Commits: `tipo(ámbito): descripción` en minúsculas.

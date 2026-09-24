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

Ahora la comprueba `npm run tokens`, que corre solo antes de `npm test`. No
exige limpiar los 305 de golpe: exige que no crezcan. La marca esta en
`tokens.baseline.json` y solo puede bajar --al limpiar un archivo, se baja con
`npm run tokens -- --aceptar`--.

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

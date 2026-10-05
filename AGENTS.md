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

### Nada se reporta sin haberlo recorrido

Regla, no costumbre, y la mas cara de incumplir: **nada se reporta como
terminado al cliente hasta haberlo recorrido en el navegador con el rol que lo
usa, por la pantalla, de principio a fin.**

Las suites no sustituyen eso. El 02/10/2026 se dijo que el preregistro del
huesped funcionaba, con 669 pruebas en verde y seis recorridos dedicados a ese
flujo, y **fallaba en toda reserva hecha desde la pantalla**: un 409 en el
primer paso. El cliente lo descubrio delante de su cliente.

Las dos lecciones, que son distintas:

  · **Una prueba que puede montar un estado imposible, lo monta.** Los seis
    recorridos creaban la visita con `invitados: []`, que la pantalla no manda
    nunca, y por ahi el defecto no existia. La respuesta no fue «acordarse»:
    `crearVisita` ahora **rechaza** una estancia de huesped sin huespedes, asi
    que esa forma ya no se puede escribir. Cuando un defecto se cuela por una
    forma que el producto no permite, se cierra la puerta en el codigo.
  · **Lo que se afirma se comprueba por el camino en que va a fallar.** Decir
    «funciona» leyendo el codigo y mirando pruebas verdes es una suposicion con
    aspecto de dato. Si no se ha pulsado, se dice que no se ha pulsado.

- `npm run typecheck` sin errores.
- `npm test` en verde (unitarias, sin red). Arrastra `pretest`, que corre nueve
  comprobaciones y **cualquiera de ellas impide que `npm test` arranque**:

    · `tokens` — ningun color literal en un componente (marca: 0).
    · `botones` — ningun control pulsable sin `onPress` (marca: 4).
    · `controles` — ningun control de solo icono sin nombre (marca: 0).
    · `huerfanos` — ningun archivo de `src` al que no llegue un `import` (marca: 0).
    · `repos` — ningun `*.repo.ts` que importe la plataforma (marca: 0).
    · `lineas` — ningun componente escrito en una sola linea (marca: 0).
    · `selects` — ningun `select` que Supabase no pueda tipar (marca: 0).
    · `fechas` — ninguna fecha escrita a fuego que caduque en 60 dias (marca: 0).
    · `estados` — ningun control que cambie de aspecto sin decirlo (marca: 0).
    · `fingen` — ningun servicio que espere 150 ms y escriba en un store en vez
      de en la base (marca: 1, con su motivo escrito).
    · el **linter** (`eslint src --max-warnings 0`), con `rules-of-hooks`,
      `no-unused-vars` y `no-explicit-any` en error, y **cero avisos**.
- `npm run test:componentes` en verde (jsdom, sin red). Monta pantallas de
  verdad con `react-native-web`, que es el entorno en el que la aplicación
  corre hoy; comprueba lo que **se ve**, no lo que se guarda.
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

Los componentes ya **no** quedan fuera. La excusa era el entorno de Expo, y
resultó no hacer falta: la aplicación corre en web, así que las pruebas usan
`react-native-web` en jsdom (`vitest.componentes.config.mts`). Lo que se
dobla se dobla con su motivo escrito al lado.

El motivo de cubrirlos es concreto: **comprobar que se escribe no es
comprobar que se ve**. El número de lavadora se guardaba bien y no aparecía
en ninguna de las cuatro pantallas que lo tenían que enseñar; las unitarias y
las de RLS pasaban las dos.

### Una columna nueva puede romper una funcion sin tocarla

`permisos_de_unidad` devuelve `public.permiso_vivienda` **como tipo** y
construye la fila columna a columna. Al anadir `corta_hasta_noches` a la tabla,
Postgres empezo a rechazarla entera --«Final statement returns too few
columns»-- y dejo de responder para todo, no solo para el campo nuevo.

La migracion se aplico sin error: la funcion no se toca al hacer `ALTER TABLE`,
se rompe la siguiente vez que alguien la llama. Lo unico que lo delato fue que
las pruebas del umbral devolvian `null` en vez de `true`.

Antes de anadir una columna, mirar quien devuelve esa tabla como tipo:

```sql
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and pg_get_function_result(p.oid) = 'permiso_vivienda';
```

Hoy solo hay una funcion asi en todo el esquema, y es esa.

### Una prueba que no se trae sus datos no prueba nada

Los casos de correspondencia del coadministrador leian **lo que hubiera** en
la base. El dia que no quedo ninguna fila, el lado positivo --«con el permiso
si la ve»-- se puso rojo, y el negativo --«sin el permiso no ve nada»-- siguio
en verde **por la razon equivocada**: sin datos se cumple igual con la politica
abierta de par en par.

Una prueba se trae lo que necesita y se lo lleva al terminar. Si depende de una
fila que dejo otro, depende tambien de que nadie la borre.

Lo mismo por el otro lado: el caso de SOS llevaba dias en rojo porque
`turno_override` tiene `UNIQUE (membresia_id, fecha)` y una corrida
interrumpida habia dejado el suyo. El fallo parecia del codigo y era basura de
ayer. Una prueba que crea algo unico lo retira **antes** de crearlo, no solo
despues.

Y al reves: si la limpieza no llega a una tabla, se acumula a la vista del
cliente. Las visitas del huesped se marcan en `anotaciones_ingreso`, que el
barrido no miraba: trece en un dia, todas en la lista de la 102.

### Comprobar el error de la limpieza, tambien

`verificacion_antecedentes` apunta al invitado con RESTRICT --es constancia de
un hecho y de un cobro--, asi que desde que el precheckin la dispara, la visita
deja de poderse borrar. El `afterAll` no miraba su propio error y se iba
dejando una visita por corrida.

Una limpieza que no comprueba si limpio no es una limpieza.

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

### La suite cierra la sesion del navegador si comparten cuenta

`supabase.auth.signOut()` tiene ambito **global** por defecto: revoca los tokens
de refresco de esa cuenta en todas partes, no solo en el cliente que lo llama.
El arnes de recorridos entra y sale con `guardia@veciyo.test` decenas de veces,
asi que una corrida de `npm run test:rls` **cierra la sesion del navegador** si
alguien esta recorriendo la aplicacion con la misma cuenta.

El sintoma engaña: la app salta a `/login` sin un solo error en consola, y
parece que echo al usuario sola --justo despues de pulsar algo, que es lo que
uno acaba culpando--.

`salir()` pasa ahora `scope: "local"`, que es lo que de verdad se quiere: que
**este** cliente deje de hablar en nombre de esa persona. Aun asi, conviene no
correr la suite mientras se recorre la app a mano.

### El estilo calculado miente cuando hay Reanimated

`getComputedStyle` decia `opacity: 0` sobre la tarjeta de un modal y sobre su
velo mientras en pantalla se veian **perfectamente**. Estuve a punto de reportar
un defecto inexistente, y de "arreglar" algo que funcionaba.

Reanimated no anima por el estilo en linea que el DOM expone, asi que lo
calculado no es lo pintado. Para juicio visual, **captura**. El DOM sirve para
leer textos y datos --ahi no ha fallado nunca-- pero no para saber que se ve.

Corolario, del mismo dia: una pantalla montada **debajo** sigue respondiendo.
Pulsar por texto encuentra nodos de la pantalla anterior, todavia montada bajo
la actual, y lo que sale parece un fallo de la pantalla nueva --una pantalla en
blanco, en el caso real--. Hay que elegir el nodo visible y dentro del area
esperada, no el primero que coincida.

Tres falsas alarmas en una sola tanda salieron de fiarse del DOM. Las tres se
descartaron mirando.

### Una prop escrita a fuego es una casilla decorativa con otra forma

`VisitaSuccessView` llevaba `<Badge status="Pendiente" />`. Cuando la porteria
registra a alguien que ya esta en la puerta, la visita nace `ingresada`, asi que
el guardia acababa de dejar entrar a una persona y la pantalla le decia
"Pendiente".

Es la misma familia que las seis casillas decorativas: **la decision vivia en la
pantalla, no en el dato**. Y no la pilla ninguna prueba de datos, porque no es
una regla de datos: es un literal en un componente. Salio de registrar una
visita a mano en el navegador.

Al buscar el patron aparecio un solo caso mas --`Badge status="En Porteria"` en
correspondencia-- y ese si es correcto por construccion, porque un paquete
recien registrado siempre esta en porteria. Dos casos no justifican un script;
si aparece un tercero, si.

### Antes de decidir una regla de negocio, buscarla en el KT

`../docs/VeciYo_KT_Roles_y_Conocimiento.md` --un nivel por encima de este
repositorio, junto a `KT-HUECOS-CERRADOS.md` y `CONOCIMIENTO-PROYECTO.md`; no
esta en `veci-yo/docs/`, que es otra carpeta-- es el traspaso de conocimiento del
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

Han aparecido ocho: `restringida_huesped`, `para_propietarios`,
`para_residentes`, `para_huespedes`, `requiere_aprobacion`, `perfil.verificado`
y, los dos ultimos, `permisoChat` y `permisoLlamadas` de la porteria. En los
seis primeros la pantalla respetaba la casilla y la base no; en los dos ultimos
al reves --la base la guardaba y **la pantalla no la miraba**--, y la raiz
estaba mas abajo todavia: la consulta de sesion ni siquiera cargaba la columna
`permisos`, asi que la aplicacion no podia saberlo aunque quisiera.

Esos dos no salieron del esquema: salieron de **usar la aplicacion** con una
cuenta que los tenia apagados y ver que funcionaban igual. Enumerar columnas
encuentra las que la base no sujeta; para las que nadie lee hay que recorrer la
pantalla.

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

### Un arreglo a medias es peor si lleva comentario

La migracion `20260923370000` movio el numero de la reserva a la base: secuencia
y disparador. Pero el disparador solo actua si el numero llega **vacio**, y el
repositorio se quedo con `numero: datos.numero ?? undefined`, con la pantalla
sorteandolo en el cliente. Resultado: la secuencia no se usaba nunca por ese
camino, y el commit de esa noche afirmaba que si.

Lo que lo hace peor es el comentario. Encima de esa linea ponia «El numero lo
asigna la base», justo sobre el codigo que lo deshacia. Un comentario que
afirma lo contrario de lo que hace el codigo no es ruido: es una trampa, porque
el siguiente que lea el archivo dara el asunto por cerrado.

Al mover una decision a la base, hay que **quitar el camino viejo**, no dejarlo
de reserva. Y comprobarlo: bastaba mirar el numero de una reserva hecha desde la
pantalla y ver si venia de la secuencia.

### Las pruebas tambien se typechequean

`tsconfig.json` incluia `src/**/*` y nada mas. Los 21 recorridos llaman a las
funciones del repositorio de la aplicacion, asi que un cambio de firma los rompe
--y `npm run typecheck` seguia en verde--.

Paso el 24/09/2026: cambie lo que devuelve `crearReserva` y diez llamadas
quedaron rotas sin que nada lo dijera; solo habrian fallado al ejecutarse.

Hay un `tsconfig.tests.json` aparte, para no meter los tipos de Node en el
entorno de React Native, y `npm run typecheck` corre los dos. Al encenderlo
aparecieron cuatro derivas que llevaban tiempo ahi: argumentos que una funcion
ya no recibe y propiedades que su tipo de parametros no tiene.

### La cadena tiene tres eslabones, y se rompe en el ultimo

`npm run sueltas` busca funciones de datos que nadie llama. No basta: la cadena
real tiene tres eslabones --funcion del repositorio, hook, boton-- y el que se
rompe suele ser el ultimo.

Paso con la votacion. `votar` estaba escrita, `emitirVoto` la llamaba desde el
hook, y hasta `miVoto` y `yaVote` existian para saber que habia elegido cada
quien. Pero `AnuncioVotacionCard` tenia los botones «Si» y «No» con
`onPress={() => {}}` y las opciones eran `Pressable` sin `onPress` ninguno:
**nadie podia votar desde la aplicacion**.

No lo vio nada de lo que habia. El recorrido llama a `votar` directamente, asi
que estaba en verde. Y `sueltas` tampoco, porque `votar` **si** se llama --desde
un hook que no usaba nadie--: la cadena se rompia un eslabon mas afuera del que
esa herramienta mira.

Por eso existe `npm run botones`, que cuenta los controles pulsables sin
`onPress` o con uno vacio, con marca en `botones.baseline.json` igual que los
tokens. La marca esta en 4, y los cuatro son funciones sin construir --de
ninguna existe tabla ni mencion en el KT-- que estan en `REVISAR-A-OJO.md`.

Ni aun asi sustituye a recorrer la pantalla: un boton que llama a la funcion
correcta con el argumento equivocado pasa las dos herramientas.

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

### No cortar la salida de una corrida: el detalle no vuelve

Dos veces en la misma tarde. Primero `npm run test:rls | grep "Tests "`, que no
imprimio nada y **tapo que la suite entera no habia arrancado** --el
`globalSetup` reventaba y vitest decia "No test files found"--. Despues
`npm run test:rls | tail -6`, que dejo el resumen (47 archivos, 479 pruebas,
**1 error**) y tiro el error, que ya no se puede recuperar porque la corrida
dura once minutos y no siempre se puede repetir.

La salida se guarda entera --a un archivo si hace falta-- y se filtra **despues**
mirandola, no mientras se genera. Es la misma leccion que la de las mutaciones
silenciadas, aplicada a la propia suite.

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

### Una variable sin usar es casi siempre un cabo sin atar

Habia 95 avisos de `no-unused-vars` --70 importaciones y 25 variables-- y la
suposicion razonable era que eran basura. Setenta lo eran. Las otras eran el
**ultimo eslabon sin conectar** de algo terminado:

  · `saveTurnos` estaba importado en la pantalla de seguridad y nadie lo
    llamaba: el administrador programaba una rotacion de turnos, la veia en la
    lista, y al cerrar el modal desaparecia. Se guardaban los permisos y la
    rotacion; el horario, no.
  · `guardando` llegaba de las dos pantallas que usan `UbicacionForm` y el
    boton no se bloqueaba, asi que pulsar dos veces mandaba dos escrituras.
  · `onBlur` se desestructuraba de cinco `field` de react-hook-form y no se
    pasaba al `Input` --que si lo acepta--: los campos no se marcaban como
    tocados y la validacion no disparaba cuando debia.
  · `asignarEstacionamiento` y `liberarEstacionamiento` estaban escritas dos
    veces, en el repositorio y en linea dentro del hook. Corria la del hook; la
    del repositorio se quedo de documentacion falsa.
  · `onRegisterExit` era un tercer camino para registrar la salida que el
    componente no llamaba, con los dos llamadores pasandolo igual.

Y tres eran **decisiones de producto escondidas en una variable que se tiraba**:
los bloques horarios de una zona comun, la correccion de los datos de un
invitado, y las franjas del filtro de guardias. Estan en `REVISAR-A-OJO.md`
como puntos 45, 46 y 47.

La regla esta ahora en **error**, con tres excepciones que llevan su motivo
escrito al lado y apuntan al punto del documento. En error y no en aviso con
tope: lo que importa ver es la que entra nueva, el dia que entra.

### Conectar una cadena destapa lo que no se comprobaba de su entrada

Al conectar el guardado de los turnos aparecio, en el navegador, que los dos
campos del horario recurrente --«Hora inicio» y «Hora fin»-- se alimentaban de
`hourRanges`, que son **rangos de seis horas**. Elegir «18:00 - 24:00» en un
campo que pide una hora guardaba esa cadena como hora de entrada.

No era un defecto nuevo: llevaba ahi desde el prototipo. Estaba **tapado**
porque el horario recurrente no llegaba a guardarse en ningun sitio, asi que
ese valor absurdo se quedaba en el estado de la pantalla y se perdia al cerrar.
Al enchufar la escritura, iba derecho a una columna `time`.

Es el patron a esperar cada vez que se conecta una cadena que estaba suelta:
**lo que nunca se guardo nunca se valido**. Antes de conectar el ultimo eslabon,
mirar de donde sale cada valor que va a empezar a viajar. Lo mismo paso con el
esquema: `horaFin` no pedia nada, asi que se podia guardar un turno con entrada
y sin salida --y entonces no hay forma de saber si el guardia esta trabajando--.

Y el filtro de la misma pantalla comparaba el rango del turno con la etiqueta de
la franja **letra por letra**, asi que un turno de 06:00 a 14:00 no era «06:00 -
12:00» y filtrar por manana no devolvia a nadie. Preguntar «quien trabaja por la
manana» es solaparse, no coincidir.

Los tres salieron de **usar la pantalla**: ninguna de las 188 unitarias, las 73
de componentes ni las 541 de RLS los habria visto, porque los tres estan en lo
que la interfaz **ofrece**, no en lo que el codigo hace con lo que recibe.

### Dos sitios que arman el mismo texto lo arman distinto

`Turno` guardaba `hora: string` con el rango ya compuesto. `seguridad.repo`
escribia «08:00 - 16:00» y `arquitectura.repo` «08:00 a 16:00», para el mismo
turno de la misma tabla. Y los dos sitios que lo volvian a partir esperaban
« a »: `perfil.helpers` funcionaba por el mapeo que le tocaba y
`seguridad.helpers` **no funcionaba nunca**, asi que el borde verde de «esta en
turno» no se encendia para nadie en la lista de la administracion.

Nadie lo vio porque los dos son coherentes consigo mismos. El typecheck pasaba
--los dos son `string`--, y no habia una sola prueba de ninguno de los dos.

Ahora `Turno` lleva `horaInicio` y `horaFin`, que es lo que hay en la base, y el
texto se compone solo en `formatRangoHoras`. La regla general: **un dato no se
guarda ya formateado**. Si dos capas tienen que ponerse de acuerdo en un
separador, una de las dos se va a equivocar y nada lo va a decir.

### Un repositorio que importa la plataforma mata un recorrido en silencio

Al meter la escritura del Excel en `reportes.repo`, ese modulo empezo a importar
`react-native` y `expo-file-system`. Los recorridos corren en **Node** y llaman
a las funciones del repositorio, asi que `administracion-reporte.test.ts` dejo
de arrancar: «Flow is not supported» al parsear `react-native/index.js`.

Lo que lo hace peligroso es como se ve: no es una prueba roja sino un archivo
con **cero pruebas** y un fallo de parseo, y `npm run test:rls` **termino con
codigo 0**. Se leyo el resumen --«535 passed»-- y se dio por bueno; el «1
failed» de la linea de archivos es lo unico que lo decia.

Lo que depende del dispositivo va en su propio modulo, como `reporteArchivo.ts`,
y lo comprueba `npm run repos` antes de cada `npm test`.

### Un archivo que nadie importa es peor que una funcion suelta

`features/visitas/utils/` era una copia entera de
`features/visitas/helpers/visitas.helpers.ts` --las mismas siete funciones, con
los mismos nombres-- que nadie importaba. Aparecio porque una de sus funciones
salio en la lista de variables sin usar, no porque nada lo vigilara: `sueltas`
mira funciones y `botones` mira controles, y un archivo al que no llega ningun
`import` no lo veia nadie.

Es peor que una funcion suelta porque mientras existe, el siguiente que lo abra
va a creer que es el codigo vigente y va a editarlo ahi. Lo comprueba
`npm run huerfanos`, con la marca en **cero**.

### Los 179 `any` no eran un problema de estilo

La suposicion razonable era que `(fila: any)` en un mapeador es inofensivo:
lo que sale se tipa al mapearlo. **Setenta y uno eran asi y ninguno hizo falta
tocarlo a mano**, porque la causa era otra: un `select` deja de ser tipable si
se construye concatenando cadenas o si su constante no lleva `as const`.
Arreglado eso, Supabase deduce la forma del esquema generado y el mapeador se
tipa solo. Lo comprueba `npm run selects`, con la marca en cero.

Los demas salieron uno a uno y **cada tanda destapo un defecto**:

  · El selector de estado de una vivienda ofrecia `config-pendiente` y
    `config-completado` **con guion medio**; el enum de la base los tiene con
    guion bajo. Guardar uno de esos dos estados fallaba, y el `as any` del
    `updateUnit` era lo que dejaba salir la cadena mala.
  · Dos pantallas pintaban el tipo de documento **crudo**: el guardia leia
    «cedula_ciudadania 1098765432» donde tiene que leer «Cedula de ciudadania».
    `TIPO_DOCUMENTO` existe justo para eso y no se usaba.
  · El formulario de editar un residente leia `editData?.menorEdad`, campo que
    no existe en ningun tipo --el dato se llama `esMenor`--, asi que al editar a
    un menor la casilla salia desmarcada siempre.
  · `Conversation` no declaraba `ultimoEnviadoEn`, que es el campo por el que se
    ordena la lista de chats: el objeto lo llevaba y el `as Conversation` lo
    borraba del tipo.
  · `ZonaComunConfig` no declaraba `total` --los cupos simultaneos de la zona--,
    que el mapeo si pone y la pantalla leia con `(zonaConfig as any)?.total`.
  · `AdministradorPermisosScreen` leia `e?.target?.value` en el `onChange` de un
    `Select` que entrega el valor, no un evento: residuo del prototipo web que
    no se ejecutaba nunca.

Y dos **falsas alarmas**, descartadas verificando antes de tocar nada: el tipo
de visita si se traduce a `huesped_temporal` antes de insertar --hay un mapa
para eso--, y el `zodResolver(...) as any` era la friccion conocida entre los
`.default()` de zod y react-hook-form, que se resuelve declarando la entrada y
la salida del esquema por separado.

La regla esta en **error**. Y en los dobles de prueba, donde hace falta que un
objeto pase por el cliente de Supabase, se convierte contra `never` y no contra
`any`: encaja igual donde se espere cualquier cosa, pero no deja **leer** nada
de lo convertido, asi que el doble no puede colarse como el cliente de verdad
en otro sitio.

### Una prueba con una fecha escrita a fuego caduca sola

Dos se pusieron rojas sin que nadie tocara su codigo:

  · `huesped-cancela-su-reserva` fallo el 27/09 con «new row violates row-level
    security policy for table reserva_zona». Las dos membresias de huesped de
    prueba iban del 21/09 al 26/09, y la politica llama a `es_huesped_alojado`,
    que exige `vigente_hasta >= current_date`. El error no menciona ninguna
    fecha, asi que se busca en el sitio equivocado.
  · `ZonaReservaForm.test` esperaba «Hoy, viernes 25 de septiembre» con la fecha
    escrita en la prueba. El componente dice «Hoy» comparando con el dia de
    verdad.

Las dos parecen rotas por el ultimo cambio y no lo estan. Un recorrido que
necesita una estancia vigente **se la trae** --`conEstanciaVigente`, que la abre
y devuelve las fechas exactas que habia-- y una prueba de componente que depende
del calendario **fija el reloj** con `vi.setSystemTime`.

Quedan mas fechas fijas en los recorridos --`2026-10-01`, `2026-10-05`-- que
caducaran el 6 de octubre. Son la misma bomba de tiempo.

### «La primera zona que haya» es una cita a ciegas con otro archivo

Media docena de archivos eligen zona igual: `activa = true`, `permite_estancia_larga
= true`, `limit 1`. Todos se llevan la **misma**: la piscina, que tiene
`cupos_simultaneos = 1`. Corren en paralelo, asi que basta que dos coincidan en
fecha y hora para que el segundo reciba «La franja de 05:00 a 06:00 ya esta
ocupada (1 de 1 cupos)».

Paso el 30/09/2026 en `reserva-no-en-el-pasado`, cuyo asunto es la **fecha** y
no el aforo: un rojo que no tiene nada que ver con lo que el archivo comprueba,
y que al mirar la base despues ya no esta --porque el `afterAll` del otro
archivo limpio lo suyo--. Es flaco por construccion: pasa casi siempre.

Al elegir una fila compartida, elegirla por lo que la prueba necesita: si el
aforo no es el asunto, pedir la zona con **mas** cupos simultaneos y comprobar
que de verdad tiene mas de uno. Y si el asunto es el aforo, traerse la zona
propia.

### Una limpieza borra lo que ella creo; si no sabe cual es, no borra

El `afterAll` de `invitacion-de-huesped` retiraba la membresia buscandola por
`(unidad, rol, vigente_desde)`. Esa combinacion **no identifica a nadie**: el
30/09/2026 coincidio con la de Nadia --la huesped que todavia no ha llegado,
cuya estancia empieza justo el dia siguiente al que esa prueba usa-- y le borro
su membresia.

El sintoma aparece a un archivo y una corrida de distancia: la suite siguio
verde esa vez, y la siguiente se puso roja en `alojamiento.test.ts`, en su
control positivo «si ve la vivienda», sin mencionar a Nadia ni a las
invitaciones. Media hora para llegar desde ahi hasta aqui.

La regla: una limpieza borra **por el identificador de lo que ella creo**. Si
eso significa guardarse un uuid en una variable, se guarda. Buscar por los
atributos con los que se creo funciona hasta el dia en que otro dato coincide, y
ese dia se lleva por delante algo del cliente.

Y lo mismo por el otro lado: `invitacion` y `reclamo` **no tienen politica de
DELETE** --a proposito, son constancia de un hecho-- asi que un borrado con
sesion de persona responde exito y no toca nada. `limpieza-global` las barre con
la clave de servicio, y lo que lo delata es **contar antes y despues de una
tanda**: si el numero sube, el barrido no barre.

### 56 casos rojos y ninguno era un fallo

El cupo de inicios de sesion de Supabase es **del proyecto entero**. La suite lo
gasta a manos llenas: el arnes guarda la sesion por cuenta, pero cada archivo
corre en su propio proceso, asi que con 57 archivos y seis cuentas son cientos
de inicios. El 30/09/2026 se junto eso con un recorrido a mano en el navegador
--cada cambio de rol es otro inicio-- y se paso.

Lo caro es el sintoma. `entrarComo` revienta, la sesion queda sin abrir, y todo
lo que viene detras falla con 403, con 400, con «expected 0 to be 1» y con
listas vacias: **24 archivos en rojo, 56 casos, ninguno un fallo de verdad**. Se
parece exactamente a haber roto algo grande.

Dos cosas:

  · Los dos arneses --`recorridos/cliente.ts` y `apoyo.ts`-- **esperan y
    reintentan** ante un 429, con esperas de 2s a 60s. Una corrida lenta dice la
    verdad; una corrida roja por el cupo no dice nada.
  · Y sigue en pie lo de no recorrer la aplicacion mientras corre la suite, que
    ya estaba escrito por el cierre de sesion global. Ahora hay un motivo mas.

Antes de dar por roto medio proyecto: `grep "rate limit"` en la salida.

### Una prueba que mide con otro reloj se rompe sola una hora al dia

`reserva_no_en_el_pasado` compara contra el reloj **del condominio**
--`now() at time zone zona_horaria_del_condominio(...)`-- y su recorrido sacaba
todas las fechas y las horas del reloj **de la maquina**. Casi siempre
coinciden, asi que llevaba dias en verde.

El 30/09/2026 a las 00:10 de la maquina eran las 23:10 del **29** en el
condominio. La prueba escribio una reserva para «hoy» que alli era mañana, el
disparador no le aplico la regla de las horas pasadas, y el caso se puso rojo
sin que nadie tocara una linea. Y arrastro a un segundo caso: la fila que el
primero no debia haber creado ocupo el unico cupo de la zona, asi que el
siguiente fallo con «ya esta ocupada», que no tiene nada que ver con lo que
comprueba.

Es la hermana de «una prueba con una fecha escrita a fuego caduca sola», con el
reloj en lugar del calendario, y es peor de encontrar porque la ventana en que
falla dura una hora al dia.

Dos cosas:

  · **La prueba mide con el mismo reloj que la regla.** Si la regla usa la zona
    horaria del condominio, la prueba la pregunta --`zona_horaria_del_condominio`
    es ejecutable por `authenticated`-- y construye sus fechas con ella.
  · **Al elegir «una hora que ya paso», las 00:00.** Es la mas temprana del dia,
    asi que ha pasado siempre que haya pasado algo del dia. Estaba puesto
    «00:01», que depende de que sean ya las 00:02.

Los demas recorridos que arman fechas con `new Date()` usan dias futuros
--`+1`, `+3`--, asi que una hora de desfase no los mete en el pasado. El que
pida **hoy** tiene que preguntar.

### Un recorrido con una persona de un solo rol no comprueba la regla 8

`obtenerVisitas()` y `obtenerReservas()` no pedian ambito: traian **todo lo que
RLS permitiera**. Salio recorriendo la pantalla como propietaria: en la lista de
la 301 aparecia una visita de la 205, y «Mis reservas» traia once de la 102 y la
205 y ninguna propia.

Lo que lo escondio no fue la falta de pruebas --hay recorrido de propietario y de
huesped, los dos en verde-- sino **con quien se hacian**. Sofia solo es
propietaria, asi que para ella «lo que me deja RLS» y «lo de mi vivienda» son lo
mismo y las dos consultas devuelven lo mismo. El defecto solo existe en quien
tiene los dos roles, y eso en los datos de prueba es Marcela: administra el
condominio y ademas es propietaria de la 301.

La regla, entonces: **un caso de la regla 8 se comprueba con alguien que tenga
dos roles, y comprobando las dos mitades.** Como administradora ve mas de una
vivienda; como propietaria, solo la suya. Un caso con una persona de un solo rol
pasa igual con la consulta abierta de par en par --es la misma trampa que un caso
negativo sin datos--.

Y el arreglo se equivoco una vez en el camino: la primera version tomo las
unidades de `useUnidadesDisponibles`, que devuelve **todas las del condominio**
--lo dice su propio comentario, y es correcto para lo que hace: llenar los
desplegables de torre y departamento--. Con eso el filtro no filtraba nada. El
typecheck y las 188 unitarias pasaban; lo pillo volver a mirar la pantalla. Las
unidades de las que alguien **es miembro** vienen en la sesion.

### Lo que se crea en el navegador con la marca `[prueba]` no sobrevive a un `vitest run`

Registrando una visita como porteria, la pantalla dijo «Visita creada» y la base
no tenia la fila. Dos veces. Parecia el defecto mas grave de la sesion: el
guardia deja entrar a alguien, recibe confirmacion y no queda constancia.

No lo era. `limpieza-global.ts` corre en el `globalSetup`, o sea **al arrancar
cualquier corrida**, y barre las visitas cuya `profesion`, `anotaciones_ingreso`
o **nombre del invitado** empiece por `[prueba`. Entre registrar en el navegador
y consultar con una prueba de diagnostico habia, cada vez, un `vitest run` que
las borraba.

La trampa es doble: el nombre `[prueba] Algo` es exactamente lo que uno pone para
no dejar basura, y la herramienta de diagnostico --una prueba puntual-- es la que
dispara el barrido.

Para comprobar en la base algo creado desde el navegador:

  · no usar la marca `[prueba]` en lo que se crea, o
  · comprobarlo **en la propia pantalla**, recargando, sin vitest en medio, o
  · consultar con un script suelto que no pase por el `globalSetup`.

Y antes de dar por roto un guardado, mirar si el exito depende del `onSuccess` de
la mutacion: si depende --y aqui dependia, con su comentario explicandolo-- la
escritura si ocurrio, y lo que falta es la fila, no la llamada.

### Una bandera que la base respeta y nadie puede encender

Las ocho casillas decorativas tenian la decision en la pantalla y no en el
dato. `ocultar_contacto` es el reverso: la base la respeta en las tres
funciones que listan la renta corta --el telefono no sale siquiera en la
respuesta-- y **ningun sitio de la aplicacion la encendia**, porque
`guardar_alojamiento` no recibia el parametro. Se quedaba en su `default false`
para siempre. Su hermana `ocultar_numero` si tenia su interruptor desde el
primer dia.

No lo ve ninguna prueba: la columna existe, la politica es correcta, el
typecheck pasa. Lo que lo delata es cruzar **las columnas del esquema con quien
las menciona en `src/`**: de las 71 booleanas, tres no las miraba la aplicacion,
y esta era la unica que ademas no se podia escribir desde ningun sitio.

Las otras dos son correctas y conviene saber por que, para no "arreglarlas":
`es_titular` la mantiene la base --indice unico por visita, la pone el RPC-- y
`auto_registro` es trazabilidad de quien lleno la ficha.

### Una restauracion que no llega deja a la siguiente corrida restaurando basura

El `afterAll` de `anfitrion-configura-alojamiento` guarda la fila entera y la
devuelve. Correcto. Pero lo que devuelve es **lo que leyo su `beforeAll`**, y si
una corrida anterior murio antes de restaurar, esa lectura ya venia sucia: la
corrida "restaura" los datos de prueba y los perpetua.

Asi llevaba dias la 102, con `[prueba] Dos habitaciones y una terraza`,
`[prueba] Vrbo` y `[prueba] Guesty` a la vista del cliente, y las pruebas en
verde todo el tiempo --porque el ciclo es coherente consigo mismo--.

Guardar el estado no basta: hay que **comprobar que lo guardado esta limpio**.
El recorrido falla ahora en el `beforeAll` si lo que lee ya trae la marca, que
es donde se ve la causa.

### Una frase que junta dos datos afirma algo que no paso

La tarjeta de una visita decia «Ingresó el 22/09/2026 a las 16:07» para alguien
que entro el **28**. No era un error de formato: juntaba la fecha **prevista**
de la visita --`fechaDesde`-- con la hora **real** de la entrada, porque al
mapear solo se sacaba la hora de `ingreso_en` y la fecha se tiraba.

La base tenia el dato bien: `ingreso_en` es un `timestamptz`. Lo perdia el
cliente. Y estaba en tres sitios --el chip de la tarjeta, la linea de horas de
la tarjeta y la del modal--, los tres compuestos igual.

Cuando una frase afirma un hecho --quien entro, cuando--, cada parte sale del
**mismo** dato. Si una mitad es lo previsto y la otra lo ocurrido, la frase
entera es falsa y nadie lo nota, porque las dos mitades son correctas por
separado.

### Un cupo asignado despues del checkout no lo suelta nadie

`soltar_cupo_al_terminar` es un `after update of estado` sobre `visita`: libera
el estacionamiento cuando la visita pasa a `finalizada`. Correcto, y probado.

Pero el boton «Asignar estacionamiento» seguia saliendo **despues** de registrar
la salida. Asignar entonces ocurre cuando el disparador ya corrio, asi que ese
cupo se queda ocupado para siempre. Con un unico cupo de visita en el
condominio, una sola vez basta: «0 de 1 disponibles», y ninguna visita mas
puede aparcar.

No lo ve ninguna prueba de datos --la asignacion es legitima, la politica la
permite-- ni el recorrido de `soltar-un-estacionamiento`, que asigna antes de
terminar, que es el orden sensato. Salio haciendo el checkout a mano y mirando
despues el contador de la portada.

### Una pantalla que anuncia lo que no intento

«Cambiar Contraseña» abria un modal que decia «Se envio el enlace de
restablecimiento a su correo». El boton solo hacia `setShowCambiarPass(true)`:
no habia llamada a nada. Y el «Recuperar contraseña» del login llamaba a
`solicitarRecuperacionRequest`, que era `await esperar(); return { correo }`
--un simulacro del prototipo--.

O sea: **nadie podia recuperar su contraseña en toda la aplicacion**, por
ninguno de los dos caminos, y las dos pantallas afirmaban que el correo iba en
camino. Nada lo delataba, porque la promesa se resolvia siempre.

Es la forma mas cara del defecto de este proyecto: no es un boton que no hace
nada --eso se nota-- sino uno que **dice que lo hizo**. Quien lo pulsa no
vuelve a intentarlo; espera.

Al conectarlo de verdad, la regla es que el fallo llegue a la pantalla. Aqui
importa mas que de costumbre: el proyecto no tiene SMTP propio, usa el servidor
compartido de Supabase con **dos correos por hora**, asi que fallar no es
hipotetico. Lo que falta para que llegue esta en `REVISAR-A-OJO.md` (58), y no
es codigo.

### Limpiar datos de prueba rompe pruebas, igual que mutar

La fila de renta corta de la 102 llevaba dias con `[prueba] Vrbo` y
`[prueba] Guesty` a la vista del cliente, asi que se limpio: los textos a null
y las banderas a su valor por defecto. Razonable, y rompio cinco pruebas en una
corrida y tres en la siguiente, todas lejos de la causa:

  · `max_huespedes = null` puso en rojo dos archivos que exigen un tope
    declarado --«expected 0 to be greater than 0»--;
  · `ocultar_numero = false` puso en rojo los tres casos de renta corta de
    `conversaciones.test.ts`, que necesitan que **alguna** vivienda se oculte
    para que «no veo la que se oculta» signifique algo.

Es el mismo accidente que ya estaba documentado para las mutaciones, por el
otro lado: da igual si el dato se estropea o si se limpia, lo que falla es que
esas pruebas **dependian de una fila que no se traen**.

Las dos veces el sintoma aparecio a once minutos de la causa y parecia un
defecto del codigo. Asi que antes de tocar una fila compartida, mirar quien la
lee --`grep` del nombre de la columna en `supabase/tests`-- y, mejor, arreglar
la dependencia: el bloque de renta corta de `conversaciones.test.ts` ahora pone
`ocultar_numero` y `ocultar_contacto` en su `beforeAll` y los devuelve en el
`afterAll`.

### Un secreto del Vault sobrevive a la fila que lo referencia

`guardar_alojamiento` nombra los secretos de forma determinista --`wifi_<unidad>`
y `puerta_<unidad>`-- y decidia crear o actualizar mirando **solo la fila del
libro**: si `wifi_password_secret` estaba vacio, creaba uno nuevo.

`vault.secrets.name` tiene indice unico. Asi que en cuanto la fila pierde la
referencia y el secreto sigue en el Vault --lo que deja cualquier `update` que
ponga la columna a null-- `create_secret` falla con «duplicate key value
violates unique constraint secrets_name_idx» y **la funcion entera aborta**: no
se guarda ni la descripcion, ni el wifi, ni nada. El anfitrion no puede volver a
poner la clave de su puerta nunca mas y lo unico que ve es un 409.

Ahora el secreto se busca **por su nombre** antes de decidir, que es lo que
corresponde con un nombre determinista: si existe se actualiza, y solo se crea
cuando de verdad no hay ninguno.

Dos cosas que deja esto:

  · **Desreferenciar no es borrar.** Una limpieza que pone la columna a null deja
    el secreto vivo, y el estado resultante es uno que la aplicacion no sabia
    manejar. Desde PostgREST no se puede tocar el esquema `vault`, asi que una
    prueba no puede limpiarlo: la funcion tiene que tolerarlo.
  · **Un archivo que pasa una vez y falla la segunda.** `alojamiento.test.ts`
    llevaba asi sin que se notara, porque en la suite otro recorrido volvia a
    dejar la referencia puesta. La comprobacion que lo delata es correr el mismo
    archivo **dos veces seguidas**.

### Un limite que solo vive en la pantalla no es un limite

`zona_comun.capacidad_maxima` se respetaba **solo en el desplegable**:
`opcionesDeAsistentes` recorta las opciones para que el titular mas sus
acompañantes no pasen del aforo, y eso tiene sus pruebas. Pero la reserva se
crea por API y la base no tenia ni `check` ni disparador: se le pidieron **200
acompañantes en una zona de 20** por PostgREST y los acepto.

Es la misma forma que las ocho casillas decorativas, con un numero en vez de un
booleano, y por eso el cruce que las encontro sirve igual aqui: **enumerar los
limites del esquema y preguntar quien los aplica**. De los trece que hay, este
era el unico con cero comprobaciones en la base y la aplicacion entera
mencionandolo.

Lo sujeta `respetar_aforo_de_zona`, con el criterio que la pantalla ya usaba --el
titular ocupa sitio-- y escuchando tambien el `UPDATE`, que es la ventana que en
este proyecto ya se quedo abierta una vez. Una capacidad vacia o en cero no
limita: en la lavanderia ese numero parece significar otra cosa y esta anotado
como duda en `REVISAR-A-OJO.md` (62).

### Un archivo que reexporta la carpeta mantiene viva una pantalla muerta

`buscar-archivos-huerfanos` da cero y aun asi habia **una pantalla entera a la
que no se podia llegar**: `AdministradorZonasScreen`, 126 lineas, con su propio
modal de zonas comunes y su propia lista --otras 190-- duplicando lo que hace
`AdministradorGestionZonasScreen`, que es la registrada.

El motivo es el barril: `screens/index.ts` la reexportaba, y eso cuenta como un
`import` que la alcanza. Su unica mencion en todo el proyecto era esa linea.

Lo comprueba `npm run pantallas`: una pantalla que la navegacion no registra es
codigo que nadie va a ver. Se admite si lo dice en su cabecera --«NO ESTA EN
USO», con el motivo y lo que haria falta para retomarla, como
`ComunidadScreen`--, que es la misma idea que los topes con su razon al lado.

Dos cosas que deja esto:

  · **Un guarda en cero no cubre lo que no mira.** Ya habia pasado con los bytes
    de control; aqui el script era correcto y el agujero estaba en la pregunta.
  · **La primera version del guarda daba diecisiete falsas alarmas** --el login,
    el perfil, la pantalla de seguridad-- porque solo miraba `component:` y las
    rutas se declaran de tres formas. Un guarda que grita en falso se acaba
    ignorando, asi que se comprueba tambien **al reves**: que lo que si esta
    registrado no aparezca en la lista.

### Un guarda con un byte de control dentro miente en verde

`buscar-estados-mudos` llevaba **dos bytes 0x08** donde tenia que decir ``:
se colaron al escribir el script desde un heredoc del shell --el mismo problema
que ya esta anotado para las comillas y las llaves-- y la regex quedo pidiendo
un backspace literal delante de «activ» y de «sel». O sea que sus dos primeras
señales **no casaban nunca**, y el script informaba «0 (tope 0)» tan contento.

Al arreglar eso y añadir la comparacion como señal --un grupo de opciones
pintado con `.map` se distingue con `algo === opcion.id`, sin ninguna de las
palabras que buscaba-- aparecieron **once** controles mudos de golpe, en once
archivos distintos: las pestañas del directorio, los filtros del chat, los dias
del plan, las insignias, las razones para eliminar la cuenta, los dos botones
del tipo de notificacion y los departamentos de la correspondencia masiva.

Dos cosas que deja esto:

  · **Un guarda en cero no prueba nada por si mismo.** Conviene comprobarlo al
    reves de vez en cuando: subirle el tope, meterle un caso a mano y ver si lo
    encuentra. Un script roto y un proyecto limpio se leen igual.
  · **Los scripts se escriben con la herramienta de escribir archivos**, nunca
    desde un heredoc. Esto ya estaba dicho para las comillas; ahora tambien por
    los bytes de control, que no se ven al leer el archivo.

Y un falso positivo que quedo resuelto de paso: `active:opacity-70` es el
pseudo-estado de NativeWind para mientras se pulsa, no un estado de seleccion.
Casaba con «activ» y marcaba un boton cuyo texto **ya dice en que estado esta**
--«Marcar Comité de Propietarios» pasa a «Quitar de Comité»--.

### Un archivo de prueba que pasa una vez y falla la segunda

La suite completa da una foto engañosa. Dentro de una corrida, un archivo que no
restaura lo que toco puede quedar **tapado** por otro que lo vuelve a dejar como
estaba, y entonces el fallo solo aparece cuando cambia el orden o cuando alguien
limpia los datos a mano.

Asi estuvo `alojamiento.test.ts`: dejaba un secreto en el Vault sin referencia, y
su segunda corrida fallaba siempre. Detras habia un defecto de produccion --el
anfitrion no podia volver a guardar la clave de su puerta-- que la suite en verde
no delataba.

`npm run repetibles` corre cada archivo **dos veces seguidas** y falla si la
segunda no pasa. No esta en `pretest` porque va contra el Supabase real y la
tanda completa tarda; se corre a mano, o por archivos:

    npm run repetibles supabase/tests/alojamiento.test.ts

Y el patron que hay que buscar al escribir una prueba nueva: un `toBeTruthy`
--o un `toBe(3)`-- sobre un dato que la prueba **no escribio**. Han aparecido
tres asi, con `max_huespedes`, con `ocultar_numero` y con el wifi del libro.

### El libro del alojamiento es lo primero que lee un huesped

`alojamiento.test.ts` restauraba la suscripcion y quitaba los secretos, pero no
devolvia `wifi_nombre`, `instrucciones` ni `notas`. Resultado: el libro de la 102
se quedaba con «[prueba] Red», «[prueba] La puerta es la segunda a la derecha» y
«[prueba] Cubo de basura los martes» --y esos tres textos son exactamente lo que
lee alguien que acaba de llegar, en «Mi alojamiento»--.

Es la tercera vez que la misma tabla aparece por esto. La 102 la tocan cuatro
archivos de prueba y cada uno restaura **lo que el mira**: ninguno esta mal por
su cuenta, y entre todos dejaban la vivienda vestida de prueba.

### El historial de migraciones se arreglo comprobando, no a ciegas

Durante dias `supabase_migrations.schema_migrations` estuvo registrado hasta
`20260922195000` mientras en el disco habia 68 migraciones posteriores, todas
aplicadas por otra via. El sintoma: `supabase db push` intentaba reaplicarlas
desde el principio y moria en la primera --«function
public.es_huesped_de_unidad(uuid) does not exist»--, porque el orden ya no era
el de entonces. Mientras siguio asi, una migracion nueva habia que aplicarla
con `psql` a mano.

`supabase migration repair --status applied` lo arregla en un comando, y por eso
mismo es peligroso: marca como aplicada cualquier cosa, incluida una que no lo
este, y entonces el hueco desaparece del registro en vez de cerrarse.

Lo que se hizo: extraer de las 68 migraciones **todo lo que crean** --314
objetos entre tablas, columnas, funciones, politicas, triggers, tipos e
indices-- y comprobar uno a uno contra el catalogo que exista. Faltaban seis, y
los seis por un motivo escrito en el propio repositorio:

  · `respetar_limites_renta_corta` y su trigger los borra
    `20260923110000_limites_son_advertencia.sql` --el bloqueo por aforo que
    contradecia al KT y hubo que deshacer--;
  · `visita_escritura`, `reserva_zona_escritura` y `correspondencia_escritura`
    las reemplazan politicas posteriores, la ultima en el mismo archivo que la
    crea;
  · `estado_correspondencia_nuevo` es un enum de paso: se crea, se convierte la
    columna y se renombra al nombre final.

Comprobado eso, se registraron las 68. `db push --dry-run` responde «Remote
database is up to date» y el historial no tiene descuadres en ninguno de los dos
sentidos.

La receta queda para la proxima vez que pase: **generar la lista de objetos y
preguntarle al catalogo**, no confiar ni en el nombre del archivo ni en el
comando que lo silencia.

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

### Despues de tocar la estructura, la suite miente un rato

El 01/10/2026 una corrida dio **26 casos rojos en 11 archivos**: correspondencia
que nadie podia leer, reportes legales que no aparecian, votos que se
desvanecian. Repartidos y sin relacion entre si, que es la forma de un fallo
grande.

No habia ninguno. Minutos antes se habian borrado y recreado dos funciones
--`reglas_de_estancia` y `ficha_alojamiento`, para añadirles dos columnas-- y
creado un disparador. PostgREST mantiene una **cache del esquema**, y mientras
esta desfasada las respuestas son raras de un modo que no se parece a un error:
listas vacias, no excepciones.

Lo que lo demostro, en este orden:

  1. **Comprobarlo a mano, fuera de la suite.** Se inserto un paquete y lo
     leyeron la administracion, la porteria y el propietario. La politica
     estaba bien, asi que el rojo no era del producto.
  2. **Correr el archivo solo, varias veces.** Tres pasadas de 18/18 sin tocar
     una linea entre medias. Un fallo real no se cura solo.
  3. **Repetir la suite entera sin tocar nada mientras corre.** 597 de 597.

Dos reglas que deja:

  · **Una corrida que empieza justo despues de un `drop`/`create` de funciones
    no cuenta.** Hay que dejar que la cache se asiente, o forzar la recarga.
  · **Antes de dar por roto medio proyecto, probar una de las cosas rotas a
    mano.** Son dos minutos y separa «el producto esta mal» de «la medicion
    esta mal», que es la diferencia entre media hora y media tarde.

Y la de siempre, que esta vez incumpli yo: **no tocar la base mientras corre la
suite.** Aquella tanda la hice consultando con `psql`, sembrando un condominio
nuevo y con sesiones de navegador abiertas, todo a la vez.

### El limite mas importante era el unico sin nadie al otro lado

El 01/10/2026, barriendo por familias, salio que **en la base habia un solo
condominio**. Las diez cuentas de prueba eran todas suyas.

La regla 7 dice que el aislamiento entre condominios es el requisito de
seguridad central. Las 563 pruebas lo comprobaban a fondo **entre viviendas** y
**ninguna habia podido comprobarlo entre edificios**, por una razon que no es
un descuido: no existia nadie de otro edificio a quien preguntarle.

Mientras tanto, **75 de las 128 politicas** y **50 funciones** deciden por
`condominio_id`, y todas respondian «si» para todo el mundo porque todo el mundo
estaba dentro. Cualquiera podia estar mal escrita y la suite seguiria verde.

Es la trampa del «caso negativo sin datos» --ya documentada aqui-- aplicada al
requisito central en vez de a un caso suelto. Y la que se rompe el dia de la
segunda venta, que es el peor momento para enterarse.

La leccion no es «faltaba una prueba». Es esta: **antes de dar por cubierto un
limite, mirar si en los datos existe alguien del otro lado.** Un limite sin
nadie enfrente no esta probado, esta sin estrenar. Y eso se pregunta a los
datos, no al codigo: `select count(*) from condominio` lo decia desde el primer
dia y nadie lo pregunto.

Ahora hay un segundo edificio sembrado --aditivo y repetible, en
`supabase/herramientas/sembrar-segundo-condominio.mjs`-- y catorce casos en
`aislamiento-entre-condominios.test.ts`, cada uno con su control positivo: que
no vea lo nuestro no prueba nada si no ve nada. Comprobados abriendo la politica
de lectura de viviendas de par en par; tres se ponen rojos.

Y el barrido de datos de prueba **no toca** `condominio`, `torre`, `unidad` ni
las membresias: esa semilla lleva la marca `[prueba]` en el nombre y aun asi es
semilla, no basura. Hay un aviso escrito en `limpieza-global.ts`.

### Un `update` de cero filas no es un error

`sembrar-segundo-condominio.mjs` creaba la cuenta y luego hacia
`from("perfil").update({ nombre, apellido }).eq("id", ...)`, con un comentario
encima que decia «el perfil lo crea un disparador al dar de alta la cuenta».

**No hay ningun disparador.** El perfil lo inserta la aplicacion al registrarse,
en `sesion.ts`. Asi que ese `update` no encontraba ninguna fila --y un `update`
de cero filas responde exito, no error-- de modo que Renata y Bruno existian
desde el 01/10/2026 **sin perfil y sin nombre**. Nada lo dijo: ni el script, que
imprimio «creada», ni las pruebas, que no miran el nombre de esas dos cuentas.

Lo que lo tapo fue el comentario, otra vez: afirmaba lo contrario de lo que
pasa, asi que al leer el archivo el asunto parecia cerrado. Es la misma forma
que «un arreglo a medias es peor si lleva comentario», con un supuesto en vez de
un camino viejo.

Se descubrio el 02/10/2026 porque la bitacora del panel de plataforma enseñaba
«Cuenta eliminada» donde tenia que ir un nombre. O sea: lo encontro una pantalla
nueva que leia un dato que nadie habia mirado nunca.

Dos cosas:

  · **Al escribir algo que tiene que existir, `insert` o `upsert`, no
    `update`.** Un `update` da por supuesto que la fila esta, y si no esta no se
    queja.
  · **Un supuesto sobre la base se comprueba en la base**, no se escribe en un
    comentario. `select tgname from pg_trigger` son dos segundos; el comentario
    duro un dia y medio y se llevo por delante los nombres de dos cuentas.

### Un rol de plataforma no es un administrador de todos los edificios

El 02/10/2026 se añadio el rol que faltaba: quien opera VeciYo. El atajo era
obvio y habria sido una linea --`or es_staff_plataforma()` en las politicas de
lectura-- y habria convertido el requisito de seguridad central del producto
(regla 7) en una bandera que lo apaga.

Lo que se hizo en su lugar: **ninguna politica nueva sobre las tablas del
dominio**. El panel pide agregados a funciones `security definer`
--`panel_condominios`, `panel_resumen`-- y la lista de lo que puede pedir es
finita y esta en un archivo. Un dato mas se añade ahi, y entonces se discute.

Las dos piezas que de verdad importan, por si se vuelve a construir algo asi:

  · **El unico hueco por el que la plataforma entra a un edificio se cierra
    solo.** `invitar_primer_administrador` existe porque `crear_invitacion`
    exige `es_admin_condominio`, y solo funciona si el edificio **no tiene
    administracion**. Uno recien creado lo esta; uno en marcha, no. Sin ese
    limite, el dueño de la plataforma podria invitarse como administrador de
    cualquier edificio con vecinos dentro y leerlo todo.
  · **Nadie se nombra a si mismo.** Va en un disparador y no en una politica,
    porque RLS no sabe comparar el valor viejo con el nuevo. El primer dueño lo
    siembra la clave de servicio --`auth.uid() is null`-- y ese es el unico
    camino de entrada a proposito: un sistema donde el primer dueño se puede
    crear desde la aplicacion no tiene dueño.

Y una trampa al comprobarlo: al mutar el disparador para ver si la prueba lo
pilla, el caso «no se puede cambiar su propio rol» **escribio de verdad** y dejo
al dueño como `soporte`. Eso puso rojos otros tres casos que no tenian nada que
ver --los que necesitan ser dueño-- y parecia que la mutacion habia roto medio
panel. Es lo que ya avisa «al mutar una politica, limpiar lo que escribio»,
aplicado a un disparador.

### Una columna que existe y nadie escribe es una funcion a medio construir

Van cuatro casos iguales y conviene mirarlos juntos, porque la forma se repite:

  · `ocultar_contacto` — la base la respetaba, ningun sitio la encendia.
  · `tiene_tutela` — se lee en el repositorio y no la pinta ninguna pantalla.
  · `suscripcion_renta_corta.ical_url` — el anfitrion lo guardaba y **nadie lo
    leia**: su calendario no estaba conectado a nada.
  · `invitado.auto_registro` y `invitado.precheckin_token_hash` — creadas el
    25/09 **con comentarios que describen un flujo entero** (el acompañante que
    se registra solo) y cero funciones que las escriban. La ruta de la web
    existia y llevaba a una maqueta con `setTimeout`.

Y el reverso, que es peor: `checkin_desde` y `checkin_hasta` se leian en **tres**
sitios --el huesped las ve, el edificio las limita-- y las columnas **ni
siquiera existian**: se perdieron al fusionar dos tablas en septiembre. La
funcion que las escribia se creo encima y la migracion no dijo nada, porque
plpgsql no comprueba el cuerpo al crear, sino al ejecutar.

Lo que deja:

  · **Antes de construir algo, mirar si ya esta a medias.** Cuatro de las cinco
    tandas de esta semana empezaron encontrando la mitad hecha. Un `grep` de la
    columna en `src/` y en `supabase/` cuesta diez segundos.
  · **Una columna con comentario y sin escritor es una promesa, no una
    funcion.** Si no se va a construir ahora, el comentario tiene que decirlo.
  · **Y despues de crear una funcion, llamarla.** Aplicar la migracion sin error
    no prueba que funcione; para plpgsql no prueba casi nada.

### Un defecto que se repite se enumera, no se busca

El 01/10/2026 el cliente lo dijo sin rodeos: «todo el rato salen errores y
errores y errores, no entiendo por que, no tienes un buen metodo?». Tenia
razon, y el problema no era que aparecieran --el prototipo era una maqueta con
todo en memoria, asi que al migrar a un backend real iba a quedar basura-- sino
**como aparecian: de uno en uno, al tropezarse con ellos**.

Ese es el patron que funciona en este proyecto, y ya estaba: cada familia de
defecto, cuando se repite, pasa de buscarse a enumerarse. Las casillas
decorativas se encontraron cruzando las 65 columnas booleanas del esquema con
quien las lee. Los `any` salieron de `npm run selects`. Los botones muertos, de
`npm run botones`. Las pantallas inalcanzables, de `npm run pantallas`.

El que faltaba era el mas caro de todos: **el servicio que finge**. Todos
tienen la misma forma --un `setTimeout` que imita la latencia y un store de
Zustand en vez de una tabla-- y habian ido saliendo a lo largo de semanas: el
correo de recuperacion que nadie enviaba, los residentes de una vivienda, la
carga masiva de pagos, «Administrar mis ubicaciones» entera. Cada uno costo una
tarde de recorrer pantallas.

`npm run fingen` los enumera. Al escribirlo quedaban **dos** en todo el
proyecto, y uno estaba documentado como hueco conocido. O sea que la pregunta
«cuantos quedan» tenia respuesta desde el principio, y nadie la habia hecho.

La regla: **a la segunda vez que un defecto aparece con la misma forma, se deja
de buscar y se escribe el guarda.** No por disciplina: porque convierte «van a
seguir saliendo» --que es insoportable para quien paga-- en una lista finita con
su marca, que es una respuesta.

Y el guarda se comprueba plantandole un caso, que ya paso que uno llevaba meses
informando «0» con dos bytes de control dentro.

## 12. Estilo

- Un archivo por componente. Nada de componentes escritos en una sola línea.
- Pantallas por encima de ~400 líneas se dividen; la lógica va a hooks.
- Comentarios solo donde el *porqué* no es evidente. El *qué* lo dice el código.
- Commits: `tipo(ámbito): descripción` en minúsculas.

### Un `catch` que comprueba `instanceof Error` tira el motivo

El error que devuelve Supabase es un **objeto plano** --`{ message, details,
hint, code }`--. No hereda de `Error`. Asi que esto, que estaba en las siete
pantallas de la web:

    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos ...') }

nunca enseñaba el motivo. **Ni una sola vez.** Daba igual lo que fallara: el
huesped leia «No pudimos guardar tus datos».

Lo caro no es el mensaje feo. `cerrar_precheckin` se esfuerza en nombrar a quien
falta --«Falta que acepten los terminos: Diego Ortiz. A cada uno le llega su
propio enlace»-- precisamente para que el titular pueda actuar. Tirarlo
convierte un problema con solucion en una pared. Y es exactamente lo que vio el
cliente el 02/10/2026 con el 409: el motivo venia en la respuesta.

No lo ve ninguna prueba. El typecheck pasa --`e` es `unknown` y la ternaria es
valida--, la llamada falla como debe, y el camino del exito, que es el que
prueban los recorridos, no pasa por el `catch`. Salio **pulsando el boton**.

Lo cuenta `npm run motivos` en la web, con la marca en cero y enganchado al
`build`, asi que un despliegue con uno nuevo no sale. Lo que hay que usar es
`porQueFallo(e, 'texto por defecto')`.

La regla general: **el camino del fallo tambien se recorre.** Un `catch` solo se
ejecuta cuando algo va mal, o sea nunca mientras se prueba lo que funciona, y
ahi es donde se esconden los mensajes que no dicen nada.

### Una funcion desplegada no es una funcion llamable

Una funcion de Supabase a la que llama una pagina web necesita responder al
`OPTIONS` **antes** que nada. El navegador lo manda siempre que la peticion
lleva `Content-Type: application/json` o una cabecera de autorizacion, que son
todas las de este proyecto. Si la funcion contesta «Metodo no permitido» --que
es lo que hace cualquier `if (req.method !== "POST")`-- la llamada muere ahi.

Y muere de la peor forma: lo que llega al codigo es `Failed to fetch`, **sin
estado, sin cuerpo y sin motivo**. No se parece a un problema de permisos; se
parece a que no hay internet.

Estaban asi **las seis funciones del proyecto**. Entre ellas:

  · `subir-documento-precheckin`, que se dio por resuelta el 02/10/2026 --se
    escribio, se desplegio, se reviso la logica, se documento en el commit-- y
    **nunca llego a subir una foto desde el navegador**, que es el unico sitio
    desde el que alguien la sube;
  · `reportar-tra`, `reportar-sire`, `enviar-correo` y `sincronizar-calendario`,
    o sea el reporte al ministerio, el correo y el calendario de Airbnb.

Lo que lo tapo tiene nombre y ya estaba escrito en este archivo: **los
recorridos corren en Node**, y en Node no hay preflight. Las pruebas llamaban a
las funciones y respondian bien. Lo que no se puede hacer desde Node es la unica
cosa que importaba: ser un navegador.

Salio el 03/10/2026 al primer intento de subir la autorizacion de un menor desde
la pantalla. Lo cuenta `npm run cors`, con la marca en cero y en `pretest`.

Y la leccion general, que no es sobre CORS: **una pieza de servidor probada por
donde no se usa no esta probada.** Si quien la va a llamar es un navegador, la
comprobacion es pulsar el boton; cualquier otra cosa mide otra cosa.

### Una tabla que apunta dos veces a la misma rompe el `select` entero

`autorizacion_menor` referencia a `invitado` **dos veces**: el menor de quien es
el permiso, y el adulto que lo firma. Las dos tienen sentido y las dos hacen
falta.

Al traerla en `SELECT_VISITA` --`autorizacion:autorizacion_menor ( id )`--
PostgREST no eligio: respondio «Could not embed because more than one
relationship was found» y **la consulta entera** devolvio 300. Doce casos rojos
en seis archivos, todos los que leen una visita, repartidos de un modo que se
parece a haber roto medio proyecto.

No lo ve el typecheck: el tipo se deduce del esquema generado, donde la
ambiguedad no existe. Lo delata la suite, y antes que ella `npm run test:rls
supabase/tests/consultas-de-la-app.test.ts`, que existe justo para eso --corre
contra la base las consultas reales de la aplicacion--.

La relacion se nombra: `autorizacion_menor!autorizacion_menor_invitado_id_fkey`.

Dos cosas mas que dejo:

  · Es hermano de «una columna nueva puede romper una funcion sin tocarla»: la
    tabla se creo correcta, la consulta se rompio despues.
  · El comentario que explicaba esto se escribio **dentro** del `select`, que es
    un *template literal*. Ahi dentro no es un comentario: es texto que viaja a
    PostgREST. Y encima llevaba acentos graves, que cerraron la cadena. Lo que
    explica una consulta va fuera de la consulta.

### La primera tarea periodica del proyecto, y lo que hubo que decidir

Hasta el 03/10/2026 **no habia ni una sola tarea automatica en todo el
proyecto**. Ni `pg_cron`, ni flujos programados, nada. Lo que faltaba no era el
dato --`precheckin_completado_en is null` y `fecha_desde` estaban desde el
principio-- ni el canal --`enviar-correo` existia--: faltaba **quien
preguntara**.

Tres decisiones que conviene no repensar desde cero la proxima vez:

  · **El «a quien avisar» va separado del «mandar».** `precheckins_por_recordar`
    no manda nada: devuelve la lista. Asi se puede mirar --y probar-- a quien se
    iba a avisar sin mandar un solo correo. Un cron que solo se puede comprobar
    mandando correos de verdad no se comprueba nunca, y los once casos del
    recorrido salen de eso.
  · **`pg_net` es asincrono, asi que la constancia se escribe antes de saber si
    el correo llego.** Es deliberado: si se esperase la respuesta, un servidor
    de correo lento bloquearia la transaccion y el resto de avisos de esa pasada
    no saldrian. Vale mas no repetir un aviso que perderlos todos.
  · **Un intento fallido tambien deja fila.** Sin eso, un correo mal escrito se
    reintenta una vez al dia hasta la llegada.

Y la parte que no es tecnica: **el recordatorio al huesped le emite un enlace
nuevo y anula el anterior**, porque el viejo no se puede recuperar --en la base
vive solo su sha256--. Eso no se podia decidir por cuenta propia, se pregunto, y
la respuesta fue «parametrizable, que el anfitrion elija». Esta en
`suscripcion_renta_corta`, por vivienda, con 7/3/1 por defecto.

### `accessibilityState` no llega al DOM: hay que poner tambien el `aria-*`

React Native Web **no traduce** `accessibilityState` a los atributos ARIA. Un
control con `accessibilityRole="checkbox"` y `accessibilityState={{ checked }}`
sale al DOM con su `role` y su `aria-label` y **sin `aria-checked`**: el estado
existe solo en el color, y quien use un lector de pantalla no ve cuales estan
puestos.

Ya estaba escrito en `Checkbox.tsx`, con el motivo al lado, y aun asi volvio a
pasar al escribir los botones de dias del recordatorio. Dos veces la misma cosa:
primero con `selected` --que no se traduce a nada-- y despues con
`accessibilityState={{ checked }}` --que tampoco--.

Se ponen **los dos**: `aria-checked={valor}` y `accessibilityState={{ checked }}`.
El primero es lo que llega al navegador; el segundo, lo que entiende React
Native en el telefono.

Y lo que lo delata es **mirar el DOM en el navegador**, no leer el codigo:
`[...document.querySelectorAll('[role="checkbox"]')].map(e => e.getAttribute('aria-checked'))`.
`npm run estados` da cero igual, porque mira que el control **tenga** una señal
de estado, no que esa señal llegue a alguna parte.

### Antes de arreglar algo que parece roto, comprobar que lo esta

El 03/10/2026 busque la pantalla de permisos del administrador para recorrerla.
No la encontre, mire quien navega a ella, y la unica mencion estaba en
`CONFIG_ADMIN_OPCIONES` --una constante que, segun mi `grep`, no usaba nadie--.
Conclusion: cuatro pantallas enteras del administrador inalcanzables.

**Era falso.** La cadena tiene tres eslabones: `constants.ts` →
`useViviendaResumen` → `ViviendaResumen`, que las pinta en un desplegable de la
pantalla de Vivienda. Mi busqueda miro el primero y se detuvo.

Lo que costo: un panel duplicado en el Home que hubo que deshacer, y un guarda
nuevo que tampoco servia --daba cero con el defecto plantado y sin el, porque
comprobaba que la constante se mencionara en otro archivo y eso se cumple
igual--. Se borro: **un guarda que no se pone rojo al plantarle el caso es peor
que ninguno**, porque da seguridad falsa. Eso ya estaba escrito aqui y aun asi
estuve a punto de entregarlo.

Dos cosas:

  · **Lo que se busca con `grep` se confirma pulsando.** Dos minutos en el
    navegador habrian ahorrado todo esto: la pantalla estaba a dos clics.
  · Y el de siempre, por tercera vez: al escribir el guarda se colo un **byte
    de control** en `new RegExp(`\b${simbolo}\b`)` por hacerlo desde un
    heredoc. Los scripts se escriben con la herramienta de escribir archivos.
    Esto ya esta documentado dos veces mas arriba.

### Una prueba que mide con otro reloj se rompe sola, tambien por el dia

Ya estaba escrito para la hora --`reserva_no_en_el_pasado`-- y volvio a pasar
con el dia. El 04/10/2026 a las 00:30 UTC, que en Colombia eran las 19:30 del
dia 3, seis casos de `el-preregistro-que-nadie-termina-avisa` se pusieron rojos
sin que nadie tocara una linea: la prueba componia «dentro de 7 dias» con el
reloj de la maquina --dia 3-- y la base contaba desde `current_date`, que ya
era 4. La estancia estaba a 6 dias y no coincidia con ningun hito.

El sintoma es el de siempre: todo verde durante horas y de golpe medio archivo
rojo, con mensajes que no mencionan ninguna fecha.

La regla, ampliada: **si la regla cuenta dias con `current_date`, la prueba
pregunta por `current_date`.** PostgREST no lo expone suelto, asi que se
inserta una fila de usar y tirar y se lee el `created_at` que pone la base.

Y conviene mirar `isoEnDias` del arnes antes de usarlo para esto: compone con
los componentes **locales** de `Date`, que es lo correcto para una fecha que
solo viaja al formulario y lo contrario de lo que hace falta para comparar con
el servidor.

### `revoke execute ... from authenticated` no revoca nada

Postgres concede `EXECUTE` de toda funcion nueva a **PUBLIC**, y `anon`,
`authenticated` y `service_role` son miembros de PUBLIC. Asi que esto, que es
lo que habia escrito en dos migraciones de septiembre:

    revoke execute on function public.lo_que_sea(...) from anon, authenticated;

retira una concesion **directa que nunca existio** y deja intacta la de PUBLIC.
El permiso sigue ahi. El catalogo lo dice sin rodeos --`proacl` conserva
`=X/postgres`, que es PUBLIC-- y la funcion se sigue pudiendo llamar por
PostgREST con la sesion de cualquiera.

Habia tres funciones escritas **a proposito** sin comprobar quien pregunta,
porque cada una tiene delante su hermana publica que si lo hace:

  · `anotar_verificacion` --la peor-- descuenta una verificacion de
    antecedentes **de pago** y anota la constancia «SIN mirar quien la pide»,
    dice su propio comentario. Cualquiera con sesion podia gastarle el saldo a
    otra vivienda y dejar una verificacion firmada contra el invitado que
    quisiera;
  · `consumo_verificaciones_de` enseña el saldo de una vivienda ajena;
  · `viviendas_de_en` dice donde vive cualquiera, de cualquier edificio.

El unico limite entre las dos mitades era el `revoke`, y el `revoke` no
revocaba. Lo cierra `20261005130000`.

Tres cosas:

  · Se revoca **de `public`** --`from public, anon, authenticated`-- y despues
    se concede directo a `service_role`, que es miembro de PUBLIC y lo
    necesita: la clave de servicio siembra y la usan las herramientas.
  · `security definer` no es el problema. El proyecto tiene decenas y la
    mayoria son publicas a proposito, porque comprueban `auth.uid()` por
    dentro. Lo que hay que revocar es la que **no pregunta quien llama**.
  · Lo comprueba `funciones-internas-no-son-publicas.test.ts`, y es behavioral
    porque PostgREST no deja consultar `pg_proc`: llama a cada una con la
    sesion de la vecina y exige **403 con «permission denied»**, no solo que
    falle. Con un uuid inventado, `anotar_verificacion` tambien reventaria por
    dentro, y eso se leeria como un exito de la revocacion.

Salio escribiendo el caso «nadie puede preguntar donde vive nadie» para una
funcion nueva: la llamada con sesion de vecina **funciono**, y al mirar las
otras dos, iguales. O sea que lo encontro una prueba escrita para otra cosa.

### Un centinela dentro de un campo acaba escrito en la pantalla

`MensajeChat.de` significaba dos cosas: el nombre de quien escribio y, cuando
el mensaje era propio, el literal `"yo"`. Con eso se decidia a que lado va la
burbuja.

En una conversacion de dos no se nota, porque el nombre del autor no se pinta.
En un **grupo** si: el autor de los mensajes propios salia escrito **«yo»**, en
minuscula, al lado de su depto. Lo vi el 05/10/2026 escribiendo un mensaje en
el grupo de residentes desde el navegador.

Es la familia de «un dato no se guarda ya formateado», con un centinela en vez
de un separador. El typecheck pasa --los dos son `string`--, el recorrido
pasaba --comprobaba justamente que el ajeno **no** fuera `"yo"`, o sea daba el
centinela por bueno-- y ninguna prueba de componente montaba un grupo.

`de` es el nombre, siempre, y `esMio` es un booleano aparte. Y el recorrido
tiene ahora las dos mitades: el ajeno con `esMio: false` y **el propio con
`esMio: true`**, que es lo que faltaba --sin el, la bandera escrita a fuego
pasaria igual--.

### Una politica de SELECT que esconde lo borrado impide borrarlo

`mensaje_baja_propia` existe desde el 22/09/2026 con su comentario: «Solo para
fijar `deleted_at`». Y resulta que **nadie podia retirar un mensaje, ni el
suyo**: el `update` respondia

    new row violates row-level security policy for table "mensaje"

con la politica correcta --`autor_id = auth.uid()` en el `using` y en el `with
check`-- e incluso con la politica sustituida por `with check (true)`.

La culpable era la de **lectura**:

    create policy mensaje_lectura on public.mensaje for select
      using (deleted_at is null and public.puede_ver_conversacion(...));

Postgres aplica las politicas de SELECT como *with check option* sobre la fila
**nueva** de un UPDATE. Poner `deleted_at` hace que la fila nueva deje de pasar
esa politica, asi que el borrado logico **se rechaza a si mismo**. El error no
menciona la lectura en ninguna parte --`ExecWithCheckOptions` y se queda ahi--
asi que se busca en la politica de escritura, que esta bien.

No es de este proyecto: le pasa a cualquier tabla con borrado logico y RLS.

Dos salidas: relajar la lectura --y entonces lo retirado se sigue leyendo, que
es lo contrario de retirarlo-- o que el borrado pase por una funcion `security
definer` que compruebe el permiso ella misma. Se hizo lo segundo, que es el
patron que el proyecto ya usaba en `verificar_antecedentes` ->
`anotar_verificacion`.

Como se encontro, y es lo reutilizable: **se sustituyo el `with check` por
`true`**. Si sigue fallando, el problema no esta en esa politica. Dos minutos y
separa «mi politica esta mal escrita» de «hay otra cosa».

### Una restriccion `NOT VALID` deja filas que no se pueden editar

`perfil` tiene `check (codigo_pais is null or codigo_pais ~ '^[A-Z]{2}$')`
creado **NOT VALID**. Sofia tenia `+57` --de antes de `CampoTelefono`, cuando
el prefijo y el codigo de pais eran lo mismo para la pantalla-- y eso
significaba que **su perfil no se podia modificar en absoluto**: ni el nombre,
ni el telefono, ni el alias, ni una preferencia.

`NOT VALID` no comprueba las filas que ya estaban --para eso se usa, y esta
bien-- pero **cualquier UPDATE posterior sobre esa fila si la comprueba**,
aunque no toque esa columna. Y el error nombra una columna que quien guarda no
ha tocado.

Sofia es la vecina de la 102 y la anfitriona de la renta corta: la cuenta que
mas aparece en las pruebas y en las demostraciones.

La regla: **una restriccion `NOT VALID` que nadie valida nunca es una bomba con
temporizador.** Se corrige el dato y se ejecuta `validate constraint`, que falla
si queda alguna fila mala. Que pase es la prueba de que no queda ninguna, y de
ahi en adelante el dato malo se rechaza al escribirlo, que es donde se entiende.

Para encontrarlas:

```sql
select conrelid::regclass, conname from pg_constraint
where contype = 'c' and not convalidated;
```

### A veces el guarda no se puede escribir, y hay que decirlo

«A la segunda vez que un defecto aparece con la misma forma, se escribe el
guarda». El 05/10/2026 aparecio la tercera de una familia --funciones internas
con `execute` concedido a `authenticated`-- y el guarda **no se pudo escribir**.

La pregunta es «funcion `security definer` que escribe y no comprueba quien
llama». En este esquema da **ochenta** candidatas, y la mayoria son correctas:
comprueban a traves de un ayudante --`es_admin_condominio`-- o se autentican
con un token, que es como entra el huesped, que no tiene cuenta. Al afinarlo a
las nueve que escriben, las nueve «parecian» comprobar algo.

Y `notificar_unidad` --la que de verdad estaba abierta-- salia entre las buenas
por la columna `m.puede_acceder`: leer una columna llamada `puede_*` es
indistinguible, para un `grep`, de llamar a `puede_coadmin`.

Un guarda asi da cero con el agujero dentro, que es **peor que ninguno**. Ya
paso con `buscar-pantallas-sin-camino`, que se borro por lo mismo.

Lo que se hizo en su lugar: una lista escrita a mano en
`funciones-internas-no-son-publicas.test.ts`, que **llama a cada una** con la
sesion de la vecina y exige 403 con «permission denied», con su control
positivo al lado. Cinco van. Cada una nueva se añade ahi.

La regla completa, entonces: a la segunda vez se intenta el guarda, y si la
señal no se puede separar del ruido **se dice y se escribe la lista**. Lo que no
se hace es entregar un contador que no distingue.

### Una fecha que viene del reloj del telefono no se compara con `now()`

`crearAnuncio` manda `publicada_desde: new Date()`, o sea el reloj **del
dispositivo**. La primera version del aviso al publicar comparaba
`publicada_desde > now()` para decidir si estaba programado, y **no avisaba
nunca**: la maquina iba 1,3 segundos por delante del servidor, asi que
«publicar ahora» quedaba en el futuro y el aviso se quedaba esperando al cron
del dia siguiente.

No es un detalle de la prueba. La fecha la pone el telefono de quien publica:
un movil un minuto adelantado --que es lo normal-- publica un anuncio que no
avisa, y quien lo publico no tiene forma de saber por que.

La regla: **un dato que llega del cliente no se compara con el reloj del
servidor al segundo.** Si lo que el formulario pide es una fecha --y
`CampoFecha` pide una fecha-- la comparacion es por **dia**, y con el reloj del
edificio, que es con el que cuentan el resto de las reglas del proyecto
(`zona_horaria_del_condominio`). Vive en `ya_es_su_dia`, una sola vez, porque
la miran cuatro sitios: la visibilidad, el aviso al publicar, la pasada diaria
y el indice.

Es la hermana de «una prueba que mide con otro reloj se rompe sola», en codigo
de produccion en vez de en una prueba.

### Una funcion `invoker` no puede llamar a una interna

`corregir_publicacion` nacio `security invoker` a proposito, para que decidiera
la politica `publicacion_cambio`. Y fallaba: «permission denied for function
avisar_de_la_publicacion».

El aviso es interno --no se concede a nadie, porque si no cualquiera podria
mandar notificaciones con el texto que quisiera-- y una funcion `invoker` corre
como quien la llama, asi que no lo alcanza.

O sea que la eleccion no es libre: **en cuanto una funcion publica necesita
llamar a una interna, tiene que ser `definer` y comprobar el permiso ella
misma.** Y la comprobacion tiene que ser **la misma** que decia la politica
--aqui `es_admin_condominio`-- porque la politica deja de intervenir.

Es el mismo sitio al que se llego con `retirar_mensaje`, por otro camino. Dos
veces en la misma tanda.

### Conectar un aviso llena la bandeja de basura de prueba

Desde que publicar un anuncio **notifica**, cada anuncio que crea una prueba
deja una fila de `notificacion` por cada vecino de la audiencia: tres por
anuncio, y entre `anuncios.test.ts` y `votacion.test.ts` hay una docena de
anuncios. La primera corrida despues de conectarlo dejo **41 avisos** en la
campana del cliente.

Y borrar el anuncio no se las lleva: `notificacion.entidad_id` **no es una
clave foranea** --apunta a tablas distintas segun el motivo-- asi que quedan
huerfanas, y huerfanas se ven igual.

Es exactamente lo que ya paso con `anotaciones_ingreso`, que el barrido no
miraba. La leccion generalizada: **al conectar algo que escribe en una tabla
que las pruebas no limpiaban, el barrido global crece con ella.** Antes de dar
por hecha la conexion, contar las filas de esa tabla antes y despues de una
corrida.

### Dos reglas en orden tapan la segunda, y la prueba pasa por la razon mala

`reconocimiento_con_medida` comprueba dos cosas en orden: que quien recibe viva
en el edificio, y que quien da no haya dado ya su reconocimiento del mes. El
caso «no se le puede dar a un huesped temporal» esperaba el primer mensaje y
recibia el segundo --«Ya diste tu reconocimiento de este mes»-- porque Marcela
tenia dos reconocimientos del 02/10/2026, de antes de que la regla existiera.

El `rejects.toThrow(/vive en el edificio/i)` lo detecto. Un `rejects.toThrow()`
sin patron habria pasado en verde durante meses: la llamada falla, solo que por
otra cosa.

Y debajo habia un segundo error que se tapaba con el primero: el caso elegia
**el primer huesped que hubiera** --`rol = 'huesped_temporal' limit 1`-- y el
primero es Laura, que ademas es residente de la 205. O sea que
`es_vecino_del_condominio` decia que si, con razon, y el caso no comprobaba
nada de lo que dice comprobar. Es «la primera fila que haya es una cita a
ciegas» aplicado a una persona.

Tres cosas:

  · **un `rejects.toThrow` lleva patron**, siempre. Es lo unico que distingue
    «fallo por lo que digo» de «fallo»;
  · cuando una funcion comprueba varias reglas, la prueba de la segunda
    **tiene que traerse** el estado que deja pasar la primera;
  · y al elegir a una persona por su rol, elegir a quien **solo** tiene ese
    rol, y comprobarlo. Tomas existe para eso y lo dice su comentario en
    `CUENTA`; el caso no lo usaba.

### Una prueba que cuenta filas marcadas se trae su propio cero

El primer caso del mismo archivo cuenta las filas con `motivo = MARCA` y espera
una. Una corrida anterior murio a mitad y dejo la suya, asi que la siguiente
conto dos y el rojo salio en el caso de arriba, que estaba bien.

El `afterAll` borraba solo los ids que habia apuntado, y el caso que falla no
llega a apuntar el suyo. Ahora el `beforeAll` borra por la marca antes de
empezar --y el `afterAll` tambien, por si acaso--: una prueba que cuenta se
trae su propio cero.

### Una respuesta que da algo por hecho no es un encargo de construirlo

Al preguntarle al cliente que pasa si se corrige un anuncio ya publicado,
eligio «avisar del cambio solo si se pide». Razonable, y presupone que
corregir existe. **No existia**: un anuncio se publicaba y se borraba.

Lo construi --boton, formulario de correccion, funcion en la base, siete casos
de prueba-- y me lo zanjo en una linea: «pero si no habia lo de corregir
anuncio, pues no lo pongas». Y tenia razon: lo que habia pedido era que
publicar avisara, y eso no lo necesita.

Lo correcto habria sido lo que de hecho hice al descubrirlo --decir «corregir
no existe»-- y **pararme ahi**, en vez de decirlo y construirlo igual en la
misma tanda. Una pregunta cuya respuesta presupone una funcion que no existe se
contesta diciendo que no existe; si hay que construirla, lo dice el cliente.

Y un corolario para el reves: al retirarlo, se retira **lo que yo añadi**. La
politica `publicacion_cambio` existe desde el primer dia y la usa
`publicar_resultados`: esa se queda.

### `create or replace` con otro numero de argumentos deja la vieja viva

`avisar_de_la_publicacion(uuid, boolean)` se simplifico a `(uuid)`. Un `create
or replace` con menos argumentos **no reemplaza**: crea una sobrecarga nueva y
la de dos se queda. Y entonces el `comment on function` sin lista de argumentos
falla con «function name is not unique», a mitad de la migracion.

Dos cosas: la vieja se borra a mano --`drop function ... (uuid, boolean)`-- y
un `comment on function` lleva **siempre** la lista de argumentos, aunque hoy
no haya sobrecarga, porque el dia que la haya la migracion se rompe por el
comentario.

### Un `&&` sobre una cadena pinta la cadena vacia dentro del `View`

El cliente lo vio en la consola del navegador el 05/10/2026:

    Unexpected text node: . A text node cannot be a child of a <View>.

Un `View` no pinta texto --solo un `Text` sabe-- asi que en web avisa y en el
telefono **revienta**. Y el mensaje no dice que buscar: lo que va antes del
punto es el nodo de texto, y aqui esta **vacio**.

Casi nunca es `<View>Hola</View>`, que se ve a simple vista. Es esto:

    {subtitulo && <Text>{subtitulo}</Text>}

Si `subtitulo` es `""`, `"" && ...` vale `""`, y React pinta esa cadena vacia
como un nodo de texto. O sea que **el aviso solo sale cuando el dato esta
vacio**, que es justo el caso que nadie prueba. Con un booleano no pasa:
`false` no se pinta.

Habia **49** asi. Ninguna herramienta los veia: el typecheck no distingue
--`ReactNode` admite una cadena-- las pruebas de componentes solo montan los
que tienen prueba, y un `grep` da ciento cincuenta candidatos indistinguibles.

Lo cuenta `npm run texto`, con la marca en cero y en `pretest`. Usa el
**compilador de TypeScript** y no una expresion regular, porque la pregunta es
«¿el tipo de lo que va a la izquierda del `&&` admite `string`?» y eso solo lo
sabe quien conoce los tipos. Tarda siete segundos.

Dos cosas que deja:

  · **El arreglo no es siempre el mismo.** `Boolean(x) && ...` sirve en la
    mayoria, pero **pierde el estrechamiento de tipos**: en seis sitios el
    typecheck empezo a quejarse de que lo de dentro podia ser `undefined`.
    Ahi va la ternaria --`{x ? <E/> : null}`--, que no pinta nada cuando el
    valor falta y ademas estrecha.
  · **La cadena vacia cuenta.** La primera version del guarda se salto
    `{""}` --«si esta vacia no pinta nada»-- y es falso: React la pinta igual.
    Se vio plantandola en una tarjeta de visita y leyendo la consola, que dio
    el mensaje del cliente palabra por palabra.

### Un caso puede detectar una regla y no detectar la otra, segun cuando corre

`pendientes_votacion` contaba quien falta por votar **por persona**: sacaba una
vivienda de la lista cuando su propietario habia votado, aunque fuera por la
otra. Se cambio a por vivienda, y el caso que lo comprobaba --«se cuenta por
vivienda, no por persona»-- **no se puso rojo al revertirlo**.

El motivo: el caso corria al final, con Guillermo habiendo votado por sus dos
viviendas. Con las dos votadas, las dos versiones de la funcion dan **la misma
respuesta**. La diferencia solo existe en el estado intermedio: una votada y la
otra no.

Movido ahi, la mutacion lo pone rojo.

La regla: **un caso que comprueba una regla de recuento tiene que correr en el
estado donde las dos versiones difieren**, y eso casi nunca es el estado final.
Y se averigua de la unica forma que vale: mutando y mirando si se pone rojo.
Pasar en verde al mutar no quiere decir que la regla este bien; quiere decir que
el caso esta en el sitio equivocado.

### Un componente compartido escrito y enchufado en un solo sitio

`CampoTelefono` se escribio el 03/10/2026: un campo compuesto con selector de
pais, buscador y los prefijos de veintisiete paises. Y se enchufo en **una**
pantalla. Las otras siete siguieron con un `Input` de texto pelado durante dos
dias, con marcadores de ejemplo que decian «+593 999999999» --Ecuador, de
cuando el prototipo se copio de otro sitio--.

Debajo habia algo enumerable: **nueve columnas `codigo_pais*` que existen y
nadie escribia**. Solo `perfil.codigo_pais` tenia quien la llenara.

No lo ve ningun guarda de los que hay. `huerfanos` cuenta archivos sin
`import`, y este si lo tiene --desde la pantalla que lo usa--. `botones` cuenta
controles sin `onPress`. Y el typecheck no distingue un `Input` de texto de un
campo compuesto: los dos compilan.

La pregunta que si lo encuentra es la de siempre, cruzar el esquema con quien
lo escribe: **para cada columna, quien la rellena**. Diez segundos de `grep` por
el nombre de la columna en `src/`.

Dos cosas mas que dejo:

  · **Un componente nuevo no esta terminado hasta que sustituye a todos los
    que hacia su trabajo.** Si no se puede en la misma tanda, la lista de los
    que faltan se escribe, porque si no queda un componente bueno y siete
    sitios malos, y nada lo dice.
  · **El atajo `update(datos)` con el objeto del formulario** exige que cada
    campo se llame **igual** que su columna. `codigoPais` no es `codigo_pais`,
    y un campo que no coincide no da error: se ignora en silencio. Columna a
    columna, siempre.

### Separar un prefijo de un numero es adivinar, salvo cuando hay un `+`

Al pasar los telefonos al formato nuevo habia ocho filas con el prefijo dentro
--«+57 310 5551001»-- y el pais en null. Se separan, porque si no el campo
nuevo abre con el pais por defecto **y** el numero entero, y al marcar sale
«+57 +57 310...».

Pero solo donde el `+` lo deja sin duda. Habia un `591646461949` que podria ser
Bolivia --prefijo 591-- o un numero local que empieza por 591, y no hay forma
de saberlo. Ese se queda como esta: adivinar sobre un dato del cliente es peor
que dejarlo a medias y decirlo.

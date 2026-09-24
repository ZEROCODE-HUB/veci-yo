# Recorridos: la lista de lo que tiene que funcionar

Este archivo es la definición de "terminado" y la memoria del trabajo
autónomo. **Se actualiza en cada tanda**: si un recorrido pasa a verde, se
marca aquí antes de commitear.

## Por qué existe

`npm run typecheck`, `npm test` (71) y `npm run test:rls` (360) pasaban todos
mientras la aplicación estaba rota. Ninguno recorre un flujo como un rol: las
de RLS comprueban políticas fila a fila, las unitarias comprueban funciones
puras, y el typecheck no sabe si un botón hace algo.

Todos los defectos que encontró el cliente el 24/09/2026 salieron de **caminar
un flujo**: el huésped reserva la lavandería y el 403 aparece al guardar los
acompañantes; el guardia registra entrada y salida y el estado no se mueve; el
botón de llamar no tiene número porque nadie lo lee de la base.

Un recorrido es una prueba que abre sesión como un rol y ejecuta **las
funciones del repositorio de la app**, no HTTP crudo: así se comprueba el
camino que recorre la aplicación de verdad, incluido el mapeo de datos.

## Estado

Leyenda: `[ ]` sin prueba · `[~]` prueba escrita, en rojo · `[x]` en verde

### Huésped temporal
- [x] Acepta la invitación y queda con membresía vigente
- [x] Ve el libro del huésped (wifi, puerta) mientras la estancia dura
- [x] **No** lo ve cuando la estancia venció (control negativo: Ramiro)
- [x] Con reserva pero sin llegar: ve la ficha, **no** las claves (Nadia)
- [x] Reserva una zona de estancia corta **y apunta acompañantes**
- [x] No reserva una zona que no admite estancia corta
- [x] No reserva fuera de su estancia (control: Ramiro, vencida)
- [x] Nadie reserva una fecha que ya pasó, contando el día donde está el edificio
- [x] Cancela su propia reserva, no la del propietario
- [x] Ni la de otro huésped de la misma vivienda

### Anfitrión (propietario / inquilino líder)
- [x] Configura el alojamiento de renta corta y lo vuelve a leer igual
- [x] Invita a un huésped y la invitación llega a la base
- [x] Acepta los T&C por excepción y queda registrado quién
- [x] Pide la verificación de antecedentes y descuenta del saldo
- [x] Compra un paquete cuando se acaban
- [x] Reporta el TRA de entrada y el de salida
- [x] Y **no** antes de que portería confirme el ingreso
- [x] Ve y gestiona a los residentes de su vivienda
- [x] Y una casilla de visibilidad apagada se respeta **en otra sesión**

### Guardia
- [x] Ve las visitas del condominio, no las de una unidad suelta
- [x] Registra la entrada de un invitado y la visita pasa a `ingresada`
- [x] Registra la salida y la visita pasa a `finalizada`
- [x] Y deshace una llegada apuntada por error: vuelve a `programada`
- [x] Tiene a quién llamar: el contacto sale de la vivienda
- [x] Anuncia la visita y queda con actor y hora
- [x] Verifica el documento de un invitado
- [x] Asigna un estacionamiento de visita
- [x] Y el cupo se suelta cuando la visita termina
- [x] Adjunta una foto de ingreso **y acaba en el bucket**, no como `blob:`

### Administración
- [ ] Da de alta torre, unidad, portería y estacionamiento
- [x] Aprueba y rechaza una reserva de zona, con quién y por qué
- [x] Publica un anuncio con votación y cuenta los votos
- [x] Y el voto secreto lo es **en la base**, no en la pantalla
- [ ] Genera un reporte y lo vuelve a leer
- [ ] Gestiona guardias y turnos
- [x] Ve las cuotas y marca un pago, con importe, moneda y autor

### Transversales
- [ ] Correspondencia: alta, cambio de estado y entrega
- [ ] PQRS: alta, adjunto y cambio de estado
- [ ] Chat por áreas y registro de llamada
- [ ] Notificaciones: se crean y se marcan leídas

## Cómo está montado el arnés

Las pruebas viven en `supabase/tests/recorridos/` y las recoge
`npm run test:rls`, que ya incluye `supabase/tests/**`.

El puente está en `supabase/tests/recorridos/cliente.ts` y en el alias de
`vitest.rls.config.mts`. Los repositorios importan `{ supabase }` de
`@/shared/services/supabase`, un singleton que guarda la sesión en SecureStore
y arrastra `react-native`: en Node no existe. El alias lo sustituye por un
cliente equivalente --misma clave anónima, mismo `@supabase/supabase-js`-- cuya
sesión se abre con `entrarComo(correo)` usando `signInWithPassword`, igual que
la pantalla de acceso. El token que viaja es uno de verdad.

Dos cosas aprendidas escribiendo el primero:

- **Marcar lo que se crea** con `[prueba]` en `comentarios`: la limpieza global
  (`limpieza-global.ts`) borra lo que lleve la marca, y así el archivo puede
  caerse a mitad sin dejar la franja ocupada.
- **Limpiar con la administración, no con el rol probado.** El huésped no tiene
  política de borrado sobre su reserva --solo puede cancelarla, que es lo
  correcto--, así que borrar con su sesión fallaba en silencio: la corrida
  siguiente chocaba con el disparador de cupos y tres casos se ponían rojos por
  algo que no tenía que ver con lo que probaban.

### Tercera cosa aprendida: donde hay dos defensas, comprobar las dos

`obtenerLibroHuesped` sale por `if (!data) return null` cuando RLS le oculta la
ficha, y entonces **no llega a pedir las contraseñas**. Escrita solo contra esa
función, la prueba daba por bueno un límite que ni se ejecutaba: al relajar
`credenciales_alojamiento` seguía verde mientras el RPC entregaba la clave de
la puerta a quien no había llegado. Ahora el caso interroga al RPC directamente
y tiene su control positivo.

### Orden: lo que no tiene red primero

La lista va por rol, pero el orden de trabajo no lo decide la lista sino el
riesgo. El bloque de portería se hizo antes que el resto del huésped porque el
24/09 se escribió un disparador en la base real --el que mueve `visita.estado`--
y se cambió de dónde sale el contacto de la vivienda, y ninguno de los dos
tenía prueba. Un cambio aplicado a producción sin red es lo más caro de
perder.

### Cuarta cosa aprendida: restaurar sin pasar por el código mutado

El `afterAll` devolvía la configuración llamando a `guardarAlojamiento`. Al
mutar esa función, la restauración escribió con el código roto y dejó
`ocultar_numero` en `false`: tres casos de `conversaciones.test.ts` se pusieron
rojos por un dato que este recorrido había estropeado, y el síntoma apareció
muy lejos de la causa. Ahora se guarda la fila cruda y se devuelve con una
escritura directa.

### Lo que un recorrido no alcanza: la funcion escrita y nunca conectada

El recorrido de la foto paso 4 de 4 **a la primera**, y sin embargo la
funcionalidad estaba rota: `subirFotoVisita` y `urlFotoVisita` funcionaban
perfectamente y no las llamaba nadie. El defecto vivia por encima del
repositorio, en la pantalla, que guardaba la URI local del selector.

Un recorrido comprueba que la capa de datos hace lo que dice. Que alguien la
use es otra pregunta, y se responde con `npm run sueltas`.

### El viaje de ida y vuelta

La forma más barata de cazar un defecto de mapeo: escribir con la función de la
pantalla, leer con la función de la pantalla, y comparar **campo por campo** en
un bucle que nombre el que falla. Veintidós campos, una sola prueba.

Ahí vivía el defecto de la política de mascotas: la base guarda un booleano y
el camino de ida lo convertía en el texto `"no-permitidas"` --con el guion que
acabó viéndose en la pantalla-- mientras el de vuelta esperaba otra cosa. Un
round trip lo habría cazado el primer día.

Las excepciones se declaran: las contraseñas se escriben y **no se releen**
--viven en Vault-- así que el formulario las recibe vacías. Eso no es pérdida,
es diseño, y el recorrido lo fija para que nadie lo "arregle".

### Sexta: "no lo veo" no es "no existe", ni siquiera en una prueba propia

El recorrido de la cancelación comprobaba si la reserva de otro seguía ahí
**con la sesión del huésped**, que no la ve --su política de lectura es
`solicitada_por = auth.uid()`--. Daba por cancelada una reserva intacta. Es la
misma trampa que ese mismo archivo advierte sobre el `delete`, cometida dentro
del archivo.

Un caso negativo se comprueba con una sesión que **sí podría ver** lo que se
niega. Si no, pasa por el motivo equivocado.

### Quinta cosa aprendida: un `delete` sin política no borra y no se queja

`invitacion` no tiene política de borrado --a propósito: una invitación es un
hecho, se revoca pero no se elimina--. El `afterAll` la borraba, PostgREST
devolvía éxito, y no pasaba nada. Se descubrió **contando filas**, no leyendo
la respuesta.

Lo mismo pasó antes con la reserva del huésped. Cuando una limpieza parezca
funcionar, contar lo que queda.

### Cómo está protegido el secreto del voto

Vale la pena dejarlo escrito porque es lo mejor construido del producto y
conviene no aflojarlo sin darse cuenta. Son **dos** defensas, no una:

- `voto` solo lo lee su autor. Ni la administración puede leer la tabla.
- `detalle_votacion` entrega el detalle nominal solo si la votación no es
  secreta **y** quien pregunta administra el condominio.

El recuento llega por otro camino, así que se puede decir cuántos sin decir
quién. Una pantalla que ocultara nombres sobre una consulta que los devuelve no
sería una votación secreta: sería una pública mal pintada, y bastaría abrir la
consola del navegador.

### Dos casos negativos parecidos, dos defensas distintas

En el recorrido de resolver una reserva, los dos casos que niegan se parecen
--"una vecina no se aprueba su propia reserva", "ni el dueño de otra
vivienda"-- y los protege algo distinto:

- A la vecina la para el **disparador** `proteger_resolucion_reserva`: la
  política de actualización sí la deja escribir, porque es propietaria de esa
  vivienda.
- Al de fuera lo para la **política**, antes de llegar al disparador.

Mutar el disparador solo pone rojo el primero. Si solo existiera el segundo
caso, quitar el disparador pasaría inadvertido y cualquier vecino podría
aprobarse sus propias reservas.

### Un caso negativo contaminado no dice nada

En el recorrido de las cuotas, el caso "una vecina no marca pagos de nadie"
salió rojo y parecía un agujero de seguridad. No lo era: dos casos antes, la
carga masiva marca por código y había tocado esa misma vivienda. El caso leía
un `true` que no había escrito la vecina.

Un caso negativo pone el mundo en el estado que necesita **justo antes**, con
la sesión que sí puede hacerlo. Si depende de lo que dejaran los anteriores,
tarde o temprano acusa a quien no fue --o absuelve a quien sí--.

## Lo que una prueba de recorrido no puede juzgar

El criterio visual. Va a `docs/REVISAR-A-OJO.md`, que se acumula para una sola
revisión con el cliente en vez de interrumpirle por cada cosa.

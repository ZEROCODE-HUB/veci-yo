# Informe de la noche del 23 al 24 de septiembre de 2026

Se cerró el trabajo autónomo. Los **40 recorridos** de `docs/RECORRIDOS.md`
están en verde y todo está commiteado en local. **No se ha subido nada a
GitHub**, como pediste.

---

## Lo que pasó, en corto

Empezaste la noche encontrando fallos con el teléfono —el modal que no se
cerraba, la tarjeta transparente, el guardia al que la app le ofrecía agregar
una propiedad— y dijiste una cosa que era exacta: *«siento que estas cosas tú
podías haberlas identificado»*. Tenías razón, y el motivo tiene nombre.

`npm run typecheck`, `npm test` y `npm run test:rls` pasaban los tres **mientras
la aplicación estaba rota**. Ninguno de los tres recorre un flujo como un rol:
el typecheck no sabe si un botón hace algo, las unitarias comprueban funciones
sueltas, y las de RLS comprueban políticas fila a fila. Todos los defectos que
encontraste salieron de *caminar un flujo*.

Así que lo primero fue construir lo que faltaba: un arnés que **abre sesión como
una persona de verdad y llama a las mismas funciones que llama la app**. No a
HTTP crudo: a los repositorios, que es donde vivía la mitad de los defectos.
Sobre eso se escribieron los 40 recorridos de la lista.

**Números:** 41 commits locales. De 0 a **484 pruebas** contra el Supabase real,
más 71 unitarias. 21 archivos de recorrido. 23 arreglos de comportamiento y 20
migraciones aplicadas a la base.

---

## Los fallos que encontraron los recorridos

Estos no los viste tú: aparecieron al caminar cada flujo. Van ordenados por lo
que te habrían costado.

**Datos personales al descubierto o mal guardados**

- El **huésped podía reservar una zona sin poder apuntar a quién iba con él**:
  era el error 403 de la lavandería que reportaste. Faltaba la política.
- **El historial de quién sacó qué reporte se escribía y no se podía leer.** Un
  reporte de visitantes es la lista de quién entró a cada casa y a qué hora; la
  tabla que registra quién lo pidió existe desde el principio, pero la consulta
  del nombre respondía error y la pantalla se quedaba en blanco. Mismo hueco
  exacto que dejaba vacía la bandeja de correspondencia.
- **Las fotos que sacaba la portería en el ingreso se guardaban como `blob:`** y
  morían al recargar la página: la prueba de que alguien entró duraba lo que la
  pestaña abierta.

**Cosas que la pantalla prometía y la base no cumplía**

Este fue el patrón más repetido de todo el proyecto: *la decisión vivía en la
pantalla, no en el dato*. El prototipo era una maqueta con todo en memoria, así
que cada interruptor funcionaba porque nadie lo comprobaba.

- El **botón de cancelar una reserva no cancelaba nada**.
- Un **cupo de estacionamiento asignado no se soltaba nunca**: a la semana no
  quedaba ninguno libre.
- Se podía **reservar una fecha que ya había pasado** (lo viste tú).
- La **visita no sabía si alguien había entrado**: el guardia marcaba llegada y
  salida y la etiqueta seguía diciendo «Pendiente» (lo viste tú).
- Un **paquete recién registrado por la portería nacía como ya entregado**.
- El **número de la reserva lo ponía el reloj del teléfono**, así que dos
  personas reservando a la vez podían llevarse el mismo.
- La **referencia del pago de un paquete se aceptaba y se tiraba**.

**Contradicciones dentro de la propia base**

- **El turno de noche no se podía ajustar.** El horario habitual admitía 22:00 a
  06:00; el ajuste de un día suelto lo rechazaba. Era el turno más común que hay
  en una portería. Curiosamente, la función que calcula quién está de turno
  *ya* estaba preparada para la medianoche —lo dice hasta su comentario—; lo
  único que sobraba era la restricción.

---

## Lo que necesita tu ojo, no el mío

Todo está en **`docs/REVISAR-A-OJO.md`** con el detalle. Lo que hay que decidir:

1. **Los puntos del precheckin.** Preparé un rediseño y pediste dejarlo como
   estaba; sigue sin tocar.
2. **La pestaña «Viviendas» del guardia** abre «mi vivienda», y un guardia no
   tiene ninguna.
3. **Siete funciones escritas y nunca conectadas a un botón.** Cada una es una
   pantalla que promete algo que no hace. Hay que decidir cuál se conecta y cuál
   se quita. De esas siete, la que yo levantaría la mano por conectar es el
   historial de reportes: si el edificio maneja la lista de quién entra a cada
   casa, alguien tiene que poder auditar quién la miró.
4. **Datos de prueba en el Supabase de producción**: 174 invitaciones, 3.500
   notificaciones (451 de ellas huérfanas), y las cuentas `@veciyo.test`. Se van
   en la purga previa a la marcha blanca. Dijiste que eso por ahora no va.

---

## Lo que NO hice, porque dijiste que no

- No se hizo **push** a GitHub. Los 41 commits están solo en local.
- No se tocaron **ramas**, ni se rotó el token, ni se purgaron datos de prueba.
- El **envío de correo de invitaciones sigue apagado**, para que puedas probar.
- No se cambió la **contraseña** de las cuentas de prueba ni se cargaron datos
  reales.
- Lo visual del precheckin quedó **como estaba**.

---

## Dos cosas que conviene que sepas

**Toqué datos tuyos y tuve que repararlos.** Dos veces. Una prueba de cuotas
marcó como pagadas viviendas que no lo estaban —entre ellas la 301, que existe
justamente para estar en mora y probar tus filtros de morosidad—, y una prueba
de notificaciones marcó como leídas 637 notificaciones de todo el edificio.
Ambas reparadas y comprobadas contando filas. Las pruebas ahora guardan la foto
de **todo lo que pueden tocar** antes de escribir, no solo de lo que piensan
tocar. Está escrito como regla en `AGENTS.md` para que no vuelva a pasar.

**Las pruebas se comprobaron a sí mismas.** Cada recorrido se validó rompiendo a
propósito lo que dice proteger y verificando que se pone rojo. Esto pilló dos
pruebas que no probaban lo que yo creía: una pasaba por la razón equivocada, y
otra seguía verde porque yo había roto la puerta que no era. Sin esa
comprobación, las dos habrían quedado como falsa tranquilidad.

---

## Para seguir

El arnés está montado y documentado en `docs/RECORRIDOS.md`. Cuando aparezca un
flujo nuevo, se añade a esa lista y se escribe su recorrido; cuando aparezca un
fallo, lo primero es el recorrido que lo reproduce.

Para correr todo: `npm run typecheck`, `npm test` y `npm run test:rls`.

# Para revisar a ojo

Cosas que ninguna prueba puede juzgar: son criterio visual o decisión de
producto. Se acumulan aquí para una sola revisión, en vez de interrumpir al
cliente por cada una.

## Pendientes

1. **Los puntos del precheckin** (`TimelineReservaHuespedes`). Seis emojis en
   fila sin leyenda; el primero está siempre verde porque vale `true` fijo; y
   los dos últimos usan 🟢 y 🔴 como icono encima de puntos que ya usan el
   color para decir hecho/pendiente. Se preparó un rediseño --resumen en la
   lista, detalle dentro-- y el cliente pidió dejarlo como estaba de momento.
   Decidido el 24/09: el guardia **sí** ve los seis pasos.

2. **La pestaña "Viviendas" del guardia** abre `ViviendaResumen`, que es "mi
   vivienda". Un guardia no tiene ninguna. Propuesta: que abra el Directorio
   de Propiedades, que sí es suyo y ya existe en Inicio.

3. **`ReservaPropietarioDetail`** pinta un recuadro con un icono en lugar de
   la imagen del documento, aunque la tiene. Mismo patrón que se corrigió en
   la pantalla del guardia.

   Mirado de cerca el 24/09: el título de esa sección dice literalmente
   **«Imágenes del documento»**, debajo hay un recuadro gris con un icono de
   fichero y el nombre del archivo, y la ruta de la imagen **está ahí** --se usa
   para la etiqueta--. La pantalla del guardia, con el mismo dato, sí la pinta.

   Lo único que justificaría dejarlo así es una regla de privacidad: que la
   portería vea la foto del documento porque verifica identidad en la puerta, y
   el anfitrión no, porque le basta saber que está verificado. Esa regla **no
   está escrita en ninguna parte**: el KT dice que la verificación es exclusiva
   del Anfitrión, pero no si eso incluye ver las imágenes.

   Así que hay dos caminos y los dos son coherentes; lo que no es coherente es
   el de ahora, que promete imágenes y enseña iconos. O se pinta la imagen, o se
   quita el título y se deja claro que solo se listan los archivos adjuntos.
   **Quién puede mirar la foto del documento de un huésped no lo decido yo.**

5. **Siete funciones de datos escritas y nunca conectadas** (`npm run sueltas`).
   Cada una es una pantalla que promete algo que no hace, o trabajo muerto.
   Decidir cuál se conecta y cuál se quita es de producto, no mío:

   - `liberarEstacionamiento` (arquitectura)
   - `guardarPermisosDeUnidad` y `permisosDeUnidad` (permisos)
   - `obtenerSolicitudes` (reportes) — es el historial de **quién sacó qué
     reporte**, y un reporte lleva la lista de quién entró a cada casa. La
     tabla se llena sola con cada generación; lo que falta es la pantalla que
     lo enseñe. Mi opinión: si el edificio maneja esos datos, alguien tiene
     que poder auditar quién los miró
   - `obtenerLegalesDelCondominio` (onboarding) — los legales **de la
     plataforma** sí se usan; los del condominio no
   - `cancelarSuscripcion` (renta corta) — un anfitrión no puede darse de baja
     desde la app
   - `subirComprobante` (zonas) — la reserva de una zona de pago admite
     comprobante en la base y no hay forma de adjuntarlo

6. **La referencia del pago de un paquete de verificaciones.** La columna ya
   existe y la función del repositorio la acepta, pero **ninguna pantalla la
   envía**, porque no hay de dónde sacarla: el cobro ocurre fuera de la app y
   no hay pasarela. Cuando la haya, la referencia entra por ahí. Hasta
   entonces, un paquete comprado es un importe sin justificante.

7. **174 invitaciones de prueba acumuladas** en el Supabase de producción, la
   mayoría de la suite preexistente. No se pueden borrar desde la aplicación:
   `invitacion` no tiene política de borrado, y eso es correcto --una
   invitación es un hecho, se revoca pero no se elimina--. Se van en la purga
   previa a producción, junto con el resto de datos de prueba.

   Cuidado al limpiar cualquier tabla: **un `.delete()` sin política devuelve
   éxito y no borra nada**. Se descubrió contando filas, no leyendo la
   respuesta.

8. **Soltar un cupo de visita a mano.** Ahora se suelta solo cuando la visita
   termina o se cancela, que es cuando de verdad queda libre. Falta decidir si
   además hace falta un botón para el guardia --por ejemplo, si el visitante
   mueve el coche antes de irse--. `liberarEstacionamiento` ya existe en el
   repositorio y hoy no la llama nadie; conectarla es media hora.

9. **451 notificaciones huérfanas** apuntan a reservas que ya no existen, y
   **3.500 notificaciones** en total, casi todas de la suite. No se pueden
   borrar desde la aplicación --`notificacion` solo tiene políticas de lectura
   y de marcado, igual que `invitacion`--, y eso es correcto: una notificación
   es la constancia de que se avisó a alguien. Se van en la purga previa a
   producción.

10. **Cuatro botones que son funciones sin construir.** Los encontró
    `npm run botones`, que busca controles pulsables que no llaman a nadie. No
    son fallos de conexión: de ninguno de los cuatro existe **nada** --ni
    mención en el KT, ni tabla en la base, ni columna--. O se construyen o se
    dejan de pintar, y eso es de producto:

    - **`ComunidadScreen` entera.** Sus tres tarjetas --«Ofertas», «Venta de
      garaje», «Páginas amarillas»-- llevan `onPress={undefined}`. Es una
      pestaña del menú que no lleva a ninguna parte.
    - **«Adjuntar Imagen» / «Adjuntar Video» al publicar un anuncio**
      (`AnuncioFormModal`). No hay adjuntos de anuncio en la base.
    - **La cámara sobre el avatar del perfil** (`PerfilScreen`). No hay columna
      de foto de perfil.
    - **«Importante:» subrayado** en el modal de configuración
      (`ModalesConfiguracion`). Parece un enlace a una ayuda que no existe.

    Mientras tanto la marca está en 4: si aparece un quinto botón muerto,
    `npm test` se pone rojo.

11. **Dos pantallas enteras que nadie puede alcanzar.** Están registradas como
    ruta, tienen su componente y su hook, y **ningún botón de la aplicación
    navega a ellas**. No las borro porque elegir es de producto:

    - **`AdministradorZonas`** (`AdministradorZonasScreen`) es un segundo
      administrador de zonas comunes, en paralelo al que sí se usa
      --`GestionZonas`, al que se llega desde el resumen de la vivienda--. Son
      dos implementaciones de lo mismo; sobra una, y decidir cuál es la buena no
      me toca.
    - **`AgregarServicio`** no solo es inalcanzable: su guardado llama a
      `simularAgregarServicio`, que **simula la respuesta** y no escribe nada.
      Es pantalla del prototipo.

    Se encuentran comparando las rutas registradas en `src/navigation` con los
    nombres que aparecen en cualquier otro sitio del código:

    ```
    grep -rhoE 'name[:=][[:space:]]*"[A-Za-z]+"' src/navigation | sed 's/.*"\(.*\)"//' | sort -u
    ```

    Cuidado al repetirlo: el menú del administrador guarda las rutas con
    **comillas simples** (`screen: 'AdministradorArquitectura'`), y una búsqueda
    que solo mire comillas dobles da seis falsos positivos.

12. **Una visita de prueba sin la marca acordada.** Queda en el Supabase del
    cliente una visita del 21/09/2026 con el invitado llamado «Prueba Desde
    Chrome», de una sesión manual anterior. **No la borro**: no lleva `[prueba]`,
    que es la marca por la que barre la limpieza, y borrar por parecido es
    exactamente como se acaba comiendo un dato del cliente. Se va en la purga
    previa a producción, o se retira a mano si se confirma que es de prueba.

13. **Los interruptores no dicen su estado a un lector de pantalla.** Los tres
    del detalle de una visita --anuncié, entrada, salida-- salen con
    `role="switch"` pero sin `aria-checked`. Se ven bien y funcionan; lo que no
    hay es forma de saber si están puestos sin mirarlos. No sé si la
    accesibilidad entra en el alcance, así que no lo decido.

14. **Al entregar un paquete en portería no se registra quién se lo llevó.**
    La app solo pide el nombre cuando la entrega es **en puerta**; si el vecino
    baja a recogerlo, `entregada_a` queda en `null`.

    La columna existe y el repositorio la acepta. El comentario de su migración
    dice para qué está: *«sin esto, "yo nunca recibí ese paquete" no tiene
    respuesta»*. Y el mostrador de portería es justo donde nace esa discusión.

    El KT (flujo 4.5) describe el registro del paquete y el permiso de entrega
    directa, pero **no dice nada del momento de la entrega**: es un hueco, así
    que no lo decido. Mi opinión, para lo que valga: si se pide el nombre en la
    puerta, con más razón en el mostrador.

15. **Se puede reservar una hora de hoy que ya pasó.** A las 18:45 la pantalla
    ofrece «+ Reservar» en la franja de las 06:00 de hoy, y la base la acepta:
    el disparador `reserva_no_en_el_pasado` compara solo la **fecha**.

    Los días pasados sí están bloqueados, y eso funciona. Lo que queda abierto
    son las horas del propio día. Pediste que no se pudieran marcar «fechas
    pasadas»; de las horas no hablamos, y el KT no lo cubre.

    Mi opinión: reservar la lavandería para las 06:00 cuando son las 18:45 no
    tiene sentido, y la pantalla no debería ofrecerlo. Pero si hay algún caso en
    que portería o administración quieran registrar un uso ya ocurrido, entonces
    la regla no es «nunca», y eso lo decides tú. Si dices que sí, se arregla en
    los dos sitios: la lista deja de ofrecer las franjas pasadas y el disparador
    compara fecha **y** hora.

16. **La cuota de septiembre de la 205.** ~~Pregunta abierta.~~ **Cerrado**: el
    cliente confirmó el 24/09/2026 que lo que hay ahora en el Supabase son datos
    de prueba y se purgan antes de la marcha blanca, así que el valor exacto no
    importa.

    Queda como apunte de lo que sí importa: la **causa** está arreglada --la
    restauración se lleva la fila entera-- y la 301 sigue en mora, que es lo que
    hace falta para probar los filtros de morosidad. Los fixtures importan; su
    historia exacta, no.

17. ~~**«Eliminar» una reserva no elimina nada.**~~ **Cerrado** (25/09/2026):
    el cliente pidió cambiar la palabra. El menú y el modal dicen ahora
    «Cancelar reserva», y el botón de al lado pasó de «Cancelar» a «Volver»,
    porque dos botones con la misma palabra y efectos opuestos habrían sido
    peor que la palabra mal puesta. El comportamiento no se toca.

    Lo que decía: Cuando el huésped cancela lo
    suyo, el aviso dice --bien-- «¿Seguro que desea cancelar esta reserva? La
    franja vuelve a quedar libre para otros vecinos», y la fila queda
    `cancelada`, no borrada. Eso es lo correcto: una reserva cancelada es una
    constancia, y la franja se libera igual.

    Pero el título del aviso dice «Eliminar reserva» y el botón rojo dice
    «Eliminar», o sea que el mismo modal se contradice consigo mismo en tres
    renglones. El comportamiento no lo tocaría; la palabra sí. «Cancelar
    reserva» diría lo que pasa. **Cambiar texto que ve el usuario es tuyo**, no
    mío.

18. ~~**El N° de lavandería que se elige no se guarda en ninguna parte.**~~
    **Cerrado** (25/09/2026): el cliente eligió **asignar de verdad**.
    Migración `20260925090000`: la columna `numero_recurso`, un disparador que
    impide que dos reservas vivas compartan puesto y hora, y `ocupacion_zona()`
    devolviendo qué números están cogidos --el desplegable no podía saberlo
    solo, porque cada vecino únicamente ve sus propias reservas--. Comprobado
    en el navegador: reservada la N°2, el desplegable pasa a ofrecer N°1, N°3 y
    N°4; y por SQL, que la base rechaza el duplicado aunque no se pase por la
    pantalla.

    Lo que decía: El
    formulario pide «Seleccione N° de Lavanderia» --y es obligatorio, sin él no
    se puede reservar--, pero `reserva_zona` no tiene columna donde ponerlo y
    la consulta no lo manda. Se comprueba solo: reservé la N°1 a las 06:00 y al
    volver a reservar esa misma franja la N°1 seguía ofreciéndose.

    Lo que la app sí lleva es **cuántas** máquinas quedan libres --«quedan 3 de
    4»--, y eso funciona. O sea que el modelo cuenta cupos, no asigna máquinas.
    Hay dos salidas coherentes y son decisión de producto:

    - **Asignar de verdad**: columna nueva, y que la N°1 desaparezca de la
      lista cuando esté tomada. Es más trabajo y cambia lo que promete la zona.
    - **Dejar de pedirlo**: si da igual qué máquina, el desplegable sobra y el
      contador ya dice lo que hace falta.

    Lo que no se sostiene es lo de ahora: pedirlo como obligatorio y tirarlo.

19. **Deshacer una salida deja el cupo de estacionamiento suelto.** El
    interruptor «Registrar salida» del guardia se puede apagar --es un toggle,
    no un botón--, y al apagarlo la visita vuelve a `ingresada` con
    `salida_en` en nulo. Pero la asignación del estacionamiento **no vuelve**:
    el disparador suelta el cupo al terminar la visita y nada lo retoma.

    Resultado: `estado = ingresada`, `salida_en = null` y `liberado_en` con
    fecha. La visita está dentro y su cupo figura libre, así que la portería
    podría dárselo a otro con el coche todavía ahí. Comprobado en la base con
    Carlos Rojas y el V-01.

    Es un caso de borde --deshacer una salida no es lo normal-- y por eso no lo
    toco solo: retomar el cupo automáticamente puede chocar con que ya se lo
    hayan dado a otro, y entonces hay que decidir **qué se le dice al guardia**.
    Tres caminos, y el tercero es el que yo elegiría:

    - Retomar el cupo si sigue libre, y avisar si no.
    - No dejar deshacer una salida: que sea una acción aparte, con su motivo.
    - Las dos: no dejar deshacerla sin más, y si se deshace, recuperar el cupo.

## Resueltas

- **El cupo de visita no se soltaba nunca.** Asignar escribía en la base y
  liberar no lo hacía nadie. Con un solo estacionamiento de visita en el
  condominio, bastaba un visitante para dejar al siguiente sin sitio. Lo suelta
  un disparador al terminar la visita.

- **Fechas pasadas al reservar una zona.** Disparador
  `reserva_zona_no_en_el_pasado` --que cuenta el día en la zona horaria del
  condominio, no en UTC-- y un mínimo opcional en el calendario. El `Calendar`
  es compartido y hay pantallas que sí necesitan el pasado (reportes,
  historial, turnos), así que el mínimo solo lo pide quien reserva.

- Fondo difuminado en los modales, y la tarjeta que salía transparente.
- Imágenes a tamaño natural por dimensionarse con clases.
- "Pendiente" que no cambiaba nunca al registrar entrada y salida.

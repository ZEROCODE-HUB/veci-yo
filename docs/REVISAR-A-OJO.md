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

20. **¿Casilla o radio para el anfitrión y el administrador primario?** Ya no
    se pulsan en vano --ahora avisan de por qué no se desmarcan, hallazgo
    22--, pero el control sigue siendo una casilla, y una casilla promete
    encender y apagar.

    Lo que hay debajo es «uno entre varios»: exactamente un anfitrión primario
    por vivienda, exactamente un administrador primario, y se cambia
    pasándoselo a otro. Eso es un **radio**, no una casilla.

    El aviso resuelve la confusión; el radio la evitaría. Cambiarlo toca la
    pinta de la pantalla y dijiste que lo visual se queda como está por ahora,
    así que lo dejo escrito y lo decides tú.

21. **La última media hora de la grilla no lleva a ninguna parte.** La
    lavandería cierra a las 22:00 y las reservas son de una hora, así que a
    las 21:30 no cabe ninguna. La grilla ofrece esa fila igual, con su
    «+ Reservar», y al pulsarla el formulario abre con la hora en blanco --no
    hay ninguna franja que empiece a las 21:30--.

    Es el mismo defecto que acaba de arreglarse (hallazgo 23), reducido a una
    fila. Lo dejo escrito en vez de arreglarlo porque hay que decidir qué
    hacer con ella, y son cosas distintas:

    - **No ofrecerla**: la fila se pinta, pero sin botón. Es lo más honesto.
    - **Ofrecer lo que quepa**: dejar reservar de 21:30 a 22:00, media hora.
      Cambia la regla de «las reservas son de una hora».

    Yo no la ofrecería. Pero eso es decidir cómo funciona la lavandería, no
    cómo se pinta un botón.

22. **El rango Desde–Hasta de portería y administración necesita otro
    formato.** Ahora que el vecino ya no lo ve --se decidió el 25/09/2026 que
    solo lo tienen portería y administración, que son quienes ven las reservas
    de todo el edificio--, quedan dos controles de fecha conviviendo en esa
    pantalla: la tira de días de un renglón, para elegir **qué día pinta la
    grilla**, y el rango, para **buscar en la lista**.

    Hacen cosas distintas y se parecen demasiado. El rango sigue abriendo el
    calendario de mes entero, que es justo el formato que se acaba de quitar
    del formulario por ocupar toda la pantalla a ancho de teléfono.

    El cliente lo dejó escrito para después. Lo que hay que decidir es **cómo
    se pide un rango** sin un calendario de pantalla completa: dos campos con
    teclado numérico, atajos («esta semana», «este mes»), o un calendario
    compacto de dos renglones. Y si conviene separarlo visualmente de la tira
    para que no parezcan lo mismo.

23. **Aceptar el reglamento no deja constancia.** El interruptor «Acepto el
    reglamento de la zona» bloquea el botón de reservar hasta que se marca, y
    desde el hallazgo 28 el reglamento se puede leer. Pero **no se guarda
    nada**: la fila de `reserva_zona` no dice que se aceptara, ni qué versión
    del reglamento estaba publicada ese día.

    Mientras sea «no dejes el tendedero lleno» da igual. Deja de dar igual en
    una zona con **fianza** --el salón de eventos tiene `monto_garantia`--,
    porque si alguien discute un descuento, lo único que hay es un interruptor
    que ya nadie puede ver.

    Lo que habría que decidir: si basta con una marca de tiempo en la reserva,
    o hay que guardar **qué texto** se aceptó --que es lo que sirve si el
    reglamento cambia después--. Lo segundo es más trabajo y es lo que
    aguanta una discusión.

24. **`ReservaZonaCard` no la usa nadie.** Es un componente entero --pinta una
    reserva con su zona, su horario, su departamento y su número-- exportado
    desde el índice de `features/zonas/components` y **no renderizado en
    ninguna pantalla**.

    No es inofensivo: al añadir el número de lavadora hubo que repasar los
    sitios donde se pinta una reserva, y este aparecía en la búsqueda como si
    contara. Código muerto que parece vivo hace perder tiempo y esconde los
    sitios que sí importan.

    Conectarlo o quitarlo. Yo lo quitaría --lo que hace ya lo hacen
    `MisReservas` y `FranjaHoraria`--, pero borrar un componente entero es
    decisión tuya y no corre prisa.

26. ~~**Hay dos formas distintas de ser huésped temporal, y no se conocen
    entre sí.**~~ **Cerrado** (25/09/2026): el cliente eligió que **solo el
    titular tenga cuenta**, y que nazca del precheckin. Ahora la estancia es
    la visita, el enlace de preregistro la abre, y al cerrarlo se emite el
    acceso a la aplicación con las fechas de esa estancia. Un disparador deja
    la cuenta apuntando al invitado del que salió, así que la persona
    reportada a la autoridad y la que tiene las llaves son la misma.

    Lo que decía: Salió al decidir que los acompañantes se elijan de una lista
    (25/09/2026): para construir esa lista hay que saber quién se aloja
    contigo, y resulta que la pregunta no tiene una respuesta sino dos.

    En la 102, ahora mismo:

    | Vía | Quién | ¿Cuenta? | ¿Documento? |
    |---|---|---|---|
    | `membresia_unidad` | Tomás, Laura, Nadia, Ramiro | **Sí** | No |
    | `invitado` de una `visita` | Carlos Rojas | **No** | **Sí** |

    Son dos mecanismos paralelos para lo mismo. El de la membresía **exige
    cuenta** --nace de una invitación por correo-- y no guarda documento. El
    del invitado **no exige cuenta**, guarda documento, y es el único que pasa
    por términos, verificación de antecedentes y TRA/SIRE.

    O sea: **Carlos está reportado a la autoridad y Tomás no**, y Tomás es el
    que tiene las llaves. Eso no puede estar bien en un país donde registrar
    al huésped es obligación del anfitrión.

    Esto explica de dónde venía la confusión del cliente --«¿cada huésped
    tendría que tener cuenta?»--: depende de por cuál de las dos puertas
    entró, y la app no dice cuál es cuál.

    Antes de hacer la lista de acompañantes hay que decidir **cuál de las dos
    es la buena**. Mi opinión: la reserva de huésped con sus `invitado` es la
    que tiene todo lo que la ley pide, y la membresía debería ser lo que se le
    da **al titular** para que pueda entrar a la app --credenciales, chat,
    zonas-- colgando de esa reserva, no en paralelo a ella.

    Y hay un detalle técnico que sale de aquí: `membresia_unidad_lectura` deja
    leer solo la propia membresía a un huésped --`es_miembro_unidad` lo
    excluye--, así que **la lista no se puede construir desde el cliente**.
    Hará falta una función `security definer` que devuelva solo a los de su
    misma estancia, y no el listado de la casa: quién duerme en la 102 no es
    asunto de quien pasa cinco noches.

25. ~~**Los acompañantes de una reserva no entran al edificio por ningún
    sitio.**~~ **Cerrado a medias** (25/09/2026): el titular ya los apunta en
    su precheckin, con documento, y son `invitado` de su misma estancia, así
    que pasan por lo mismo que él. `mis_acompanantes()` devuelve los de su
    estancia --no la gente de la vivienda-- para poder construir la lista al
    reservar una zona.

    **Queda abierto** lo que de verdad era una decisión: si un huésped puede
    meter a alguien de fuera al edificio a través de una reserva de zona
    común. Hoy la app sigue diciendo que sí, sin preguntar a nadie.

    Lo que decía:
    Lo preguntó el cliente reservando la piscina como Tomás: apuntó a Carlos,
    Carla y Robert, y preguntó «*esas personas ni entraron al edificio, no?*».

    No. Y hay cuatro cosas sueltas debajo de esa pregunta:

    **a) Son nombres pegados a la reserva, y nada más.**
    `participante_reserva` no tiene relación con `visita` ni con `invitado`.
    La portería no los ve en «Ingresos y salidas»; solo aparecen si abre esa
    reserva concreta en la pantalla de la zona. Tres personas de fuera pueden
    estar apuntadas a la piscina del viernes sin que nadie en la puerta lo
    sepa.

    **b) La regla que debería gobernar esto existe y no la lee nadie.**
    Sofía configuró «Visitas de huéspedes: aprobar huésped por huésped». Esa
    columna --`suscripcion_renta_corta.visitas_de_huespedes`-- **no se
    consulta en ninguna política, ningún disparador ni ningún código de la
    app**. Se guarda y se olvida. Es el mismo defecto que tenían los permisos
    de chat y llamadas del guardia: el dato estaba, y quien tenía que
    obedecerlo no lo miraba.

    **c) El tipo por defecto es el del que reserva.** Los tres salieron como
    «Huésped Temporal» porque Tomás lo es. Carlos, Carla y Robert no son
    huéspedes de la 102: son visitantes suyos. Y «Visitante» es precisamente
    el tipo que debería obligar a pasar por portería.

    **d) «Huéspedes: hasta 5» tampoco se impone.** `max_huespedes` solo tiene
    un `check` de que sea positivo: nada cuenta los huéspedes reales contra
    él. Es un número informativo, como el aforo de la zona.

    **e) Ni el aforo de la zona ni el costo hacen nada.** `capacidad_maxima` de la
    piscina es 20 y solo sirve para dimensionar el desplegable: se puede
    reservar para veinte sin que la base compruebe nada. Y «Costo: 30.000 COP
    por persona» no se calcula ni se cobra en ninguna parte.

    **Matiz que aportó el cliente (25/09/2026), y que cambia el diagnóstico.**
    Preguntó si cada huésped necesita cuenta, y si no, si poder anotar nombres
    en la piscina no estaría entonces bien. **No hace falta cuenta**, y por
    eso anotar nombres **sí hace falta**: mi primera lectura fue demasiado
    dura.

    La 102 admite cinco huéspedes y solo Tomás tiene cuenta. Los otros cuatro
    existen en el modelo sin ella, por dos caminos que ya están hechos:
    `invitado` --nombre y documento colgando de la reserva de huésped, que es
    lo que es Carlos Rojas-- y `membresia_unidad` con `usuario_id` nulo, que
    es como se registra a un menor.

    Así que el fallo no es que se puedan anotar personas. Es que se anotan
    **como texto libre suelto**, sin relación con quién está registrado en la
    estancia. Y eso tiene una consecuencia fea: el mismo acompañante escrito
    en el sitio equivocado es la diferencia entre **estar reportado a la
    autoridad** --un `invitado` pasa por documento, términos, verificación y
    TRA/SIRE-- y **no existir para nadie**, que es lo que es una fila de
    `participante_reserva`.

    **Cómo creo que debería funcionar.** La pregunta de fondo es si un
    acompañante es *aforo* o es *visita*, y la respuesta depende de quién sea:

    - **Quien ya vive o se aloja ahí** --otro residente, otro huésped de la
      misma vivienda-- es solo aforo. El cliente decidió el 25/09/2026 que
      **se elige de una lista**, no se escribe a mano. Antes de poder hacerla
      hay que resolver el punto 26: hoy hay dos formas distintas de estar
      alojado y no se conocen entre sí. Ya tienen nombre y documento; volver a teclearlos es
      duplicar un dato que existe, y abre la puerta a que el de la piscina y
      el de la reserva de huésped no sean la misma persona.
    - **Quien viene de fuera es una visita**, y entonces tiene que entrar por
      donde entran las visitas: anunciarla, que portería la registre, y que la
      regla `visitas_de_huespedes` decida si el huésped puede hacerlo solo,
      no puede, o necesita que el anfitrión lo apruebe.

    Eso significa que elegir «Visitante» en esa lista debería **crear o exigir
    una visita**, no solo escribir un nombre. Es trabajo de verdad --toca
    reservas, visitas y la regla del anfitrión-- y es una decisión de producto
    antes que de código: **¿puede un huésped de renta corta meter gente al
    edificio a través de una reserva de zona común?** Hoy la respuesta de la
    app es «sí, sin preguntar a nadie», y me extrañaría que sea la que
    quieres.

27. **Nadie cobra las zonas comunes.** La piscina tiene 30.000 de costo de
    reserva, 50.000 de garantía y su costo de limpieza; el salón, 150.000 y
    200.000. Esos números **solo se pintan**: no hay tabla de cobros, ni
    deuda, ni registro de quién debe qué ni de si la garantía se devolvió.

    Para un residente aún se puede imaginar dónde cae --la cuota de
    mantenimiento--, y de hecho había un interruptor muerto que lo prometía
    («el costo se carga automáticamente a su cuota»), que se quitó en el
    hallazgo 28 porque no hacía nada. **Un huésped temporal no tiene cuota
    donde cargarlo**: no paga administración, no tiene historial en el
    edificio, y se va en cinco días.

    Lo que hay que decidir, y son tres cosas distintas:

    - **Quién paga** cuando quien reserva es un huésped: ¿él, o el anfitrión,
      que es quien responde por la vivienda? Lo segundo encaja mejor con el
      resto del modelo --el anfitrión responde del huésped ante el edificio--
      pero hay que decirlo en la pantalla.
    - **Cómo se cobra.** La suscripción de renta corta ya se cobra fuera de la
      app por la decisión del KT sobre las comisiones de Apple y Google. Si
      esto también se cobra fuera, la pantalla debería decirlo en vez de
      dejar tres cifras sueltas.
    - **La garantía**, que es lo que más se discute: hay que poder anotar que
      se retuvo, que se devolvió, o por qué no.

    Mientras no se decida, lo honesto sería que la pantalla dijera que el
    cobro lo gestiona la administración fuera de la aplicación. No lo pongo yo
    porque no sé si es verdad.

    El cliente volvió a preguntarlo el 25/09/2026 --«¿cómo hace el huésped
    para pagar eso?»-- y la respuesta hoy es **que no puede**: no hay ninguna
    pantalla, ningún botón y ninguna tabla. Ve tres cifras y se acabó. Eso es
    lo que hay que resolver, y es lo primero que preguntará cualquiera que
    use el salón de eventos.

28. **El «Continuar» de la invitación llevaba a una pantalla muerta.**
    ~~Abierto.~~ **Cerrado** (25/09/2026). Lo encontró el cliente en mitad de
    una demo: al abrir su invitación y pulsar «Continuar», la web lo mandaba a
    `/login`, una maqueta que pide un «código de acceso» inexistente, acepta
    cualquier cosa y navega sin token. Un callejón sin salida del que no se
    podía volver.

    Ahora esa pantalla explica el camino real --instalar la app, crear la
    cuenta con ese correo exacto, y volver a abrir el enlace, que la app sabe
    leer por deep link-- en vez de fingir un botón.

29. **El acceso del huésped no se podía reenviar.** ~~Abierto.~~ **Cerrado**
    (25/09/2026), y salió de la misma demo. El acceso se enseña una sola vez
    al cerrar el preregistro --en la base solo vive su sha256-- y quien lo vio
    cerró la pantalla sin copiarlo. Ni el huésped podía entrar ni el anfitrión
    reenviárselo: hubo que emitirlo a mano contra la base.

    `reemitir_acceso_huesped` lo vuelve a emitir **sobre la invitación que ya
    existe**, no crea otra: dos invitaciones vivas para una estancia serían
    dos llaves, y cerrar una no cerraría la otra.

30. **El alcance pide selfie y firma en el precheckin, y no están.** El KT
    (sección 3) dice que el precheckin web es «documento + selfie + firma».
    Hoy el huésped carga su documento y acepta términos; no hay ni selfie ni
    firma en ninguna parte, ni tabla donde guardarlas.

    No es una decisión mía: **son dos funciones enteras que el alcance da por
    dentro** y que nadie ha construido. La selfie además necesita proveedor de
    verificación biométrica, que tampoco está contratado.

31. **Las fotos del documento no se guardan.** Se pueden subir y la pantalla
    avisa de que son opcionales, pero no van a ninguna parte: el bucket es
    privado y quien hace el precheckin no tiene sesión. Hace falta una función
    de servidor que valide el enlace y suba con permisos de servidor.

    Decidido el 25/09/2026 dejarlas opcionales para desbloquear la demo, con
    el aviso puesto en la pantalla. El número de documento --que es lo que
    TRA/SIRE pide-- sí se guarda.

32. ~~**Un edificio recién dado de alta nacía con todo prohibido.**~~
    **Cerrado** (25/09/2026). Primer hallazgo del recorrido de
    administración. `permitido()` traduce NULL a permitido --«nadie lo ha
    decidido» no es «prohibido»-- y `PERMISOS_INICIALES`, de donde arranca el
    formulario cuando no hay ninguna fila, decía lo contrario. En un
    condominio nuevo, pulsar «Guardar» sin tocar nada apagaba la renta corta
    del edificio entero.

33. **El reporte generado no se puede leer.** La pantalla dice cuántos
    registros devolvió y ahí se acaba: no enseña las filas, no se descargan y
    no se envían. El texto lo explica con *«la descarga y el envío por correo
    estarán disponibles cuando se configure el proveedor de correo»*, y ahí
    hay dos cosas mezcladas: **la descarga no depende del proveedor de
    correo**. Un CSV se puede generar hoy.

    Un reporte cuyo único resultado es un número no sirve para lo que existe:
    el KT lo pone entre las funciones del administrador, y quien lo pide
    necesita las filas.

34. **No se pueden dar permisos a una vivienda concreta.** `permisosDeUnidad`
    y `guardarPermisosDeUnidad` están escritas y no las llama nadie. La
    pantalla de Permisos configura **solo el ajuste general del edificio**.

    La tabla tiene `unidad_id`, la función `permisos_de_unidad` combina campo
    a campo la fila de la vivienda con la del condominio, y el KT dice
    literalmente que el permiso de entrega directa *«vive a nivel unidad,
    configurado por el Administrador»*. Todo el mecanismo está montado y no
    hay pantalla que lo use: la excepción que la administración puede conceder
    a una vivienda no se puede conceder.

35. **Las cocheras de visita se cuentan en dos sitios y no dan lo mismo.**
    Salió recorriendo Arquitectura como Marcela.

    La pantalla de Torres dice que la **Torre 3 tiene 10 cocheras de
    visitas**. La pantalla de Inicio, del mismo administrador, dice
    **«Estacionamientos de visita: 1 de 1 disponibles»**. Y en la base:

    | Torre | Declara | Estacionamientos que existen |
    |---|---|---|
    | 1 | 0 | 0 |
    | 2 | 0 | 0 |
    | 3 | **10** | **0** |

    El único estacionamiento de visitante que existe --`V-01`-- **no está en
    ninguna torre**. Los dos números no se hablan: `torre.cocheras_visitas`
    solo se pinta (`TorresTab`, `TorreDetailView`), y las plazas que la
    portería puede asignar se crean aparte con `crearEstacionamiento`.

    La consecuencia es de las que se discuten en la puerta: el administrador
    escribe 10 al dar de alta la torre y lo ve en su pantalla; la portería
    solo puede asignar las que existan de verdad, y nadie sabe por qué no
    cuadra.

    **Qué hacer es decisión de producto**, y hay tres caminos coherentes:

    - el número de la torre **crea** las plazas al guardarla, y entonces
      cuadra siempre;
    - el número desaparece de la torre y solo cuentan las plazas dadas de
      alta, que son las que se pueden asignar;
    - se quedan los dos, pero la pantalla dice cuál es cuál --uno es el plano
      del edificio, otro las plazas gestionables-- porque hoy los dos se
      llaman igual.

    Mi opinión: el segundo. Un número que nadie puede usar es el mismo caso
    del «N° de lavandería» que se elegía y no se guardaba (R-18), y ese se
    cerró asignando de verdad.

    **Y no es el único campo así en esa pantalla.** El alta de una torre pide
    un rango de numeración --«Desde 101, Hasta 105»--, lo guarda, y **no crea
    ninguna vivienda**: las tres torres tienen `nomenclatura_desde` y
    `nomenclatura_hasta` en nulo, y la Torre 3 tiene cero viviendas. El
    comentario del formulario ya lo dice: *«nada genera códigos de vivienda a
    partir de él»*.

    Con lo cual el alta de una torre pide tres cosas que no producen nada:
    el rango de numeración, las cocheras y los almacenes. Quien da de alta un
    edificio las rellena creyendo que está creando la estructura.

36. **Borrar una torre no se lleva sus viviendas, y hasta ahora no lo decía.**
    El borrado es lógico --marca `deleted_at`, no borra la fila--, que es lo
    correcto. Lo que no hay es nada que mire si la torre está vacía: no hay
    disparador, y la pantalla filtra las torres por `deleted_at` pero las
    unidades por el suyo propio.

    Comprobado con `administracion-borrar-torre.test.ts`, que crea una torre
    con una vivienda, la borra y mira qué queda: **la vivienda sigue activa,
    apuntando a una torre que ya no aparece en ninguna pantalla**. No está
    borrada: está escondida.

    El aviso del modal ya lo dice --«Tiene 2 viviendas. Al eliminarla dejan de
    aparecer en Arquitectura, pero no se borran»--, así que quien lo haga lo
    hace sabiendo. **Lo que queda por decidir es si debería poder hacerse**:

    - impedirlo mientras la torre tenga viviendas;
    - arrastrarlas, que es lo que casi nadie quiere;
    - o dejarlo como está, que ahora al menos se avisa.

    Mi opinión: impedirlo. Una vivienda sin torre visible no se puede
    recuperar desde ninguna pantalla, y el día que se reutilice el número de
    torre aparecerán colgando de otra.

37. **El administrador no puede aprobar una reserva por el camino de
    administración.** Salió recorriendo Zonas Comunes como Marcela.

    Hay **dos pantallas** que listan las reservas de una zona:

    | Camino | Pantalla | ¿Aprueba? |
    |---|---|---|
    | Viviendas → Zonas Comunes → ⋯ → Ver Reservas | `GestionZonaReservasView` | **No** |
    | El módulo de Zonas Comunes → la zona | `ZonaDetallesScreen` | Sí |

    La de administración ofrece Detalle, Editar, Cancelar y Eliminar; su
    modal de detalle termina en «Estado: Pendiente» y ahí se acaba. Las
    opciones «Aprobar reserva» y «Rechazar reserva» solo existen en la otra
    (`ZonaDetallesScreen:269`), condicionadas a `rol === "administrador"`.

    O sea que el camino que se llama «Gestión de Zonas Comunes» --el natural
    para administrar-- es justo el que no deja resolver nada. La función
    existe, está probada contra la base (`administracion-resuelve-reserva`)
    y el KT la describe en el flujo 4.4.

    Es la misma forma que R-24 (`ReservaZonaCard`, un componente entero que
    nadie usa) y que las dos pantallas inalcanzables de R-11: **dos caminos
    para lo mismo que no saben el uno del otro**.

    Lo que hay que decidir es cuál se queda. Mi opinión: la de administración
    gana las dos opciones --es donde se buscan-- y la otra las pierde, porque
    una pantalla pensada para el residente no debería cambiar de funciones
    según quién mire.

38. **«Tiempo máximo» de una encuesta se pide y se tira.** El formulario de
    crear encuesta pide dos números al lado: «Umbral mínimo» y «Tiempo
    máximo». El umbral se guarda y se usa --de él sale el porcentaje de
    progreso que se pinta--. El tiempo máximo **no**: `publicacion` no tiene
    columna para él, y `AnunciosScreen` construye el objeto sin él. Está en el
    esquema y en el tipo, y se pierde al publicar.

    Los otros tres ajustes de la encuesta sí funcionan, comprobados: «ocultar
    resultados hasta el cierre» se guarda y se respeta al pintar, el tipo de
    selección va a `voto_multiple`, y el umbral se lee.

    Qué hacer: o se guarda --haría falta columna y decidir qué significa,
    porque ya existe «Fecha de finalización» al lado y podrían ser lo mismo--
    o se quita del formulario. Mi opinión: quitarlo, porque la fecha de
    finalización ya cierra la encuesta y dos formas de decir cuándo termina
    es pedir que se contradigan.

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

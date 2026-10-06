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

2. ~~**La pestaña "Viviendas" del guardia.**~~ **Cerrado** (25/09/2026):
   quitada. Revisado antes el KT, como pidió el cliente: describe al guardia
   --registrar visitas y correspondencia, ver tráfico, turnos con overrides,
   chat y llamadas si se lo habilitan-- y no menciona ninguna pantalla de
   viviendas. El Directorio de Propiedades, que sí es suyo, sigue
   alcanzándose desde Inicio.

   Lo que decía: abre `ViviendaResumen`, que es "mi
   vivienda". Un guardia no tiene ninguna. Propuesta: que abra el Directorio
   de Propiedades, que sí es suyo y ya existe en Inicio.

3. ~~**`ReservaPropietarioDetail` pinta un icono en lugar de la imagen.**~~
   **Cerrado** (25/09/2026): el cliente decidió que **el anfitrión sí la ve**.
   Responde por su huésped ante el edificio, así que puede contrastar quién
   llega. Se pinta con su URL firmada, como ya hacía la pantalla del guardia.

   Lo que decía: pinta un recuadro con un icono en lugar de
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

5. ~~**Funciones de datos escritas y nunca conectadas**~~ **Cerrado**
   (25/09/2026), decidido una a una con el cliente:

   | Función | Decisión |
   |---|---|
   | `liberarEstacionamiento` | **Conectada.** Arreglaba un cupo que se quedaba tomado sin nadie dentro al deshacer una salida |
   | `obtenerLegalesDelCondominio` | **Conectada**, y de ahí salió que el precheckin enseñaba términos inventados |
   | `permisosDeUnidad` / `guardarPermisosDeUnidad` | **Conectadas** en R-34 |
   | `subirComprobante` | **Conectada** en R-27 |
   | `cancelarSuscripcion` | **Descartada.** «Las bajas pues no hace falta» |
   | `obtenerSolicitudes` (historial de reportes) | **Descartada: no está en el alcance.** El KT solo dice «reportes» sin detallar, marca el panel del administrador como `[PENDIENTE] de sesión dedicada` (línea 277) y avisa de que no hay reglas de auditoría formales (451) |

   Las cuatro de `precheckin.repo` que el script sigue contando son **falso
   positivo**: las llama la web pública, no la aplicación. El script solo mira
   `src/`.

   Lo que decía: (`npm run sueltas`).
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

10. ~~**Cuatro botones que son funciones sin construir.**~~ **Cerrado**
    (25/09/2026). Retirados los cuatro, después de comprobar uno a uno que no
    tenían dónde apoyarse:

    | Botón | Por qué no se conecta |
    |---|---|
    | «Adjuntar Documento» y «Adjuntar Imagen» de un anuncio | `publicacion` no tiene ninguna columna de adjuntos |
    | La cámara sobre el avatar del perfil | No hay columna de avatar en **todo** el esquema |
    | «Importante:» subrayado en el modal de familiar | Ni llevaba a ningún sitio ni había nada después de los dos puntos |

    El cuarto --las tarjetas de `ComunidadScreen`-- se queda, porque esa
    pantalla entera se retiró del navegador (R-11) y el archivo conserva su
    diseño. Lleva escrito arriba que no está en uso, y la marca del contador
    bajó de 4 a 1.

    Lo que decía: Los encontró
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

11. ~~**Pantallas enteras que nadie puede alcanzar.**~~ **Cerrado**
    (25/09/2026), y resultaron ser **tres**, no dos: `AdministradorZonas` --un
    segundo administrador de zonas comunes en paralelo al que sí se usa--,
    `AgregarServicio` --que además simulaba el guardado y no escribía nada-- y
    `Comunidad`, que no estaba en la lista y salió al contar quién navega a
    cada una: cero en las tres.

    Se retiran las rutas, no los archivos: el diseño ya está hecho y si alguna
    se retoma solo hay que volver a registrarla. Lo que se quita es que
    figuren como algo que la aplicación ofrece.

    Lo que decía: Están registradas como
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

13. ~~**Los interruptores no dicen su estado a un lector de pantalla.**~~
    **Cerrado** (25/09/2026), y la causa no era la que parecía. No es que a
    alguien se le olvidara ponerlo: el código **sí** declara
    `accessibilityState={{ checked }}`, y **react-native-web 0.21 no lo
    traduce**. El elemento sale con su `role` y sin `aria-checked`.

    Lo confirmé leyendo los atributos del DOM en el navegador. Hace falta
    `aria-checked` además, que entienden igual React Native y la web.

    Arreglado en `Toggle` y en `Checkbox`, que son compartidos, y en las
    opciones de una votación --que además eran `button`, donde el estado no se
    puede anunciar--. Con prueba de componente que lo fija: era la tercera vez
    que aparecía el mismo error.

14. ~~**Al entregar un paquete en portería no se registra quién se lo
    llevó.**~~ **Cerrado** (25/09/2026): el cliente decidió pedir el nombre
    siempre, no solo en la entrega a puerta. El modal cambia de título según
    el caso --«Entrega en Puerta» o «Entrega en Portería»-- y el campo lleva
    su etiqueta.

    Lo que decía:
    La app solo pide el nombre cuando la entrega es **en puerta**; si el vecino
    baja a recogerlo, `entregada_a` queda en `null`.

    La columna existe y el repositorio la acepta. El comentario de su migración
    dice para qué está: *«sin esto, "yo nunca recibí ese paquete" no tiene
    respuesta»*. Y el mostrador de portería es justo donde nace esa discusión.

    El KT (flujo 4.5) describe el registro del paquete y el permiso de entrega
    directa, pero **no dice nada del momento de la entrega**: es un hueco, así
    que no lo decido. Mi opinión, para lo que valga: si se pide el nombre en la
    puerta, con más razón en el mostrador.

15. ~~**Se puede reservar una hora de hoy que ya pasó.**~~ **Cerrado**
    (25/09/2026): el cliente decidió que **un residente no puede, pero
    portería y administración sí**, porque registran usos ya ocurridos.
    `reserva_no_en_el_pasado` compara ahora fecha **y** hora, en la zona
    horaria del condominio, y deja fuera al personal. Dos casos nuevos, con el
    control positivo al lado.

    De paso rompió un caso que llevaba ahí desde antes --reservaba hoy a las
    07:00, que por la tarde ya pasó-- y que ahora calcula una hora futura.

    Lo que decía: A las 18:45 la pantalla
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

27. ~~**Nadie cobra las zonas comunes.**~~ **Cerrado** (25/09/2026). El
    cliente decidió cobro manual y el KT ya lo tenía escrito en el flujo 4.4:
    el pago va fuera de la aplicación, el comprobante por el chat con
    administración, y la administración aprueba a mano. Sin verificación
    automática contra el banco.

    La pantalla de reservar lo dice ahora, en vez de enseñar tres cifras
    sueltas. Y el detalle de la reserva, del lado de administración, enseña el
    comprobante si viene adjunto: `subirComprobante` y las dos políticas del
    bucket llevaban días hechas sin que ninguna pantalla las llamara, así que
    la aprobación se hacía a ciegas. Comprobado de punta a punta en
    `comprobante-de-pago.test.ts`: lo sube quien reservó, lo lee la
    administración, y el dueño de otra vivienda no.

    **Queda una decisión pequeña**: el KT manda el comprobante por el chat, y
    `reserva_zona.comprobante_path` permite adjuntarlo a la reserva, que se
    pierde menos. Hoy funcionan los dos caminos; conviene elegir uno.

    Lo que decía: La piscina tiene 30.000 de costo de
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
    para pagar eso?»-- y la respuesta entonces era **que no podía**: no había
    ninguna pantalla, ningún botón y ninguna tabla. Veía tres cifras y se
    acababa ahí.

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

31. ✅ **RESUELTO el 02/10/2026.** Las fotos del documento no se guardaban. Se pueden subir y la pantalla
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

33. ~~**El reporte generado no se puede leer.**~~ **Cerrado** (25/09/2026):
    el cliente pidió Excel con formato, y ya se descarga. Encabezados en
    español --«Entregada a», no `entregada_a`--, fechas como `25/09/2026
    14:03` en vez de ISO con zona, anchos de columna calculados del contenido
    y la fila de encabezados fija al desplazarse.

    La frase de la pantalla mezclaba dos cosas: **la descarga no dependía del
    proveedor de correo**. Ahora el botón crea el archivo y el aviso habla
    solo del envío automático mensual, que sí lo necesita.

    Comprobado en el navegador de punta a punta --`veciyo-visitantes-
    historial-completo.xlsx`, 18 KB, con su tipo MIME-- y con pruebas que
    escriben el libro y lo **vuelven a leer**: los encabezados, el formato de
    las fechas y que los números sigan siendo números, para que la columna de
    aforo se pueda sumar en Excel.

    En móvil se guarda y se ofrece compartir, que es como un archivo llega
    donde el usuario quiera; **eso no lo he podido probar yo**.

    Lo que decía: La pantalla dice cuántos
    registros devolvió y ahí se acaba: no enseña las filas, no se descargan y
    no se envían. El texto lo explica con *«la descarga y el envío por correo
    estarán disponibles cuando se configure el proveedor de correo»*, y ahí
    hay dos cosas mezcladas: **la descarga no depende del proveedor de
    correo**. Un CSV se puede generar hoy.

    Un reporte cuyo único resultado es un número no sirve para lo que existe:
    el KT lo pone entre las funciones del administrador, y quien lo pide
    necesita las filas.

34. ~~**No se pueden dar permisos a una vivienda concreta.**~~ **Cerrado**
    (25/09/2026). La pantalla de Permisos empieza ahora con un selector --«Qué
    se está configurando»-- entre todo el edificio y cada vivienda, y llama a
    `permisosDeUnidad` y `guardarPermisosDeUnidad`, que llevaban días escritas
    sin que nadie las usara.

    Lo que se deja sin tocar sigue la regla del edificio: `permisos_de_unidad`
    combina campo a campo, así que una excepción no reemplaza las otras
    dieciocho reglas. La pantalla lo dice.

    Y ahí vive el umbral nuevo --«hasta cuántas noches cuenta como estancia
    corta»--, que solo se pregunta si el edificio diferencia las dos: si no,
    no hay dos lados que separar.

    Lo que decía: `permisosDeUnidad`
    y `guardarPermisosDeUnidad` están escritas y no las llama nadie. La
    pantalla de Permisos configura **solo el ajuste general del edificio**.

    La tabla tiene `unidad_id`, la función `permisos_de_unidad` combina campo
    a campo la fila de la vivienda con la del condominio, y el KT dice
    literalmente que el permiso de entrega directa *«vive a nivel unidad,
    configurado por el Administrador»*. Todo el mecanismo está montado y no
    hay pantalla que lo use: la excepción que la administración puede conceder
    a una vivienda no se puede conceder.

35. ✅ **RESUELTO el 02/10/2026.** Las cocheras de visita se contaban en dos sitios y no daban lo mismo.
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

36. ✅ **RESUELTO el 02/10/2026.** Borrar una torre no se llevaba sus viviendas.
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

37. ✅ **RESUELTO el 02/10/2026.** El administrador no podía aprobar una reserva por el camino de administración. Salió recorriendo Zonas Comunes como Marcela.

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

39. **Veintitrés controles que solo llevan un icono y no dicen cómo se
    llaman.** Salió recorriendo administración: el «+» de la pantalla de
    Seguridad no aparecía en el árbol de accesibilidad, y al ir a buscarlo
    resultó que no era el único.

    Un `Pressable` cuyo único contenido es un icono no tiene nombre: un lector
    de pantalla anuncia «botón» y se acaba ahí. Los peores eran los
    **compartidos**, porque salen en todas partes:

    | Control | Dónde sale |
    |---|---|
    | «Volver» de `PageHeader` | Todas las pantallas |
    | Las dos flechas del calendario | Todos los calendarios |
    | La campana de notificaciones | Barra superior |
    | Mostrar/ocultar contraseña | Todos los formularios de acceso |
    | El botón de información | Donde haya ayuda |
    | La X de todos los modales | Todos los modales |

    Y dos que no son de comodidad: en una llamada, **contestar y colgar son
    dos círculos del mismo tamaño que solo se distinguen por el color**. Quien
    no ve el color tiene una probabilidad entre dos de colgar en vez de
    contestar.

    Ocho arreglados, los de más superficie. **Quedan 15**, con tope en
    `npm run controles`, enganchado a `pretest`: el número puede bajar, no
    subir. Los que quedan son de pantallas concretas y se irán cerrando al
    recorrerlas.

    Esto conecta con R-13, que preguntaba si la accesibilidad entra en el
    alcance. Sigue sin responderse, pero estos ocho no eran una mejora: eran
    controles que no dicen qué hacen.

40. ~~**El buscador del directorio no encontraba a ningún propietario.**~~
    **Cerrado** (25/09/2026). El campo dice «Buscar torre, depto,
    **propietario**, estacionamiento, depósito», y buscar «Guillermo» --dueño
    de dos viviendas, con su nombre escrito en esa misma pantalla-- devolvía
    «Sin resultados».

    La causa: buscaba en `propietarioAsignado`, que **solo se rellena en
    memoria** cuando se asigna un propietario en esa misma sesión y vuelve a
    estar vacío al recargar. El nombre de verdad estaba al lado, en
    `contactos`, que sí sale de la base.

    El mismo campo salía en tres sitios más:

    - la tarjeta del directorio decía «Propietario: —» arriba y, tres líneas
      más abajo, «Propietario: Guillermo Provenzano»;
    - por lo mismo, el distintivo «Primario» no se encendía nunca;
    - y la **pantalla de cuotas** decía «Sin propietario» en las cuatro
      viviendas, que es justo donde hace falta saber a quién se le cobra.

41. ✅ **RESUELTO el 02/10/2026: ya hay alguien al otro lado.** El cliente
    decidió crear el rol que faltaba —quien opera la plataforma— con un alcance
    explícito: **lo de la plataforma y nada de los vecinos**. Con eso, las dos
    decisiones que bloqueaban esto quedan tomadas:

    - **quién lee un reclamo de área `aplicacion`**: el staff de plataforma, y
      nadie del condominio. La política pasó a mirar el área:
      `creado_por = auth.uid()`, o la administración **si el área no es
      `aplicacion`**, o el staff de plataforma **si lo es**. Lo mismo en
      `puede_ver_reclamo`, para que el bucket de adjuntos no diga otra cosa.
    - **`destinatario` se retira de hecho**: sigue sin usarse. El discriminador
      es `area`, que es lo que el formulario escribe de verdad, y dos columnas
      para lo mismo es la segunda fuente de verdad que prohíbe la regla 1. Queda
      como columna muerta hasta que producto decida si significa algo distinto.

    Es un cambio de comportamiento visible: esas PQRS **desaparecen** de la
    lista de la administración. Es lo que se quiere.

    Está en `20261002120000_el_dueno_de_la_plataforma.sql`, y lo comprueban
    `dueno-de-la-plataforma.test.ts` (34 casos) y los cuatro de
    `pqrs-quien-lo-lee.test.ts` que documentaban el comportamiento anterior, ya
    reescritos. Como avisaba el último párrafo de abajo, esas pruebas se
    pusieron rojas y obligaron a venir aquí: funcionaron como estaba previsto.

    Lo de abajo queda como estaba, porque explica por qué esto no se arregló
    antes.

    ---

    **La administración del edificio lee los reclamos dirigidos al soporte de
    VeciYo.** Salió recorriendo el Centro de Atención como Marcela: entre los
    reclamos del condominio aparecían varios marcados **«Aplicación VeciYo ·
    Soporte»**, que son quejas sobre el producto, no sobre el edificio. Hoy
    hay **114 así**.

    La política de lectura es
    `creado_por = auth.uid() OR es_admin_condominio(condominio_id)`: **no mira
    ni el área ni el destinatario**.

    Y hay una columna hecha exactamente para esto. `reclamo.destinatario` es
    un enum --`administrador | propietario | aplicacion`-- que **no escribe
    nadie y no lee nadie**: está vacío en las 230 filas.

    El caso que importa es previsible: alguien escribe al soporte de VeciYo
    para quejarse de la administración de su edificio, y la administración lo
    lee entero. Comprobado, no supuesto, en `pqrs-quien-lo-lee.test.ts`, que
    crea uno y lo lee como Marcela.

    Es la misma forma que el hilo de una vivienda con portería, que **sí** se
    resolvió (D-13): la administración tiene su propio hilo y no entra en el de
    seguridad. Aquí no hay esa separación.

    **Por qué no lo arreglo yo.** Si la administración deja de verlos, hay que
    decir quién los atiende: en la aplicación no hay ningún rol de soporte del
    producto, así que cerrarlo sin más dejaría 114 reclamos sin nadie al otro
    lado. Son dos decisiones:

    - **quién lee un reclamo de área `aplicacion`** --nadie del condominio, un
      rol de soporte que habría que crear, o una bandeja fuera de la app--;
    - y si `destinatario` se rellena de una vez o se retira, porque hoy es una
      columna que promete una separación que no existe.

    La prueba deja constancia del comportamiento de ahora. Si se decide
    cambiarlo, se pone roja y obliga a venir aquí.

42. ~~**Los interruptores de Permisos no decían qué controlaban.**~~
    **Cerrado** (25/09/2026). Salió al comprobar el selector nuevo: los siete
    de esa pantalla salían en el árbol de accesibilidad como «(sin nombre)»
    con su valor al lado.

    La causa era otra que la de R-13, aunque se parezca: `Toggle` saca su
    nombre de `label`, y media docena de pantallas ponen el rótulo en un
    `<Text>` hermano --para que quede a la izquierda y el interruptor a la
    derecha-- y llaman a `Toggle` sin `label`. El resultado son siete
    interruptores seguidos que se anuncian igual.

    `Toggle` acepta ahora `accessibilityLabel` para ese caso. Los siete de
    Permisos lo llevan, comprobado en el navegador antes y después.

43. **El tope de tres días estaba escrito en dos sitios.** Se quitó de
    `PERMISOS_INICIALES` (R-32) y la pantalla de Permisos lo volvía a poner
    con un `estanciaMaxima ?? 3` en su propio estado inicial. Quitado también
    ahí. Es el mismo valor inventado dos veces, que es como estos vuelven.

44. ~~**No se podía cambiar de rol sin cerrar sesión.**~~ **Cerrado**
    (25/09/2026), y era el último punto del recorrido de administración.

    `setRolActivo` solo se llamaba desde `SeleccionRolScreen`, que sale **una
    vez** al entrar. Marcela es administradora del edificio y propietaria de la
    301 a la vez --el KT dice que una persona puede tener varios roles-- y para
    pasar de uno a otro tenía que cerrar sesión y volver a entrar.

    En web todavía se podía recargar la página, porque el rol activo no se
    guarda. En el móvil, con la sesión en SecureStore, cerrar sesión era la
    única salida.

    Ahora hay «Cambiar de rol» en Perfil, que solo aparece con más de uno.

45. ✅ **RESUELTO el 29/09/2026: los bloques se quitan.** Decisión del cliente.
    La zona se configura con apertura, cierre y duración, y de ahí salen las
    franjas. Se fueron del formulario, del esquema, del tipo y del guardado
    --incluido el cálculo que los componía para nada--. Si algún día hace falta
    ofrecer «10:00-12:00 y 16:00-18:00 y nada en medio», hará falta la columna y
    el guardado de verdad. Lo de abajo queda como registro.

    **El administrador editaba bloques horarios que no se guardaban.** El formulario de la zona tiene «usa bloques» y una lista de
    bloques con su hora de inicio y fin. La pantalla los compone al guardar
    --`${bloque.inicio} - ${bloque.fin}`-- y **no los mete en los datos que
    envía**: se guarda que la zona «usa bloques», pero no cuáles.

    Y no hace falta que se guarden, porque las franjas ya no salen de ahí: se
    derivan de la hora de apertura, la de cierre y la duración máxima, en
    `franjas()`, que es lo que arregló que el selector de horas no ofreciera
    nada. Así que el administrador está rellenando una lista que nadie lee.

    **La decisión es de producto**: o la zona se configura solo con apertura,
    cierre y duración --y los bloques salen del formulario--, o los bloques son
    explícitos y hacen falta una columna y un guardado. Lo segundo tiene
    sentido si un edificio quiere ofrecer «10:00-12:00 y 16:00-18:00» y nada
    en medio, que con apertura y cierre no se puede expresar.

46. ✅ **RESUELTO — el documento se quedó sin marcar.** Comprobado hoy
    (30/09/2026) siguiendo la cadena entera: la pantalla de visitas pasa
    `onUpdateInvitado`, la tarjeta del invitado abre «Corregir datos» con el
    nombre y el documento, y el botón «Guardar corrección» llama a la función
    del repositorio. Tiene además prueba de componente.

    **Lo que pasaba:**
    No había forma de corregir los datos de un invitado.
    `actualizarInvitado` existe en el repositorio --«datos de un invitado que
    el anfitrión puede corregir antes del ingreso»: nombre, documento, tipo de
    documento, si es menor--, el hook la expone, la pantalla de detalle recibe
    el `onUpdateInvitado` que la llamaría, y **ningún control la invoca**.

    Venía del botón de TRA/SIRE, que marcaba estado local y se reimplementó
    contra la base; al cambiarlo, el único camino que llegaba a esa función se
    quedó sin usar.

    Importa porque el guardia compara el documento con la persona: un nombre o
    un número mal escritos en la invitación son una entrada denegada en la
    puerta. El KT no dice nada de corregir datos de un invitado --ni a favor ni
    en contra--, así que **es un hueco**: ¿puede el anfitrión corregirlos hasta
    que el invitado llega, o una vez emitida la invitación queda fija?

47. ✅ **RESUELTO el 29/09/2026 con el mockup.** El prototipo --el diseño con el
    que se acordó la pantalla-- reparte el día así: mañana 06-12, **tarde
    12-18**, resto noche. Mi versión acababa la tarde a las 20:00, a ojo. Ya
    está alineada, con su caso de prueba. Lo de abajo queda como registro.

    **Las franjas las puse yo.**
    Al arreglar los turnos, `shiftOfHour` comparaba el texto
    --`hora.startsWith("06:00")`--, así que un turno que no empezara exactamente
    a las 06:00 o a las 12:00 caía en «Noche». Ahora clasifica por la hora de
    entrada: 06:00–12:00 mañana, 12:00–20:00 tarde, el resto noche.

    Los límites son míos: el KT no los fija y el selector del formulario ofrece
    otras cuatro franjas distintas (00–06, 06–12, 12–18, 18–24). **Conviene que
    el cliente diga cuáles son sus turnos**, porque hoy el filtro y el selector
    no hablan del mismo reparto del día.

48. ✅ **RESUELTO el 29/09/2026 con el mockup.** El prototipo tenía **los dos
    filtros**, uno al lado del otro, así que se quedan: el defecto no era
    tenerlos sino que decían cosas distintas --la tarde acababa a las 20:00 en
    uno y a las 18:00 en el otro--. Con el corte del mockup (18:00) hablan del
    mismo reparto del día. Lo de abajo queda como registro.

    **Dos filtros que preguntan lo mismo.**
    «Horarios» ofrece las cuatro franjas de seis horas --00–06, 06–12, 12–18,
    18–24-- y «Turnos» ofrece mañana, tarde y noche. Son dos formas del mismo
    reparto del día, con **límites distintos**: para «Turnos», la tarde acaba a
    las 20:00; para «Horarios», a las 18:00.

    El de «Horarios» además no encontraba a nadie: comparaba el rango del turno
    con la etiqueta de la franja letra por letra, así que un turno de 06:00 a
    14:00 no era «06:00 - 12:00». Ahora casa por solapamiento, que es lo que
    significa «quién trabaja por la mañana», y ya devuelve resultados.

    Queda la pregunta de producto: **¿hacen falta los dos?** Un solo filtro con
    las franjas que el cliente use de verdad sería más claro que dos que se
    pisan. Va junto al punto 47, que es el mismo asunto por el otro lado: los
    límites de mañana/tarde/noche los puse yo porque el KT no los fija.

49. ✅ **RESUELTO en parte el 29/09/2026, y con una corrección a lo que decía
    este punto.** El cliente aprobó que el formulario traiga los datos.

    **Lo que decía mal:** «si guarda sin rellenarlos, los borra». **No los
    borra.** La mutación de edición solo escribe la visibilidad y los primarios
    --lo dice su propio comentario: «la edición toca lo que es de la membresía y
    nada más»--; el resto de los campos los ignora. El defecto real era más
    leve: el formulario ofrecía once campos que al editar no hacían nada.

    Lo hecho:

    · **Los tres del contacto de emergencia sí estaban en la tabla** y el
      `select` no los pedía: ahora se traen y se ven al editar.
    · **`fechaInicio`, `duracion`, `montoAlquiler` y `monitoreoPago` no los
      pintaba ningún formulario.** Eran cuatro campos muertos del esquema,
      heredados del prototipo; se quitaron.
    · **El correo no se pide al editar**: no se puede cambiar desde ahí --es el
      de la cuenta-- y salía en blanco.

    **Y apareció algo peor, que sí necesita tu criterio (ver 61).**

    Lo de abajo queda como registro.

    **Al editar un residente, once campos arrancaban vacíos.** El formulario de
    «Crear rol» se reutiliza para editar, y lee veintiún campos de la persona.
    La consulta que alimenta la lista —`obtenerResidentesDeUnidad`— trae dieciséis:
    faltan `correo`, `tipo`, `codigoArea`, los tres del contacto de emergencia,
    `fechaInicio`, `duracion`, `montoAlquiler` y `monitoreoPago`.

    Así que quien edita a un residente ve esos campos en blanco y, si guarda sin
    rellenarlos, los borra. Estaba tapado por un `Partial<Residente> &
    Record<string, any>` en la firma del hook, que aceptaba cualquier cosa.

    Salió al tipar. **La decisión es de producto**: o la consulta trae esos
    campos —hay que ver de dónde: el contacto de emergencia y el monto del
    alquiler no están en `membresia_unidad`—, o el formulario de editar no los
    ofrece. Lo que no puede quedarse es ofrecerlos vacíos y guardarlos vacíos.

    De paso se arregló uno del mismo sitio que sí era claro: se leía
    `editData?.menorEdad`, campo que no existe en ningún tipo —el dato se llama
    `esMenor`—, así que al editar a un menor la casilla salía desmarcada siempre.

50. ✅ **RESUELTO el 29/09/2026: la tarjeta ya lleva título.** Dice
    «Coadministrador», así que se ve de qué habla ese párrafo y deja de parecer
    la explicación del «+» que tiene encima. Lo de abajo queda como registro.

    **El «+» parecía pertenecer a la tarjeta de debajo, y hace otra cosa.** El «+» lleva a
    crear un rol —agregar a alguien a la vivienda—, y justo debajo hay una
    tarjeta que explica qué es un coadministrador: «Empresa o persona que te
    ayuda con la gestión de tu propiedad…».

    Esa tarjeta **no tiene título**. En el código el bloque se llama
    «Coadministrador info card», pero en pantalla es un párrafo suelto, así que
    quien lo lee no sabe de qué sección habla ni si el «+» de arriba sirve para
    eso.

    Salió recorriendo la pantalla como propietaria. **Es visual**, así que no lo
    decido: hace falta el título de la tarjeta, y decidir si el «+» se queda
    donde está o se mueve junto a «Residentes actuales», que es lo que agrega.

51. **La explicación del flujo de huésped temporal (28/09/2026) contradice dos
    decisiones del KT.** Llegó como resumen corto, de segunda mano, así que no
    la doy por decidida: el KT es la fuente de las reglas de negocio y estas dos
    están marcadas `[DECIDIDO]` ahí.

    · **«Paga suscripción en la página de visitas o en configuración.»** El KT
      §"Modelo de negocio" dice lo contrario y con motivo escrito: *el cobro de
      la suscripción se hace fuera de la app (web), no in-app*, explícitamente
      para no pagar la comisión del 15% de Apple y Google. Si «la página de
      visitas» es el sitio desde donde se **entra** al pago —y el pago ocurre en
      web— no hay contradicción. Si es cobro dentro de la app, sí la hay.

    · **«Se revisa Antecedentes Policiales, TRA, SIRE» durante el registro del
      huésped.** Los antecedentes sí: el KT dice que corren automáticamente en
      el precheckin. El TRA y el SIRE **no**: *solo cuando Seguridad confirma el
      ingreso físico del huésped se habilita al Anfitrión el botón para hacer el
      reporte, nunca antes, nunca automático*, y hay una decisión aparte que
      prohíbe automatizarlo por el solo hecho de tener el RNT cargado.

    Es el mismo patrón que costó deshacer el bloqueo por aforo: razonable al
    leerlo, contrario a una decisión explícita.

52. **«Mensaje sincronizado con Airbnb».** ✅ **Respondido el 28/09/2026: sí se
    va a integrar, pero *todavía no*. Las integraciones --Airbnb, proveedor de
    antecedentes, TRA/SIRE-- se ven después; no se empiezan ahora.** Lo de abajo
    queda como registro de por qué se preguntó.

    No existía como decisión en ninguna parte. En el KT, Airbnb aparece solo como referencia del ecosistema y como
    PMS de terceros *con los que eventualmente se podría integrar*, marcado
    `[EN DISCUSIÓN]`. Una sincronización real —leer reservas de Airbnb y emitir
    el código de acceso desde ahí— es un integración entera, con su proveedor,
    sus credenciales y su modelo de datos. Hace falta saber si es objetivo de
    esta entrega o una aspiración.

53. **«Se le otorga usuario y contraseña» al terminar el precheckin.** Hoy el
    huésped **se autorregistra** y el acceso viaja como token de un solo uso
    (`abrirPrecheckin`, `reemitirAccesoHuesped`); no hay ningún sitio que cree
    una cuenta con contraseña y se la mande. Entregar una contraseña por correo
    es además una decisión de seguridad, no de interfaz. Falta saber si se
    quiere una cuenta real —con su cambio de contraseña obligatorio— o basta con
    el acceso por token que ya existe.

54. **¿A quién llega el correo al crear la visita?** La explicación dice las dos
    cosas: *«les llega un correo a todas las personas»* y *«uno es el líder […]
    entra el líder de la reserva»*. No es lo mismo: si cada invitado recibe su
    propio código, cada uno hace su propio registro; si solo lo recibe el líder,
    él responde por los demás. De eso depende si el código de acceso se emite
    por invitado o por reserva.

    Dato de contexto: hoy el envío de correo de invitaciones **está apagado a
    propósito** para poder probar.

55. **«El huésped no llena todos los campos, las validaciones rellenan los
    demás.»** No está en el KT y no se puede adivinar: qué campos se rellenan
    solos, y de dónde salen —¿del documento escaneado, del proveedor de
    antecedentes, de la reserva de Airbnb?—. Un campo que se rellena solo y va a
    un reporte legal necesita saber quién lo afirmó.

56. **«Menor de edad para poner documentos de titularidad» y la queja de un
    vecino contra un huésped (PQRS).** Dos huecos más pequeños:

    · Del menor, el KT solo tiene el checkbox `esMenor` por invitado y su badge
      «👶 Menor». Pedir los documentos del adulto responsable es nuevo: hay que
      decidir de quién son esos documentos y dónde se guardan.
    · El Centro de Atención (PQRS) existe en código, pero una queja **contra una
      persona concreta** —un huésped temporal— no es lo mismo que una queja
      sobre el edificio: tiene señalado, tiene consecuencias y probablemente
      tiene que llegarle al anfitrión que lo alojó. Nada de eso está definido.

    Lo que sí coincide con lo que ya hay: **«Checkout, se le deshabilita en la
    aplicación»** es exactamente lo que hace hoy la base —`es_huesped_alojado`
    exige `vigente_hasta >= current_date`— y por eso el rol huésped de prueba
    lleva caducado desde el 26/09.

57. ✅ **RESUELTO el 29/09/2026: quitados.** El cliente decidió no implementar
    Face ID, huella ni 2FA por ahora --aunque estén en los requerimientos-- y
    sacarlos de la pantalla. Se quitaron del formulario, del esquema, del store
    y de los tipos; queda «Pausar cuenta», que sí avisa de que no está
    disponible. Lo de abajo queda como registro.

    **Eran interruptores que no hacían nada, y el tercero prometía seguridad.** Viven en un store de Zustand
    en memoria --`perfil-store`, que lo dice en su propio comentario: «lo que
    todavía no tiene su sitio en la base»--. Comprobado en la aplicación:
    encender «Factor F2A», salir de la pantalla y volver, y está apagado.

    Los tres están en la misma familia que las ocho casillas decorativas, pero
    este es peor que los otros: quien enciende la verificación en dos pasos
    **cree que su cuenta tiene una segunda barrera** y no la tiene. Un
    interruptor de seguridad que miente es peor que no ofrecerlo.

    No lo decido yo porque la salida no es obvia: implementar 2FA de verdad es
    trabajo con decisión de producto detrás, y esconder los interruptores
    también es una decisión. Lo que no puede quedarse es como está.

    Pausar y eliminar la cuenta, en cambio, **están bien resueltos**: avisan que
    todavía no están disponibles y mandan a Soporte, sin fingir.

58. 🔶 **CASI: de las tres cosas que faltaban, dos hechas el 02/10/2026.** Para que el correo de la contraseña llegue de verdad faltaba configurar el proyecto. La llamada ya está hecha --era un simulacro y ahora se pide a
    Supabase--, pero el envío depende de tres cosas que no son código:

    · **No hay SMTP propio.** El proyecto usa el servidor compartido de
      Supabase, limitado a **dos correos por hora** y pensado solo para
      desarrollo. En producción eso no sirve.
    · **`site_url` es `http://localhost:3000`** y la lista de redirecciones
      permitidas está **vacía**, así que el enlace del correo llevaría ahí. La
      aplicación apunta a `EXPO_PUBLIC_WEB_URL` (`veciyo-web-seven.vercel.app`), que
      hay que añadir a esa lista, con la ruta `/nueva-contrasena`.
    · **Esa ruta no existe todavía en la web.** Sin ella, quien pulse el enlace
      llega a una página que no sabe recibirlo.

    Y un dato que sale de probarlo: **Supabase rechaza el dominio
    `@veciyo.test`** --«Email address is invalid»--, así que este flujo no se
    puede recorrer entero con las diez cuentas de prueba. Hace falta una cuenta
    con un correo real para comprobarlo.

59. ✅ **RESUELTO el 29/09/2026.** Ni el alcance ni el KT dicen nada de si uno
    se ve a sí mismo en esa lista. **El mockup tampoco contempla el caso** --en
    el prototipo quien mira es siempre el propietario-- pero sí pone al
    inquilino líder **como una fila más** de la lista (Alberto Manual, en los
    datos sembrados), con la ficha del propietario en su tarjeta aparte.

    Así que se aplicó lo recomendado, que es lo mismo que hacía el mockup: uno
    se aparta de la lista **solo si su ficha se pinta aparte**, y esa tarjeta
    existe únicamente para el propietario. La regla vive en
    `residentesDeLaLista`, con su prueba. Comprobado en la aplicación: como
    Laura dice «Residentes actuales (2)» y ella sale como «Residente Inquilino
    Lider».

    Lo de abajo queda como registro.

    **Una inquilina líder no se veía a sí misma, y el contador decía uno donde
    viven dos.** La 205 tiene
    dos membresías activas --Guillermo, propietario, y Laura, inquilina
    líder--; la pantalla anuncia «Residentes actuales (1)» y lista solo a
    Guillermo.

    No es un fallo de la consulta: `usePropietarioConfiguracion` aparta al
    usuario de la lista a propósito --`todos.filter(r => r.usuarioId !==
    usuarioId)`-- y lo deja en `yo`, para pintarlo en su propia tarjeta. Pero
    **esa tarjeta se pinta solo si `rolActivo === "propietario"`**, así que para
    una inquilina líder no existe: se aparta de la lista y no aparece en ningún
    otro sitio.

    Tiene consecuencia: es quien gestiona la vivienda, puede ver y corregir los
    datos de los demás --teléfono, datos visibles, chat, WhatsApp-- y no puede
    ver ni corregir los suyos.

    Dos salidas posibles, y por eso no la decido: o la tarjeta propia se pinta
    también para el inquilino líder, o se deja de apartar al usuario de la lista
    cuando no hay tarjeta propia --que además arregla el contador de una vez--.
    Lo segundo es lo que yo haría.

60. ✅ **RESUELTO el 29/09/2026 — el documento se quedó sin marcar.** Lo
    arreglé esa noche con la migración `quien_configura_el_alojamiento` y se me
    olvidó cerrarlo aquí; comprobado hoy contra la base: las seis políticas y
    `guardar_alojamiento` usan ya la regla nueva.

    **Lo que pasaba:** cualquiera que viviera en la vivienda podía cambiar la
    configuración de renta corta, incluidas las claves de la puerta. `guardar_alojamiento` pregunta
    por `puede_operar_unidad`, que es «ser miembro de la unidad o personal del
    condominio», y `es_miembro_unidad` cuenta **todos** los roles menos el
    huésped temporal: propietario, inquilino líder, **residente**,
    **corresidente** y coadministrador.

    O sea que un residente --un hijo mayor de edad al que el propietario dio de
    alta-- puede cambiar el RNT, el máximo de huéspedes, el precio, y las
    contraseñas del wifi y de la puerta.

    **Hoy no es explotable**: el único residente con ese rol en los datos
    (Martin, de la 101) no tiene cuenta, así que no puede entrar. Es el
    comportamiento del sistema, no un incidente.

    El KT dice que el propietario es el superadministrador de su unidad y que
    **delega** en inquilino líder o coadministrador, lo que sugiere que residente
    no debería entrar ahí. Y `membresia_unidad` ya tiene una columna `permisos`
    --hoy en `{}` para todos-- que parece pensada justo para esto y no se usa
    para decidirlo.

    Hace falta decidir qué roles configuran el alojamiento. Es un límite de
    seguridad, así que no lo elijo yo.

61. ✅ **RESUELTO el 29/09/2026: los tres se quitan.** Decisión del cliente,
    siguiendo lo recomendado. El documento lo rellena la propia persona en su
    perfil al registrarse, y la tarjeta de cada residente ya muestra «CI:», así
    que quien invita no tiene por qué saberlo. Se fueron del formulario, del
    esquema y del hook --incluido `TIPO_DOC_OPCIONES`, que era un cuarto
    vocabulario propio («Cedula», «Pasaporte», «DNI») que no coincidía con el
    enum `tipo_documento` de la base--. Lo de abajo queda como registro.

    **Se pedían al invitar y no se guardaban en ninguna parte.** Salió revisando el 49:
    el formulario de alta los pide, y la mutación que crea la invitación usa solo
    el nombre, el correo, el teléfono, el rol y el contacto de emergencia. Los
    tres se tiran.

    No es «al editar arrancan vacíos» --eso era el 49--: es que **al dar de alta
    tampoco se guardan**. Quien invita a un residente escribe «Cédula de
    ciudadanía / 1098765432 / +57» y eso no llega a la base.

    El documento sí acaba existiendo, pero por otro camino: lo rellena la propia
    persona en su perfil al registrarse, y de ahí lo lee la lista (`ci` sale de
    `perfil.identificacion`).

    **Mi recomendación: quitarlos del alta.** Quien invita no tiene por qué saber
    el documento de la persona a la que invita, y la persona lo pone en su
    perfil. Si el cliente prefiere que el anfitrión pueda adelantarlos, hacen
    falta columnas donde guardarlos y decidir qué pasa cuando la persona se
    registra con un documento distinto del que se anotó.

62. ✅ **RESUELTO el 29/09/2026: el límite es del edificio.** Decisión del
    cliente. Se queda `limite_renta_corta_condominio`, que ya se muestra al
    anfitrión como advertencia, y los cuatro campos por vivienda
    --«Estancia mínima» y «Estancia máxima» en la pantalla de permisos-- se
    quitan: nadie los leía.

    Las columnas **no se borran** de `permiso_vivienda` --la regla es no borrar
    datos-- simplemente dejan de ofrecerse y de escribirse. Y se comprobó antes
    de tocarlas que la frontera entre estancia corta y larga **no depende de
    ellas**: la marca `corta_hasta_noches`, que tiene su propio campo con su
    explicación.

    Lo de abajo queda como registro.

    **Dos tablas guardaban los mismos límites y una no la leía nadie.** Salió cruzando los trece límites numéricos del
    esquema con quién los aplica.

    · `limite_renta_corta_condominio` tiene `capacidad_maxima` y
      `estancia_minima_noches`, y **sí se usan**: `LimitesDelEdificio` los
      muestra como advertencia al anfitrión --«El edificio recomienda un mínimo
      de 2 noches y un aforo máximo de 8 huéspedes… Podés continuar: es una
      advertencia, no un límite»--, que es exactamente lo que decidió el KT.
    · `permiso_vivienda` tiene otras cuatro: `corta_estancia_minima`,
      `corta_estancia_maxima`, `larga_estancia_minima` y
      `larga_estancia_maxima`. El administrador las escribe desde su pantalla de
      permisos, `reglas_de_estancia` las devuelve… y **ahí se acaba**. Ni la base
      las impone, ni la aplicación las lee, ni salen en ninguna advertencia.
      `ficha_alojamiento` usa esa misma función, pero solo para las mascotas y
      los niños.

    Así que un administrador puede fijar «estancia máxima de 3 noches» para una
    vivienda y no pasa absolutamente nada.

    **La pregunta no es de pantalla, es de modelo: ¿por qué hay dos sitios para
    lo mismo?** Mi recomendación: quedarse con uno. Si el límite es del
    condominio, vive en `limite_renta_corta_condominio` y ya se muestra; si tiene
    que poder cambiarse vivienda por vivienda --que es lo que permite
    `permiso_vivienda`--, entonces es esa la que debe alimentar la advertencia, y
    la otra sobra. Mantener las dos garantiza que alguna se quede sin leer, que
    es lo que ya pasó.

63. ✅ **RESUELTO el 02/10/2026.** (Parcial el 29/09: las dos divergencias cerradas, la unificación no.)

    Las dos diferencias que el guarda encontró **ya están igualadas en la web**,
    comprobadas recorriendo el flujo:

    · La fecha de nacimiento se pide y se manda. En la base había cero invitados
      con ese dato; el primero se guardó a mano en la prueba del recorrido.
    · El texto del correo dice la verdad: la web muestra el enlace al terminar y
      ya no promete un correo que nadie envía. **Si se quiere el correo de
      verdad, hay que invocar `enviar-invitacion` desde la web**, y eso sigue sin
      decidirse.

    `npm run precheckin` está ahora en `pretest`, así que una divergencia nueva
    rompe `npm test`.

    **Lo que sigue pendiente es la unificación**, y el cliente la confirmó el
    29/09/2026: **hay que hacerla, pero todavía no hay servidor donde probarla**,
    así que queda anotada para cuando lo haya. Escribir el precheckin una sola
    vez obliga a tocar el empaquetado de los dos proyectos --la app va con Metro
    y guarda la sesión con el almacenamiento de React Native; la web con Vite-- y
    eso solo se comprueba desplegando. Mientras tanto lo vigila
    `npm run precheckin`, que está en `pretest`.

    Lo de abajo queda como registro de lo que se encontró.

    **Lo que decía mal:** «las dos llaman a las mismas RPC, así que no hay dos
    comportamientos». Falso: comparé los nombres de las funciones y me quedé ahí.
    Comparando **los argumentos** aparecen dos diferencias reales, y las dos
    están en el camino que de verdad se ejecuta (la web):

    · 🔴 **La fecha de nacimiento del huésped nunca se guarda.** La RPC
      `guardar_precheckin` acepta `p_fecha_nacimiento`, la app la manda, y la web
      **no la manda ni la pide en ninguna pantalla**. En la base hay **0 de 5**
      invitados con fecha de nacimiento. Y el detalle del anfitrión la muestra,
      en «Datos extraídos automáticamente», así que siempre dice «N/A». Importa
      para el reporte a la autoridad y para saber si alguien es menor.
    · 🔴 **Al cerrar el preregistro, nadie le manda al huésped su acceso.** La
      app invoca `enviar-invitacion` con el enlace; la web solo lo devuelve. Es
      justo el incidente que hizo nacer `reemitirAccesoHuesped`: «la demo del
      25/09 se quedó atascada aquí, quien lo vio cerró la pantalla sin copiarlo».

    **Lo hecho:** `npm run precheckin` compara las dos copias --qué RPC llama
    cada una y con qué argumentos-- y falla si divergen. Encontró la primera de
    esas dos a la primera. **No está en `pretest` todavía** porque hoy falla a
    propósito: meterlo bloquearía `npm test` por algo que está aquí para
    decidirse.

    **Unificarlas de verdad no lo puedo hacer solo:** un paquete compartido
    obliga a tocar el empaquetado de los dos proyectos --la app va con Metro y
    guarda la sesión con el almacenamiento de React Native; la web con Vite-- y
    no lo puedo verificar sin desplegar. Lo que hace falta decidir es si esas dos
    diferencias se igualan en la web (corto) o si se monta el paquete compartido
    (más largo, y se acaba el problema).

    Lo de abajo queda como registro.

    **El precheckin está escrito dos veces y los recorridos prueban la copia que
    en producción no se ejecuta.** `precheckin.repo.ts` en la aplicación tiene
    `consultarPrecheckin`, `guardarPrecheckin`, `aceptarTerminosPrecheckin` y
    `cerrarPrecheckin`; `veciyo-web/src/lib/precheckin.ts` tiene las suyas, y
    **no importa nada de la app**.

    Lo bueno: las dos llaman a las **mismas RPC**, así que el límite de verdad
    vive en la base y no hay dos comportamientos. Lo malo: el flujo real --el que
    recorre un huésped con su enlace-- pasa por la web, y los recorridos de
    prueba llaman a las funciones de la app. Están validando un camino que en
    producción no se ejecuta.

    Las otras dos de ese archivo --`abrirPrecheckin` y `reemitirAccesoHuesped`--
    sí las usa la aplicación: son las del anfitrión emitiendo el enlace.

    **Es una decisión de arquitectura y son dos proyectos, así que no la tomo.**
    Las salidas que veo: un módulo compartido que importen los dos, o que los
    recorridos apunten a las funciones de la web. Dejarlo como está significa que
    el día que las dos versiones dejen de coincidir, la suite seguirá en verde.

64. ✅ **RESUELTO el 29/09/2026: ya se puede dar de baja, desde la aplicación.**

    El botón está en la misma pantalla donde se configura la renta corta, con
    una confirmación que dice qué pasa: la vivienda deja de aceptar huéspedes, la
    configuración y el libro se guardan, y las reservas ya hechas no se cancelan
    solas.

    **Por qué en la aplicación y no en la web**, donde sí está el pago: el motivo
    de sacar el cobro fuera es la comisión de las tiendas, y nadie cobra por
    cancelar. Obligar a salir a la web para darse de baja es fricción sin ninguna
    ventaja.

    Comprobado en la aplicación: la pantalla pasa a «no tiene una suscripción
    activa» y la base queda `cancelada` con su fecha.

    ✅ **Y respeta el mes pagado**, decisión del cliente del 29/09/2026. Al darse
    de baja se busca el periodo vigente: si queda mes pagado la suscripción se
    queda `activa` con la fecha de término guardada --y la pantalla dice «sigue
    funcionando hasta el X»--; si no queda nada, se cancela ya. La regla de qué
    cuenta como vigente vive en `suscripcionVigente`, con cinco casos de prueba,
    incluido el del último día: quien pagó hasta el 31 lo tiene el 31.

    Lo de abajo queda como registro.

    **Se podía activar y no cancelar.**
    `cancelarSuscripcion` está escrita y funciona --pone el estado en
    `cancelada` con su fecha-- y **ninguna pantalla la llama**.

    Puede ser deliberado: el KT decide que el cobro se hace en web para no pagar
    la comisión de las tiendas, y quizá la baja también. Pero entonces la función
    en la aplicación es código muerto, y hoy no hay ningún sitio --ni en la app ni
    en la web-- donde alguien se dé de baja.

    Hace falta decidir dónde se cancela. Si es en la app, se conecta en dos
    minutos; si es en web, la función se va.

65. ✅ **RESUELTO el 29/09/2026: se quita.** Decisión del cliente.
    `obtenerSolicitudes` y su tipo se fueron del repositorio.

    La tabla `solicitud_reporte` **sigue registrando** cada reporte que se
    genera --eso lo hace la base-- así que la constancia de quién sacó qué datos
    del edificio no se pierde; lo que se va es el código que nadie llamaba. Los
    dos casos del recorrido que la usaban ahora preguntan a la tabla, que además
    comprueba la política en vez de la función.

    Lo de abajo queda como registro.

    **El historial no se veía en ninguna parte.**
    `obtenerSolicitudes` lee `solicitud_reporte` --quién pidió qué reporte, con
    qué rango y cuántas filas salieron-- y no hay pantalla que lo muestre. La
    tabla se llena: cada reporte que genera la administración deja su fila.

    Es el registro de quién sacó qué datos del edificio, así que tiene valor de
    auditoría. O se enseña, o la tabla y la función sobran.

66. ✅ **RESUELTO el 29/09/2026: lo decide el edificio, y arranca en «sí».**
    Decisión del cliente. `condominio.verificar_documento_visitas` --nueva, con
    `default true`-- manda sobre todas las visitas del edificio, y la
    administración la cambia desde su pantalla de permisos, en un bloque
    «Visitas» con su explicación.

    Va en `condominio` y no en `permiso_vivienda` por dos motivos: lo que se
    pidió es una regla del edificio entero, y esa tabla es la que
    `permisos_de_unidad` devuelve como tipo --añadirle una columna rompe la
    función hasta reescribirla, como ya pasó una vez--.

    Comprobado en la aplicación: una visita de amigos creada por la anfitriona
    llega a la base con `instruccion_documento = verificar`, que antes era
    imposible. Y en el recorrido, que un residente no puede cambiar la regla.

    Lo de abajo queda como registro.

    **La pantalla pedía el documento y a la portería le decía que no lo
    verificara.** Salió creando una visita de
    «Amigos Familiares» de punta a punta como anfitriona.

    El formulario pide el **tipo** y el **número** de documento del invitado, y
    debajo avisa: «Recuerda indicar a tu invitado que debe presentar su documento
    (cédula, pasaporte o DNI) en portería al ingresar al edificio».

    Pero `useVisitasNuevo` decide la instrucción **por el tipo de visita, a
    fuego**: `tipoSeleccionado === "amigos" ? "no_verificar" : "verificar"`. Así
    que la visita se guarda con `no_verificar` y el guardia ve el chip «🔓 No
    verificar». Nadie compara ese documento con nadie, y los dos campos que el
    formulario pidió no sirven para nada en ese caso.

    Que el modelo admite lo contrario está comprobado: la visita sembrada de
    amigos tiene `verificar`, y el chip de la portería lo refleja bien. Lo que lo
    fuerza es el formulario.

    **Tres salidas, y la decisión es de producto:** que el residente pueda
    elegirlo --hay un interruptor que falta--; que lo fije el condominio, como el
    permiso de entrega directa de la correspondencia; o que para amigos no se
    pidan tipo ni número de documento y se quite el aviso, y entonces el texto y
    el dato dicen lo mismo.

    Lo que no puede quedarse es que la pantalla prometa una cosa y el dato diga
    la contraria.

67. ✅ **RESUELTO el 29/09/2026: el formulario ya pide el día de salida.**
    Reusa `CampoFecha`, solo aparece en la renta corta --un amigo o un
    profesional vienen y se van el mismo día-- y valida que la salida no sea
    anterior a la llegada. El mensaje que se le copia al huésped dice ahora las
    dos fechas: «tu reserva está confirmada del 30/09/2026 al 05/10/2026».

    Comprobado creando una estancia en la aplicación: la visita quedó en la base
    del 30/09 al 05/10, **cinco noches**, donde antes toda estancia medía cero.

    Lo de abajo queda como registro.

    **Una estancia de huésped temporal solo podía durar un día.**

    El formulario de alta tiene **un solo calendario** --`<Calendar
    selected={selectedDate} onSelect={setSelectedDate} />`-- y el hook escribe
    las dos fechas con el mismo valor:

        fechaDesde: fechaStr,
        fechaHasta: fechaStr,

    No es una impresión: la única reserva de huésped temporal de la base va del
    25/09 al 25/09, **cero noches**. Y no hay otra vía: `crearVisita` se llama
    solo desde ahí, y el precheckin que rellena el huésped pide teléfono,
    dirección y motivo, no fechas.

    La cadena, entera y comprobada:

    1. El formulario solo deja elegir una fecha.
    2. La visita se guarda con `fecha_desde = fecha_hasta`.
    3. `cerrar_precheckin` crea la membresía del huésped con **esas** fechas
       --`vigente_desde = v_visita.fecha_desde`, `vigente_hasta =
       v_visita.fecha_hasta`-- y su acceso caduca en `fecha_hasta + 1`.
    4. Así que el huésped entra un día y al siguiente pierde la aplicación, el
       libro del alojamiento y la clave de la puerta.

    **Y explica el punto 62**: las cuatro columnas de estancia mínima y máxima
    que nadie lee no tienen nada que limitar, porque toda estancia mide cero
    noches. `LimitesDelEdificio` puede avisar «el edificio recomienda un mínimo
    de 2 noches» sobre un formulario donde poner 2 es imposible.

    **Lo que falta es elegir la fecha de salida, y cómo se elige es diseño, así
    que no lo decido.** Las piezas ya existen: `fecha_desde` y `fecha_hasta` en
    la tabla, y en la aplicación hay `CampoFecha` y `TiraDeDias` además del
    `Calendar` de una sola fecha. Con eso el arreglo es corto; dime por dónde y
    lo hago.

68. ✅ **RESUELTO el 29/09/2026: fuera las «certificaciones de seguridad» del
    pie de la web.** Salió al recorrer el precheckin por primera vez.

    En el pie de **todas** las pantallas del flujo había un bloque
    «Certificaciones de seguridad» con seis sellos: **SOC 2, HIPAA, TRA, SIRE,
    RNT e Interpol**. Dos problemas distintos y los dos serios:

    · **Ninguno es una certificación de VeciYo.** SOC 2 es una auditoría que se
      paga y se aprueba; HIPAA es normativa sanitaria de Estados Unidos, que no
      aplica a un condominio; e «Interpol» no certifica software. Anunciarlos en
      la pantalla donde alguien entrega su documento de identidad es una
      afirmación falsa sobre la seguridad del producto.
    · **TRA y SIRE no los puede ver el huésped.** Decisión explícita del KT del
      16/07/2026, con su motivo escrito: para el huésped es «un registro», porque
      si lee esas siglas pregunta «¿qué hackers son estos?».

    RNT sí existe, pero es del condominio y no de VeciYo, así que su sitio es la
    ficha de la vivienda. Si algún día hay certificaciones de verdad, vuelven con
    su número y su fecha.

    Comprobado en la web: ya no aparecen en ninguna pantalla del flujo.

69. ✅ **RESUELTO el 29/09/2026: el S.O.S. pide confirmación.** Antes no la
    pedía, y no era un
    matiz: en «Perfil» hay un botón «S.O.S» que, al pulsarlo, **dispara la
    alarma al entrar en la pantalla**. No hay un «¿seguro?» en medio ni un
    «mantén pulsado»; el toque ya suena en el teléfono de todos los guardias
    de turno, con el nombre y el departamento de quien lo pulsó.

    Está escrito así a propósito --«llegar a esta pantalla **es** pedir
    auxilio»-- y para una emergencia real es lo correcto: cada segundo y cada
    toque de más cuentan. Lo que no está decidido es qué pasa con el toque
    accidental, y el botón está en la lista de Perfil, justo encima de
    «Configuración», que es una pantalla a la que se entra sin urgencia.

    Las tres salidas posibles, y ninguna es obviamente la buena:

    · **Dejarlo como está.** Lo más rápido en una emergencia. El coste es que
      la portería recibe falsas alarmas y acaba desconfiando del aviso.
    · **Mantener pulsado dos segundos.** Casi igual de rápido y no se dispara
      al rozarlo. Es lo que hacen los botones de pánico de los coches.
    · **Un «¿seguro?» antes.** Lo más seguro contra el accidente y lo peor en
      una emergencia de verdad.

    **Elegiste la confirmación.** La pantalla del S.O.S. ya no dispara nada al
    entrar: enseña «¿Activar la alarma de emergencia? Sonará en el teléfono de
    todos los guardias de turno con tu nombre y tu departamento», con dos
    botones grandes --«🚨 Sí, pedir auxilio ahora» y «Volver sin avisar»--.

    El paso vive en la pantalla y no en el botón de «Perfil», así que vale para
    cualquier camino que lleve ahí, hoy y mañana. Comprobado en el navegador:
    entrar y salir no dejó ni una alarma en la base.

70. ✅ **RESUELTO el 29/09/2026: la casilla del umbral ya dice qué es.** En el
    formulario de crear
    un anuncio hay una casilla con el texto de ayuda «Umbral mínimo» y nada
    más: ni etiqueta, ni unidad, ni explicación. Quien administra tiene que
    adivinar que es **el número de votos que se espera reunir**, y que si lo
    deja vacío la encuesta no enseña ninguna barra de avance.

    Lo encontré arreglando la barra: la encuesta «¿Pintamos la fachada?» no
    tiene umbral, así que decía «Progreso 0%» para siempre --eso ya está
    arreglado--. Lo que queda es de redacción: qué debería decir la casilla.
    Aceptaste la propuesta: ahora la casilla lleva la etiqueta **«Votos que se
    esperan reunir (opcional)»** y de ejemplo «Ej. 20». De paso es numérica:
    `AnunciosScreen` hace `Number(...)` con lo que se escriba, así que un texto
    suelto llegaba a la base como `NaN`.

71. ✅ **RESUELTO el 29/09/2026: fuera la barra de morosos del Cuadro de
    Honor.** El tablero enseña a quién paga a tiempo, y también su nombre.
    No es un defecto: el KT lo decidió así --«los que pagan a tiempo aparecen
    en el Cuadro de Honor»-- y por eso existe la casilla «Usar alias en Cuadro
    de Honor» en Perfil. Lo recorrí y funciona: salen los departamentos al día
    con su responsable, sus medallas y sus cuotas.

    Lo que quiero que mires es el otro lado. El carrusel de arriba dice, mes a
    mes, «Al día 2 / 4 · Con retraso / Deudor 2 / 4», y la lista de abajo solo
    enseña a los dos que están al día. O sea que **quien no está al día se
    deduce por descarte**, y en un edificio de cuatro viviendas eso es decir su
    nombre sin escribirlo.

    En un condominio de sesenta no pasa nada; en uno pequeño, sí.

    **Lo hecho:** quitada la segunda barra, «Con retraso / Deudor», que iba en
    rojo justo debajo de «Al día». No añadía ni un dato --era la de arriba al
    revés-- y era lo que convertía un tablero de reconocimiento en uno de
    morosidad. La morosidad con nombres se queda donde se puede hacer algo con
    ella: la pantalla de la administración.

    **Y las insignias vuelven a salir una por una**, como en el diseño
    original. La tarjeta de cada vivienda enseñaba «🏅 3» --la suma de todos
    los reconocimientos-- y eso no distingue a un buen vecino de uno puntual.
    Ahora dice «🤝 2 · ♻️ 1», que es lo que el prototipo pintaba y lo que ya se
    ve en el bloque «Reputación» de la portada.

    Dos detalles que decidí y que puedes cambiarme:

    · **Solo salen las que tiene.** El prototipo pintaba las cinco del catálogo
      aunque estuvieran a cero, y eso son cuatro etiquetas vacías por vivienda.
      Quien no tiene ninguna ve «Aún sin reconocimientos».
    · El desglose lo trae la propia consulta del cuadro de honor, no una
      llamada por vivienda. No enseña nada que no se pudiera ver ya: cualquier
      miembro del condominio podía contar los reconocimientos por su cuenta.

    Queda dicho lo que **no** arregla: con «Al día 2 / 4» y una lista de dos,
    en un edificio de cuatro viviendas se sigue deduciendo quién falta. Quitar
    eso también significaría no enseñar ningún total, y entonces el tablero
    deja de decir cómo va el edificio, que es la mitad de para qué está. Si
    prefieres ese extremo, es una línea.

72. ✅ **RESUELTO el 30/09/2026: las cocheras ya se dan de alta.** Antes se
    declaraban y no se creaban desde ningún sitio. Al dar de
    alta una torre se escriben «cocheras de visitas» y «cocheras privadas»: la
    Torre 3 tiene declaradas 10 de visitas. Ese número se guarda y no hace
    nada — no crea ninguna cochera, no reserva cupos, no limita nada.

    Las cocheras de verdad son otra cosa, y hoy en todo el condominio hay
    **una**. Se ve en la portada: «Estacionamientos de visita: 1 de 1
    disponibles». Nadie puede crear más desde la aplicación; la pestaña
    «Estacionamientos» de la torre solo enseña los dos números declarados.

    De momento arreglé lo que confundía: la lista decía «Cocheras V.: 0» y al
    abrir la torre «Cocheras de visitas: 10», dos etiquetas casi iguales
    contando cosas distintas. Ahora una dice «creadas» y la otra «se
    declararon».

    Lo que hay que decidir es si el número declarado sirve para algo o sobra:

    · **Sirve como plan**, y entonces falta un botón para crear las cocheras
      (o un «faltan 10 por dar de alta»).
    · **Sobra**, y entonces se quita del formulario y se dan de alta una a una,
      como los depósitos.

    **Elegiste mi recomendación: quitar el número declarado.** Y con él hacía
    falta lo otro, o te quedabas sin forma de crear ninguna cochera:

    · Fuera «cocheras de visitas» y «cocheras privadas» de la ficha de la torre.
      Los números guardados no se tocan; simplemente ya no se piden ni se
      enseñan.
    · Las cocheras se dan de alta una a una en la pestaña «Estacionamientos» de
      la torre, igual que los depósitos: código, tipo (de visita o privada) y
      ubicación. El departamento solo se pide si es privada, porque una de
      visita no es de nadie.
    · Una cochera ocupada lo dice en la lista, para no borrarla con alguien
      dentro.

    Lo curioso: **la función para crearlas ya estaba escrita** desde el primer
    día y nadie la llamaba. Es la cadena de tres eslabones rota en el último,
    otra vez.

    Y salió un defecto de paso: crear algo en Arquitectura no avisaba al resto
    de la aplicación. Había dos consultas distintas para el mismo dato y solo se
    refrescaba una, así que la portada seguía diciendo «1 de 1 disponibles» con
    tres cocheras creadas. Afectaba igual a torres, viviendas, depósitos y
    porterías.

73. **El reglamento del huésped temporal es una copia del de residente
    permanente.** Palabra por palabra: lo comprobé comparando los dos textos en
    la base y son idénticos.

    Lo que lee hoy alguien que se queda tres noches en la 102:

    · «Pagar la renta y otros gastos pactados en tiempo y forma»
    · «El plazo máximo de un contrato de arrendamiento es de 20 años»
    · «La renovación debe pactarse por escrito antes del vencimiento»
    · «Suspender el pago del alquiler si el propietario no cumple con sus
      obligaciones de mantenimiento»

    No es un fallo de programa: el texto se carga como dato y la pantalla lo
    pinta bien. Es que **nadie ha escrito el reglamento del huésped**, y quedó
    el del inquilino de largo plazo como relleno.

    Y es de las primeras cosas que lee un huésped: la pantalla se la ofrece
    nada más entrar, junto a «Mi alojamiento».

    Esto lo tiene que escribir el cliente, que es quien sabe qué le exige a un
    huésped: horarios de silencio, uso de zonas comunes, visitas, mascotas,
    basura, check-out. Si quieres, te dejo un borrador para que lo corrija, pero
    no lo invento yo.

74. ✅ **RESUELTO el 30/09/2026: «Datos visibles» ya sirve para algo.** Antes
    no hacía nada — nadie podía ver los datos de nadie.
    Cada residente de una vivienda tiene un interruptor que dice si sus datos
    se ven o se ocultan, y la pantalla lo respeta: pone «👁️ Datos visibles» o
    «🔒 Datos ocultos» en su tarjeta.

    Pero el permiso de la base deja leer **un solo perfil: el tuyo**. Sin
    excepciones. Así que da igual cómo esté el interruptor — nadie ve la cédula
    ni el teléfono de nadie, nunca.

    Se ve así, entrando como Laura (inquilina líder de la 205):

        Guillermo Provenzano   Anfitrión primario
        CI:                              ← existe en la base: 1020304052
        👁️ Datos visibles                ← dice que sí, y no se ve

    Es la novena casilla decorativa del proyecto, y esta vez del lado
    contrario: la pantalla la respeta y la base no la mira siquiera.

    **El KT no dice nada de esto**, así que no lo decido yo. La pregunta es a
    quién le sirve ese dato:

    · **A quien vive contigo.** Compartes vivienda: saber el teléfono del otro
      residente para avisarle de algo. Es lo que el interruptor parece prometer.
    · **A la administración y a la portería.** El guardia compara el documento
      con la persona en la puerta; hoy tampoco lo ve.
    · **A nadie.** Entonces el interruptor sobra y hay que quitarlo, junto con
      el «CI:» de la tarjeta.

    **Elegiste mi recomendación.** La regla es ahora la que la pantalla ya
    prometía:

    · lo tuyo, siempre;
    · lo de quien comparte vivienda contigo, **sólo si esa persona tiene el
      interruptor encendido en esa vivienda**;
    · y lo de cualquiera, para la portería y la administración del edificio
      donde esa persona vive — el guardia compara el documento con la persona
      que tiene delante.

    Lo que **no** abre: una vivienda ajena. Compartir edificio no es compartir
    casa. Comprobado en la pantalla: la tarjeta de Guillermo ya dice
    «CI: 1020304052».

    La escritura no se toca: cada quien sigue editando sólo su perfil, y
    «verificado» sigue siendo algo que uno no se pone a sí mismo.

75. ✅ **RESUELTO el 30/09/2026: fuera el campo «Tiempo máximo» de las
    encuestas (R-38).** Se pedía al crear un anuncio, se validaba, y se tiraba:
    no hay columna donde guardarlo y la pantalla no lo enviaba. Quien administra
    lo rellenaba creyendo que limitaba algo.

    Y además sobraba: el plazo de una encuesta ya se pone dos campos más abajo,
    en **«Fecha de finalización»**, que sí se guarda y sí cierra la votación.

    Comprobado en la pantalla: el formulario de encuesta queda con sus opciones,
    el tipo de selección, «Votos que se esperan reunir (opcional)» y las dos
    fechas.

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

76. ✅ **RESUELTO el 01/10/2026: los enlaces de invitación apuntaban a un sitio
    ajeno.** Al desplegar en Vercel salió que `EXPO_PUBLIC_WEB_URL` --y el valor
    de reserva escrito en `invitaciones.ts`, y el prefijo de enlaces profundos
    de `RootNavigator.tsx`-- decían `https://veciyo-web.vercel.app`.

    Ese dominio **no es del cliente**: está tomado por otra cuenta de Vercel y
    responde con el título «VeciYo · DCJ». O sea que cada invitación enviada
    llevaba a quien la recibía a una página de un tercero, con el token de la
    invitación en la dirección.

    Nadie lo había visto porque hasta ahora la web solo se abría en local. Los
    tres sitios pasan a `https://veciyo-web-seven.vercel.app`, que es el que
    quedó al desplegar.

77. **La pestaña del navegador dice «Veci», no «VeciYo».** Sale de
    `app.json` (`expo.name`), y es lo que se ve en la pestaña y al guardar la
    página en la pantalla de inicio del móvil. La marca en todas las pantallas
    es «VeciYo». No lo toco porque `name` y `slug` también los usan las tiendas
    y EAS, y cambiarlos tiene consecuencias fuera de la web: **decisión tuya.**

78. **Las dos direcciones son las que regala Vercel.** La aplicación está en
    `veciyo-app.vercel.app` y la web en `veciyo-web-seven.vercel.app`. El «-seven»
    es porque el nombre limpio ya estaba cogido. Para la marcha blanca
    convendría un dominio propio --algo como `app.veciyo.com` y `veciyo.com`--,
    y entonces habría que rehacer el punto 76 con el dominio definitivo.

79. ✅ **RESUELTO el 01/10/2026.** «Administrar mis ubicaciones» era una pantalla del prototipo: los tres
    botones no escriben en ningún sitio.** Sale al pulsar el nombre de la
    vivienda en la barra de arriba («Torre 1 · 102»), y la ve **cualquier
    residente** --propietario, inquilino líder o huésped--; la portería y la
    administración están excluidas a propósito.

    **La lista sí es de verdad**: al iniciar sesión se llena con los edificios
    donde uno tiene vivienda (`auth-store.ts`, `setUbicaciones(contexto.
    ubicaciones)`). Quien tiene casa en dos edificios los ve ahí y cambia de uno
    a otro. Eso funciona y es útil.

    **Lo que no es de verdad son los tres controles**: «+ Agregar ubicación»,
    el lápiz y la papelera. Los tres llaman a `inquilinoLider.service.ts`, que
    tiene una constante llamada `SIMULATED_REQUEST_DELAY`, espera 150 ms y
    escribe en un almacén de memoria. **Nunca toca la base.** Comprobado
    el 01/10/2026 entrando como Sofía en la aplicación desplegada: rellené
    «Edificio Que No Existe», salió el aviso verde «Ubicación agregada» y el
    edificio apareció en la lista. No existe en ninguna parte y desaparece al
    recargar.

    Y el formulario enseña de dónde viene: pide **Distrito, Urbanización,
    Condominio, Correo ADM e imagen del edificio**, o sea, dar de alta un
    condominio entero. Eso en el producto real no lo hace un vecino: los
    condominios los crea la administración, y uno entra a uno por invitación.

    Con la papelera pasa lo mismo del revés: borra de la lista el edificio donde
    vive, el aviso dice «Ubicación eliminada», y al recargar vuelve a estar.

    **Lo que recomiendo:** dejar la lista --que sirve, y es el único sitio donde
    alguien con dos edificios cambia de uno a otro-- y quitar los tres botones.
    No hay nada real a lo que conectarlos. **Decisión tuya.**

    **Hecho:** fuera los tres controles, el servicio que los fingía
    (`inquilinoLider.service.ts`, con su `SIMULATED_REQUEST_DELAY`), los dos
    modales, el hook y el esquema del formulario. La pantalla pasa a llamarse
    **«Mis viviendas»** --no se administra nada-- y quien no tiene ninguna ve
    una explicación en vez de una pantalla en blanco. Prueba de componente con
    mutación comprobada.

    Y la segunda línea de la tarjeta decía **«Alias: Torre 1 · 102»**, que no
    es un alias: nadie lo escribió. Lo compone `sesion.ts` con la torre y el
    código de la unidad. El nombre venía del prototipo, donde esto era una
    libreta de direcciones personales --los datos de demostración eran «Casa
    Amorcito» y «Casa Mama»-- y uno les ponía el mote que quisiera. Al conectar
    la sesión el campo pasó a guardar la vivienda y la etiqueta se quedó
    prometiendo algo que ya no existe. **Hoy no hay ningún mote en ninguna
    parte.**

80. ✅ **RESUELTO el 01/10/2026: el nombre del edificio estaba escrito a
    fuego.** La barra de arriba le dice a la portería y a la administración en
    qué edificio están: «Guardia · Las Barranqueras 246». Ese nombre salía de
    `edificioActivo`, un campo del almacén con ese texto puesto a mano y **sin
    un solo sitio que lo escribiera**: `setEdificioActivo` existía y no lo
    llamaba nadie.

    O sea que un guardia de cualquier otro condominio habría leído el nombre
    del primero. No se notaba porque hoy solo hay un condominio cargado, y es
    justo ese. Habría salido el día de la segunda venta.

    Ahora sale de la membresía de condominio que trae la sesión.

81. ✅ **RESUELTO el 01/10/2026: las dos cosas.** ¿Qué debe decir el nombre de arriba, el edificio o la vivienda? Hoy a
    un residente le dice **la vivienda** («Torre 1 · 102») y a la portería y la
    administración **el edificio** («Admin · Las Barranqueras 246»). Son dos
    criterios distintos en el mismo sitio.

    Lo planteaste tú: «ese alias más bien debería mostrarse arriba en vez de
    Torre 1». Y hay un argumento a favor: ese texto es el que se pulsa para
    **cambiar de sitio**, así que nombrar el sitio es más coherente, y además
    iguala el criterio con el del personal.

    El argumento en contra es que quien vive en un solo edificio ya sabe cuál
    es, y lo que le orienta es su vivienda.

    **Lo que recomiendo:** las dos cosas, «Las Barranqueras 246 · 102». Es un
    texto corto, sirve igual para quien tiene una vivienda y para quien tiene
    dos, y deja de haber dos criterios. **Decisión tuya**, y no la toco hasta
    que la digas.

    **Hecho:** «Las Barranqueras 246 · 102». Lo compone `nombreDeVivienda`, un
    solo sitio, por lo que ya pasó con las horas de los turnos --dos sitios que
    arman el mismo texto lo arman distinto y nada lo dice--. El detalle con la
    torre se queda en la tarjeta de «Mis viviendas», que es donde hay sitio.

    Y de paso, **las filas del desplegable**: decían solo «Torre 1 · 102», así
    que quien tiene casa en dos edificios veía dos líneas sin nada que dijera
    cuál era cuál. Que es justo para lo que sirve esa lista.

82. ✅ **RESUELTO el 01/10/2026: ya se le puede poner nombre.** No había forma de ponerle un nombre propio a tu vivienda. Lo preguntaste
    el 01/10/2026 y conviene no confundir dos cosas que se llaman igual:

    · **El alias que sí existe es el de la persona**, no el de la casa. Es un
      seudónimo para no figurar con tu nombre real, se escribe en **Perfil**
      --y también en Configuración, es el mismo campo-- y tiene dos
      interruptores: «Usar alias en Cuadro de Honor» y «Usar alias en Zonas
      Comunes y reservas». Eso funciona de verdad y la base lo respeta.
    · **El «Alias» de la tarjeta de la vivienda no era nada.** Venía del
      prototipo, donde esto era una libreta de direcciones personales --«Casa
      Amorcito», «Casa Mama»-- y uno les ponía el mote que quisiera. Al
      conectar la sesión el campo pasó a guardar «Torre 1 · 102», compuesto por
      la aplicación. Quitado (punto 79).

    O sea que **hoy nadie puede llamar «La playa» a su apartamento**, y no es
    que esté roto: nunca se construyó. No hay columna para eso en ningún sitio.

    El KT no lo menciona. Tendría sentido para el anfitrión de renta corta, que
    puede llevar varias viviendas y las distingue por cómo las llama él, no por
    «Torre 2 · 301».

    **Lo que haría falta:** una columna en `membresia_unidad` --el mote es de
    cada persona, no de la vivienda: dos que compartan casa pueden llamarla
    distinto--, un campo donde escribirlo, y que la barra de arriba y la lista
    lo prefieran cuando exista. Es media tarde. **Decisión tuya si lo quieres.**

    **Hecho.** `membresia_unidad.apodo`, un campo en la tarjeta de «Mis
    viviendas» --con su lápiz, que esta vez sí escribe-- y la barra de arriba y
    la lista prefiriéndolo cuando existe. Probado en la aplicación desplegada:
    la 102 pasó a llamarse «La playa», sobrevivió a recargar, y se quitó con el
    botón de quitarlo.

    Tres decisiones que conviene saber:

    · **Va en la membresía, no en la vivienda.** Es de cada persona: quien
      comparta la casa puede llamarla de otra forma. Lo sujeta un disparador
      propio --`proteger_apodo_de_vivienda`-- porque la política de escritura
      deja al anfitrión tocar la fila de su huésped, y eso vale para gestionar
      a su gente pero no para ponerle mote a la casa en su nombre. **Tampoco la
      administración.**
    · **El apodo va solo**, sin el edificio delante: quien llama «La playa» a
      su apartamento quiere leer «La playa».
    · **En blanco no se guarda**, ni aquí ni en la base: ese texto es el que se
      pulsa para cambiar de vivienda, y vacío no habría nada que pulsar. El
      tope son 40 caracteres, el ancho de esa línea.

83. ✅ **RESUELTO el 01/10/2026: un huésped podía alargarse su propia
    estancia.** Salió leyendo cómo está protegida la tabla de membresías, al
    añadir el apodo.

    Comprobado con Ramiro --su estancia terminó el 7 de agosto--: una sola
    llamada poniéndose la fecha de salida en 2030 respondió correctamente y
    guardó el dato. Con eso la estancia vuelve a estar vigente y la aplicación
    le abre la vivienda entera.

    **Lo grave no es entrar a la aplicación.** La clave del wifi y el código de
    la puerta están protegidos comprobando que la estancia siga vigente... y la
    vigencia la escribía él. La condición que guardaba el secreto la podía
    poner quien quería leerlo.

    El disparador que vigila esa tabla ya impedía cambiarse el rol, los
    permisos, darse de alta y darse de baja a uno mismo. Le faltaban las dos
    fechas, y eran las de más valor. Ahora están, con cuatro pruebas: las dos
    que lo prohíben se ponen rojas al quitar la protección, hay un control
    positivo --que lo suyo sí lo puede cambiar, para que el caso negativo no
    pase por la razón equivocada-- y una que comprueba por su propio camino que
    sin estancia vigente no se entregan las credenciales.

    Quien sí puede mover esas fechas sigue pudiendo: la administración, y el
    anfitrión sobre la estancia de su huésped.

84. **Un guarda nuevo: `npm run fingen`.** Lo pediste tú sin pedirlo --«todo el
    rato salen errores, ¿no tienes un buen método?»-- y tenías razón.

    El defecto más caro de este proyecto siempre tiene la misma forma: un
    servicio que espera 150 milisegundos fingiendo que llama a un servidor y
    escribe en la memoria del navegador. No es un botón muerto --eso se nota--
    sino uno que **dice que lo hizo**. Han ido saliendo de uno en uno a lo largo
    de semanas: el correo de recuperación que nadie enviaba, los residentes de
    una vivienda, la carga masiva de pagos, «Administrar mis ubicaciones»
    entera.

    Ahora se enumeran de golpe, igual que ya se hacía con los botones muertos y
    las pantallas inalcanzables. **Al escribirlo quedaban dos en todo el
    proyecto**, y uno de ellos está documentado como hueco conocido: «agregar un
    servicio contratado» (luz, agua, internet), que el KT lista y no tiene tabla
    donde guardarse.

    El otro era el del directorio de propiedades, que no mentía --los datos son
    de verdad-- pero añadía una espera inventada que nadie miraba. Quitado.

    O sea que de esta familia **no queda ninguno**, y si alguien mete uno nuevo
    las pruebas no arrancan.

85. ✅ **RESUELTO el 01/10/2026: «Código del país» y «Teléfono» guardaban en
    silencio.** Lo dijiste tú: «no es muy claro cómo se guardan... el campo
    Alias sí sale el indicador».

    Era exacto, y la comparación es lo que lo delata: esa tarjeta tiene cinco
    cajas y **solo una avisaba**. El alias decía «Alias actualizado» al salir
    del campo; el código del país, el teléfono y los dos datos alternativos no
    decían nada, tres líneas más arriba. Leído así, parece que uno guarda y los
    otros no.

    Guardaban --los cuatro-- desde el primer día. Lo que faltaba era decirlo.
    Ahora cada uno confirma con su nombre: «Teléfono guardado», «Código del país
    guardado».

    Y de paso: salir de un campo **sin tocarlo** disparaba una escritura igual.
    Con el aviso puesto eso habría sido un «guardado» de algo que nadie guardó,
    que es peor que el silencio. Ahora solo escribe si el valor cambió.

    Es la familia de siempre al revés: no una pantalla que anuncia lo que no
    hizo, sino una que **hace y no lo dice**.

86. ✅ **RETIRADO el 01/10/2026 a tu petición: «Configuración de App».** Los tres
    interruptores --modo daltónico, fuente aumentada y modo oscuro-- se
    guardaban en el perfil y **no cambiaban nada**. El propio bloque lo admitía
    debajo del título: «Todavía no cambia el aspecto de la aplicación».

    Aplicarlos es trabajo del sistema de diseño --hay que repintar la
    aplicación entera con otra paleta y otro tamaño de letra--, no de esa
    pantalla, y nadie lo había hecho. Un interruptor que anuncia que no sirve es
    ruido en una pantalla que ya tiene mucho que leer.

    **Las tres columnas se quedan en la base.** Borrar datos del cliente no se
    hace para limpiar una pantalla, y lo guardado hasta hoy sigue ahí: el día
    que el sistema de diseño sepa pintarlos, los interruptores vuelven con el
    valor que cada quien dejó puesto.

87. ✅ **RESUELTO el 01/10/2026: volver a pulsar la opción que ya votaste daba
    un aviso rojo.** Lo reportaste tú: «voto por una opción, ok se marca, y se
    bloquea la otra, pero al darle nuevamente en la misma opción que elegí sale
    un anuncio rojo abajo».

    La regla estaba escrita «se bloquean las demás **menos la que elegiste**»,
    así que la tuya seguía respondiendo. Pulsarla mandaba un segundo voto, la
    base lo rechazaba --«Esta encuesta admite un solo voto por persona»-- y el
    aviso salía por hacer exactamente lo que la pantalla ofrecía.

    En una encuesta de **voto múltiple** era peor, porque ahí la base sí lo
    acepta: se votaba dos veces la misma opción y el recuento quedaba mal.

    Ahora una opción elegida no se puede volver a pulsar, y sigue viéndose
    entera --es tu respuesta, no una opción apagada--. En las de voto múltiple
    las que faltan siguen abiertas.

    **Lo que queda sin decidir: retirar o cambiar un voto.** Hoy no existe en
    ningún sitio --ni pantalla ni función-- así que votar es un hecho consumado.
    La base sí lo permitiría. El KT no dice nada. **Decisión tuya**, y si la
    quieres es media tarde.

88. ✅ **RESUELTO el 01/10/2026: los avisos de error tiraban el motivo.** Salió
    del punto anterior, y es más gordo que él.

    Al votar dos veces, la base contesta una frase escrita para que una persona
    la lea: «Esta encuesta admite un solo voto por persona». En pantalla salía
    **«No se pudo guardar el anuncio»**: ni el motivo, ni siquiera el asunto
    --hablaba de un anuncio cuando el problema era un voto--.

    La causa es de una línea y estaba repetida en **veinte sitios**: se
    comprobaba `error instanceof Error` antes de leer el mensaje, y lo que
    devuelve la base no es un «Error» sino un objeto normal. O sea que esa
    comprobación era falsa casi siempre y la frase útil se descartaba.

    Lo que lo escondió: los fallos de contraseña y los que lanza la propia
    aplicación **sí** son «Error», así que unas pantallas explicaban el motivo
    y otras no, sin que se viera el patrón.

    Y lo que más me llama la atención al mirarlo: **la herramienta para hacerlo
    bien ya existía** desde hace semanas, y la usaban cinco archivos de
    veinticinco. No faltaba la solución; faltaba que algo avisara de quién no la
    usaba.

    Eso es ahora `npm run errores`, con tope cero. De paso apareció uno donde la
    frase útil no podía salir nunca: al activar la renta corta en un edificio
    que no la permite, el motivo --«este edificio no autoriza la renta corta»--
    se perdía siempre y quedaba un «no se pudo» a secas.

89. ✅ **RESUELTO el 01/10/2026: 35 archivos muertos, y uno que no lo estaba.**
    Preguntaste por qué hay 603 archivos y si había basura. La había, y el
    guarda que debía encontrarla estaba ciego.

    **Por qué 603, para empezar:** 45 son pruebas, 107 eran archivos de
    fontanería (`index.ts`, 434 líneas **entre los 107**), 247 componentes y
    pantallas y 204 de lógica. Sin pruebas ni fontanería son 451 archivos y
    58.632 líneas: **130 líneas por archivo de media**, que para 14 módulos y
    57 pantallas es normal. El problema no es que haya muchos archivos
    pequeños; es que hay cuatro pantallas de más de 840 líneas cuando la norma
    del proyecto son 400.

    **El guarda estaba ciego por una suposición escrita en una línea:** los
    `index.ts` estaban exentos de la comprobación, «porque se importan por su
    carpeta». Los 107, sin mirar ninguno. Al quitar la exención salieron **30
    que no importa nadie**, y al retirarlos, **6 más** que solo seguían vivos
    colgando de ellos.

    Peor: el propio script tenía un bloque que decía resolver justo esa cadena
    --un barril muerto mantiene vivo lo que reexporta-- y terminaba en
    `void barrilesVivos`. Se construía y no se usaba. Un comentario que afirma
    lo contrario de lo que hace el código.

    **De los 36, son dos cosas distintas, y conviene no confundirlas:**

    · **35 son basura**: los 30 barriles (fontanería pura, sin contenido
      propio), dos archivos de tipos de una línea que solo reexportaban, dos
      esquemas de validación de formularios que ya no existen --el de chat
      pedía torre, depto y piso, y esa pantalla hoy es un desplegable-- y
      `PropietarioStack.tsx`, un segundo registro de pantallas que no montaba
      nadie. Y **dos de ellos estaban completamente vacíos**, cero bytes, desde
      el commit que movió el proyecto a la raíz.
    · **Uno no es basura: es trabajo terminado sin conectar.**
      `PropietarioAgregarServicioScreen` --dar de alta luz, agua o internet--
      está entera, con su formulario, su validación y su hook. Lo que no existe
      es dónde guardarla. Estaba registrada **solo** en el stack muerto, así
      que ya era inalcanzable y lo tapaba un archivo que tampoco usaba nadie.
      Se queda, con su cabecera explicando qué falta. Es el mismo caso que
      `ComunidadScreen`.

    El guarda respeta ahora esa cabecera --«NO ESTÁ EN USO» con el motivo--,
    igual que hace el de pantallas inalcanzables. Marca en cero, comprobado
    plantándole un barril muerto.

90. ✅ **RESUELTO el 01/10/2026.** El horario de check-in se guardaba y no lo veía nadie. Primera familia de la
    pasada por el código: «lo que la base ofrece y la aplicación no usa».

    En la pantalla de Permisos, la administración elige un **horario de
    check-in** para la estancia corta y otro para la larga. Se guarda en cuatro
    columnas. Y ahí se queda: ningún disparador lo impone, ninguna pantalla lo
    enseña, y la ficha que lee el huésped --`ficha_alojamiento`-- solo saca de
    ahí las mascotas y los niños.

    O sea que quien configura «check-in de 15:00 a 20:00» cree que está diciendo
    algo y no se lo dice a nadie.

    **Dos salidas, y es tuya:** enseñarlo al huésped en «Mi alojamiento», junto
    a las instrucciones de entrada --que es donde lo buscaría-- o quitar el
    campo. Lo que no puede quedarse es como está.

91. ✅ **RESUELTO el 01/10/2026.** El umbral de «1 mes» que pediste no lo aplicaba nadie. El 25/09/2026 lo
    dijiste así: «Parámetro estancia corta, estancia larga. Menos de 1 mes más
    limitantes. Más, ya son casi residentes.»

    Se construyó: una columna `corta_hasta_noches`, un campo en la pantalla, y
    dos funciones en la base para elegir el juego de reglas según las noches.
    **Ninguna de las dos se llama desde ningún sitio.**

    Lo que de verdad decide hoy es otra cosa: la vivienda está «en estancia
    corta» si **hoy hay alguien alojado**, sin mirar cuántas noches. Son dos
    definiciones distintas de lo mismo conviviendo en la misma base.

    La consecuencia práctica es justo la que querías evitar: **a un huésped de
    tres meses se le aplican las reglas de estancia corta**, porque nadie mira
    el umbral.

    **Lo que recomiendo:** que el criterio de las noches sustituya al de «hay
    alguien hoy», que es el que escribiste. Cambia comportamiento, así que no lo
    toco sin que lo digas.

92. **Cuatro funciones de la base que no llama nadie.** De las 87 que una
    persona puede ejecutar, estas cuatro no las usa ni la aplicación, ni la web,
    ni otra función, ni una política:

    · **`buscar_placa`** — «de quién es esta placa: de un residente o de una
      visita». Es una herramienta de portería: llega un coche, el guardia teclea
      la matrícula. Está construida y **probada**, y no hay ninguna pantalla que
      la use. Trabajo terminado sin conectar, como la de agregar servicio.
      **No está ni en el mockup ni en el KT**: las tareas de portería que lista
      el traspaso son registrar visitas y correspondencia, ver el tráfico, los
      turnos y el chat. Se construyó de más. **PENDIENTE a decisión del cliente
      (01/10/2026): «déjalo anotado, no perdamos el tiempo en eso».** Cuando se
      retome es media tarde: una caja de búsqueda en la pantalla de portería.
    · **`mis_acompanantes`** — con quién me alojo. La web tiene su gemela para
      el preregistro; la de la aplicación no la llama nadie.
    · **`rnt_vigente`** — si el registro de turismo sigue en vigor, condición
      para emitir el documento del huésped. Decisión del 17/07/2026.
    · **`estancia_admite_visitas`** — esta es distinta: la regla **sí** se
      aplica, pero con otro criterio, desde un disparador que usa el juego corto
      siempre. O sea que hay dos implementaciones de la misma regla y corre la
      menos precisa. Es el caso del punto 91 por otro lado.

    **Hecho:** `reglas_de_estancia` deja de preguntar «¿hay alguien hoy?» y pasa
    a preguntar **cuánto dura** la estancia que hay hoy, contra
    `corta_hasta_noches`. Un solo criterio, en un solo sitio, compartido con
    `es_estancia_corta`.

    Hoy **no cambia nada en la práctica**, y eso es a propósito: ninguna
    vivienda tiene encendida la diferenciación entre estancia corta y larga, así
    que el arreglo queda inerte hasta que alguien la encienda. En un edificio en
    marcha eso importa.

    Detalles que había que decidir y están escritos en la migración: una
    estancia **sin fecha de salida** no es corta; si hay varias a la vez manda
    la más larga --si alguien se queda tres meses, la vivienda no está en
    régimen de estancia corta aunque además haya alguien de dos noches--; y sin
    nadie alojado rigen las reglas de residente.

    Cuatro casos, con el de arriba comprobado devolviendo la función al
    criterio anterior: se pone rojo solo él, que es el que importa.

93. **Corrección a lo que dije en el punto 90.** Afirmé que el horario de
    check-in no se podía imponer «porque el producto no registra a qué hora
    llega nadie». **Es falso, y lo preguntaste tú.**

    `visita` tiene `ingreso_en` con fecha y hora, y uno de sus tipos es
    `huesped_temporal`. O sea que **la portería sí marca la llegada del huésped
    con su hora exacta**, y el horario de check-in sí se puede contrastar contra
    algo real.

    Así que la decisión del punto 90 es más amplia de lo que la dejé:

    · **Enseñarlo al huésped**, en «Mi alojamiento», junto a las instrucciones
      de entrada. Es donde lo buscaría quien va a llegar.
    · **Y avisar a la portería** cuando marque la entrada de un huésped fuera de
      esa franja. Aviso, no bloqueo: es el criterio que ya fijaste para el aforo
      --«advertencia, no bloqueo duro»-- y aquí vale igual, porque un vuelo se
      retrasa y el guardia no puede quedarse con alguien en la puerta.

    **Lo que recomiendo:** las dos. La primera vuelve verdadero el campo; la
    segunda lo hace servir para algo.

    **Hecho, las dos cosas que recomendé y aprobaste:**

    · **Se le enseña al huésped**, como un dato más de la ficha de «Mi
      alojamiento»: «Check-in: De 14:00 a 20:00». Viaja desde
      `reglas_de_estancia` --que es quien ya decide si rige el juego corto o el
      largo-- hasta `ficha_alojamiento`. Sin horario puesto no sale nada: no se
      promete una franja que nadie fijó.
    · **Y se le avisa a la portería** cuando marca la llegada de un huésped
      fuera de esa franja. **Aviso, no bloqueo**, que es tu criterio del aforo:
      un vuelo se retrasa y el guardia no puede dejar a alguien en la puerta.
      El aviso va **después** de guardar la llegada, para que un fallo al leer
      el horario no pueda impedir que alguien entre.

    Dos cosas que había que resolver y están escritas:

    · **«24 horas» no es un rango** --el inventario de valores ya lo marcaba--.
      Se guarda como el día entero y se dice «A cualquier hora», porque «de
      00:00 a 23:59» no significa nada para quien lo lee.
    · **Una franja que cruza la medianoche** --de 22:00 a 06:00-- es continua
      por fuera, no por dentro. El formulario no la ofrece, pero las dos
      columnas son horas sueltas y la base la admite; sin ese caso, llegar a las
      23:00 contaría como fuera de hora.

    **Nota sobre los datos:** le puse a la 102 una franja de 14:00 a 20:00 para
    poder verlo. Está puesta a propósito, para que lo veas al probar; quítala
    cuando quieras desde la pantalla de Permisos.

94. ✅ **RESUELTO el 01/10/2026.** El aislamiento entre condominios no se había probado nunca, porque solo había un condominio en la base. Es el hallazgo más serio de la pasada por el
    código, y conviene entenderlo bien.

    La regla 7 del proyecto dice que «el aislamiento entre condominios y entre
    unidades es el requisito de seguridad central del producto». Las 563 pruebas
    de seguridad comprueban a fondo el aislamiento **entre viviendas**: que una
    vecina no vea las visitas de otra, que un huésped no vea la correspondencia
    de la casa, etc.

    Pero en la base hay **un solo condominio**, «Las Barranqueras 246», y las
    diez cuentas de prueba son todas suyas. Así que **ninguna prueba ha podido
    comprobar jamás** que alguien de un edificio no vea lo de otro: no existe
    ese alguien.

    Lo que eso deja sin verificar, contado: **75 de las 128 políticas** deciden
    por condominio, y **50 funciones** de la base miran `condominio_id`. Todas
    ellas devuelven hoy «sí» para todo el mundo, porque todo el mundo está en el
    mismo edificio. Una de esas 75 podría estar mal escrita y la suite entera
    seguiría en verde.

    Es exactamente la trampa que el propio proyecto tiene documentada --«un caso
    negativo sin datos pasa igual con la política abierta de par en par»-- pero
    a la escala más grande posible: no es un caso, es el requisito central.

    Y es el que se rompe **el día de la segunda venta**, que es el peor momento
    para enterarse.

    **Lo que recomiendo:** sembrar un segundo condominio de prueba, con su
    administración y un residente, y escribir los casos cruzados. Son datos
    nuevos, no se borra nada, y son **invisibles para el edificio actual**
    --precisamente porque RLS los separa; y si resultan visibles, ese es el
    fallo que buscamos--. Necesita dos cuentas nuevas `@veciyo.test`, así que
    lo pregunto antes de hacerlo.

    Mientras tanto, lo que **sí** se ha podido comprobar y está bien: las 128
    políticas tienen ámbito. Las únicas tres que leen sin filtrar son catálogos
    --insignias, planes de suscripción y precios-- y es correcto que cualquiera
    con cuenta los lea. Las 59 tablas tienen RLS activada y al menos una
    política; ninguna se quedó abierta.

95. ✅ **RESUELTO el 02/10/2026.** Cinco tablas sin ninguna prueba. De las 59: `comite_propietarios`,
    `deposito`, `tipologia`, `visita_evento` y `zona_fecha_especial`.

    Cuatro están vacías --nadie ha creado todavía un depósito, un comité, una
    fecha especial de zona ni un evento de visita-- y la quinta, `tipologia`,
    tiene una fila. Sus políticas están escritas y son coherentes con el resto:
    lee quien es miembro del condominio, escribe la administración.

    La más delicada es **`visita_evento`**, que guarda la cronología de una
    visita y delega en `puede_ver_visita`: si esa función falla, se filtra el
    historial de quién entró y salió de una vivienda ajena. Hoy está vacía, así
    que no hay nada que filtrar, pero es lo primero que se llenará en cuanto la
    portería empiece a usar la aplicación de verdad.

    **Hecho.** Hay un segundo edificio de prueba --«[prueba] Mirador del Este»,
    con su torre, su vivienda 901, su administradora (Renata) y su propietario
    (Bruno)-- y **catorce casos** que preguntan lo único que importa: ¿ve lo
    nuestro?

    La respuesta, y es la buena noticia: **no.** Ni las viviendas, ni las
    torres, ni las zonas comunes, ni los anuncios, ni las visitas, ni la
    correspondencia, ni quién vive aquí, ni las cuotas. Y al revés tampoco: la
    administración de aquí no ve la vivienda de allá, ni a su gente, ni el
    perfil de su propietario.

    Cada caso lleva su **control positivo** al lado: que Renata no vea nuestras
    viviendas no probaría nada si resultara que no ve ninguna. Lo que se
    comprueba es que ve **las suyas y solo las suyas**.

    Y lo que de verdad da el valor: **abrí a propósito la política de lectura de
    viviendas de par en par** y tres de los catorce se pusieron rojos. Sin esa
    comprobación, catorce casos en verde sobre un aislamiento que nadie ha
    intentado romper no dicen nada.

    La semilla es aditiva y repetible --`supabase/herramientas/
    sembrar-segundo-condominio.mjs`-- y el barrido de datos de prueba no toca
    las tablas del edificio, con un aviso escrito en `limpieza-global.ts` para
    que nadie se las lleve por delante sin querer.

96. ✅ **RESUELTO el 01/10/2026: veintidós sitios armando fechas y horas a
    mano.** Tercera familia de la pasada: la reutilización, que es lo que
    preguntaste.

    Primero lo que **no** es un problema, para no confundirlo: hay 20 archivos
    por encima de las 400 líneas que marca la norma del proyecto, y el más
    grande tiene 953. Eso es tamaño, no defecto: partirlos no arregla nada y
    arriesga romper lo que funciona. Lo dejo anotado y no lo toco.

    Lo que sí duele es otra cosa, y tiene número: **once sitios construían
    `HH:mm` a mano** y **once más `yyyy-MM-dd`**, existiendo `formatTime`,
    `formatDate` y `formatDateInput` en `@/shared/utils` desde el principio. Dos
    de ellos incluso tenían su propio ayudante con nombre --`enISO`,
    `hoyEnFecha`-- y su propio comentario explicando la trampa de UTC: el
    conocimiento estaba, duplicado.

    Hoy ninguno de los veintidós daba un resultado distinto. Lo que importa es
    que **es la forma exacta del defecto que ya mordió a este proyecto**:
    `seguridad.repo` escribía «08:00 - 16:00» y `arquitectura.repo` «08:00 a
    16:00» para el mismo turno, y uno de los dos sitios que volvía a partir ese
    texto no funcionó nunca para nadie.

    Y lo que más me dice del asunto: **uno de los once lo escribí yo esa misma
    madrugada**, cuatro horas antes de encontrarlos. Con veintidós precedentes
    delante, añadir el veintitrés es lo natural.

    Por eso el arreglo no es sustituirlos --eso dura hasta el siguiente-- sino
    `npm run formateos`, con tope cero: vigila el `padStart` a mano y también
    los `toLocale*String` que la regla 6 ya prohibía y nadie comprobaba.
    Verificado plantándole un caso.

    De paso quedó en su sitio el inverso que faltaba: `horaComoFecha`, que
    estaba copiado dos veces --`parseTime`-- en las dos pantallas de detalle de
    la portería.

97. ✅ **RESUELTO el 01/10/2026.** «Tiempo mínimo entre reservas» se configuraba, se guardaba y no lo aplicaba nadie. Cuarta familia de la pasada: columnas que la aplicación escribe y
    nadie lee. Esta vez con la pregunta correcta --quién la lee **fuera** de la
    pantalla que la escribe--, que es donde falló el barrido anterior.

    La administración le pone a cada zona común un tiempo mínimo entre reservas:
    tiene su campo en el formulario, su validación («no puede ser negativo») y
    un valor por defecto de **30 minutos** para una zona nueva. Se guarda.

    Y nada lo aplica: ni un disparador, ni una política, ni una restricción, ni
    la pantalla al reservar. Se puede reservar la parrilla de 10 a 12 y otra vez
    de 12 a 14, sin el hueco de limpieza que el edificio configuró.

    Hoy no se nota porque las tres zonas que existen lo tienen en **0**. Pero el
    formulario arranca en 30, así que la siguiente zona que alguien cree nacerá
    con una regla que nadie respeta.

    Es hermano del aforo (punto 62), que estaba igual y se sujetó con un
    disparador --`respetar_aforo_de_zona`--. Aquí se puede hacer lo mismo.

    **Decisión tuya, y hay precedente para las dos:** el aforo se **bloquea** en
    la base; el límite de noches del edificio se **avisa**. Yo bloquearía, por
    el mismo motivo que el aforo: el hueco entre reservas existe para algo
    físico --limpiar, ventilar-- y no depende de la buena voluntad de quien
    reserva.

98. 🔶 **Una de las dos construida el 02/10/2026.** Dos columnas modeladas y sin construir: `torre.almacenes_privados`
    --cuántos trasteros tiene una torre-- y `reclamo.unidad_denunciada` --a qué
    vivienda señala una PQRS--. Ninguna se escribe ni se lee desde ningún sitio
    de la aplicación.

    No son defectos: son huecos. La segunda es la más interesante, porque una
    queja contra un vecino concreto es un caso real --ruido, humedades-- y la
    columna está puesta y hasta indexada. **Anotado, sin tocar.**

    Y una nota de método, porque me equivoqué dos veces al barrer esta familia:
    la herramienta busca el nombre de la columna en el código, y **falla cuando
    el repositorio le cambia el nombre al mapearla**. Así marcó como muerta
    `condominio.verificar_documento_visitas`, que está perfectamente conectada
    --el administrador la enciende y el formulario de visitas la obedece-- solo
    que en la aplicación se llama `verificarDocumento`. De 128 señaladas,
    después de mirarlas una a una, **solo tres eran de verdad**.

    **Hecho: se bloquea en la base**, como el aforo. Lo sujeta
    `respetar_hueco_entre_reservas`, que escucha el alta **y el cambio** --mover
    una reserva encima de otra es la misma jugada por la puerta de atrás, y en
    este proyecto ya se quedó una ventana así abierta--.

    Tres decisiones que había que tomar y están escritas en la migración:

    · **El hueco es por puesto, no por zona.** La lavandería tiene cuatro cupos
      simultáneos: dos personas lavando a la vez en máquinas distintas es
      correcto y no hay nada que limpiar entre medias. Lo que necesita el hueco
      es la **misma** máquina, una detrás de otra. Mirarlo por zona rechazaría
      la segunda lavadora a la misma hora, que es justo lo que los cuatro cupos
      permiten a propósito.
    · **El borde cuenta como respetado.** Pedir 30 minutos y rechazar a los 30
      sería pedir 31.
    · **Una reserva cancelada no reserva el hueco**, igual que no ocupa aforo.
      Si lo bloqueara, la zona se iría quedando inservible sola.

    Siete casos, con su zona propia --media docena de archivos eligen «la
    primera zona que haya» y se llevan todos la misma-- y comprobados apagando
    el disparador: cuatro se ponen rojos.

    Y un apunte honesto: el primer caso de «una cancelada no reserva el hueco»
    lo escribí mal --pedía una franja que chocaba con otra que la propia prueba
    había creado-- y se rechazaba **con razón**. El disparador estaba bien; el
    caso, no. Corregido con el motivo escrito al lado.

99. ✅ **RESUELTO el 02/10/2026.** El guardia no podía decir que el documento NO coincide. Quinta
    familia de la pasada: valores que la base admite y la aplicación nunca
    escribe. Este es el que más me preocupa de todo el barrido.

    El módulo de verificación existe para una cosa: la portería compara el
    documento físico del invitado contra el del preregistro. El enum de la base
    tiene tres resultados --`pendiente`, `verificado`, `no_coincide`-- y la
    función que escribe el resultado pone **`verificado` a fuego**, siempre.

    O sea que hay un solo botón y un solo desenlace. Si el documento no
    coincide --que es exactamente lo que el módulo existe para detectar-- el
    guardia no tiene dónde decirlo: o firma que coincide, o no toca nada y
    queda como si no hubiera mirado.

    Es la misma forma que el `<Badge status="Pendiente" />` ya documentado: la
    decisión vive en la llamada, no en la persona. Y no la ve ninguna prueba,
    porque escribir «verificado» es legítimo y la política lo permite.

    El KT dice que la verificación es manual --«el guardia compara el documento
    físico contra el del precheck-in»-- y **no dice qué pasa cuando no
    coincide**. Así que no me lo invento.

    **Lo que recomiendo:** dos botones en vez de uno, «Coincide» y «No
    coincide», y que el segundo deje constancia. Lo que no haría sin que lo
    digas es **bloquear la entrada**: un documento que no coincide puede ser un
    apellido mal escrito en el preregistro, y dejar a alguien en la calle por
    eso es una decisión del edificio, no mía. **Decisión tuya.**

100. ✅ **RESUELTO el 02/10/2026.** Una portería solo podía ser «entrada principal». El enum tiene dos
     tipos --`entrada_principal` y `acceso_vehicular`-- y la pantalla crea
     todas con el primero, escrito a fuego: `createPorteria({ ...form, tipo:
     "entrada_principal" })`. El formulario no ofrece el campo, y
     `acceso_vehicular` **no aparece en ningún sitio de la aplicación**.

     Doblemente muerto: no se puede elegir, y tampoco lo lee nadie. Un edificio
     con garaje no puede registrar su acceso vehicular, que es donde más falta
     hace saber qué portería es cuál.

     **Lo que recomiendo:** un selector de dos opciones en el formulario de
     porterías. Es pequeño. Pero igual que arriba, **decides tú** si merece la
     pena ahora.

     Y una nota de método: esta familia **no se automatiza**. Lo intenté y de
     trece señaladas, nueve eran falsos positivos míos --el buscador no veía
     las claves de objeto sin comillas, ni lo que vive en la web del
     preregistro--. Se barre a mano, como la de las columnas.

    **Hecho, con tu decisión: «si no coincide no lo deja entrar y ya pues».**

    El guardia ya tecleaba el número y la pantalla ya detectaba el desajuste; lo
    que faltaba era que sirviera de algo. Ahora, cuando no cuadra:

    · **queda anotado** como `no_coincide`, con quién lo miró y cuándo;
    · **y esa persona no puede entrar**: la base rechaza que se le registre el
      ingreso.

    Lo impide **la base, no la pantalla**, y eso es deliberado: marcar una
    llegada se puede pedir por la API sin pasar por ninguna pantalla, y quién
    cruza la puerta es un límite de seguridad física. Habría sido irónico
    arreglar «la decisión vivía en la pantalla» poniendo la decisión en la
    pantalla.

    Tres cosas que decidí y conviene que sepas, porque no las dijiste:

    · **«Pendiente» y «sin verificar» no bloquean.** Solo cierra la puerta un
      «no coincide» explícito. Hay visitas que no piden documento --lo decide
      el edificio-- y la portería registra gente que llega sin preregistro; si
      la falta de verificación bloqueara, no entraría nadie.
    · **Volver a verificar reabre la puerta.** Un apellido mal escrito en el
      preregistro no puede dejar a alguien en la calle para siempre.
    · **A quien ya entró no se le marca «no coincide» por detrás.** Sin esa
      regla, el orden de las dos escrituras decidiría el resultado y alguien
      podría quedar dentro con el documento marcado como falso sin que nadie se
      enterara. Un desajuste descubierto después es una incidencia que se trata
      en persona.

    Cuatro casos nuevos en el recorrido de la portería, los dos bloqueos
    comprobados apagándolos uno a uno: cada uno pone rojo el suyo.

101. ✅ **RESUELTO el 02/10/2026: una persona podía leer las tripas de la base.**
     Y era **una regresión mía del día anterior**, así que conviene contarla
     entera.

     Ayer arreglé que los avisos de error tiraran el motivo (punto 88): la base
     escribe frases pensadas para leerse --«Esta encuesta admite un solo voto
     por persona»-- y la aplicación las descartaba para mostrar un genérico. Al
     conectarlas, quedaron a la vista **las otras**, las que escribe Postgres
     por su cuenta:

     > *new row for relation "reserva_zona" violates check constraint
     > "reserva_zona_horario_coherente"*

     En inglés, nombrando una tabla, y sin decir qué hacer. Comprobado contra la
     base de verdad, no supuesto: pedí una reserva con la hora de fin antes que
     la de inicio y eso es lo que respondió.

     Una mejora destapó el agujero de al lado. Es lo que suele pasar al conectar
     una cadena que estaba suelta --está escrito en `AGENTS.md`-- y aun así me
     pasó, en menos de un día.

     **Hecho:** las restricciones que una persona puede provocar de verdad
     --veintiuna, de las 37 que hay-- se traducen al castellano. Y lo que no
     esté traducido **no se enseña**: se vuelve al genérico. Vale más «no se
     pudo guardar» que enseñar el nombre de una tabla. Lo mismo con las claves
     duplicadas y los permisos denegados.

     Lo que sí sigue llegando entero es lo que escriben los disparadores de
     este proyecto, que es justo lo que se quería ayer.

     Cuatro casos, comprobados quitando el arreglo: tres se ponen rojos.

102. ✅ **RESUELTO el 02/10/2026: tres pantallas afirmaban «no hay nada»
     mientras todavía estaban buscando.** Última familia de la pasada.

     Son dos situaciones distintas --«todavía no lo sé» y «lo sé, y no hay»-- y
     la segunda es una **afirmación**: quien la lee deja de esperar y se va. Ya
     había pasado en el Centro de Atención, donde la pantalla decía que no había
     ninguna PQRS mientras las estaba pidiendo.

     · **Notificaciones** decía «No tienes notificaciones por el momento».
     · **Zonas comunes** decía «No hay zonas comunes configuradas. Crea la
       primera» --invitando a la administración a duplicar las que ya tiene--.
     · **Coadministradores** decía «No hay coadministradores registrados».

     Las tres **ya tenían el dato a mano**: sus hooks exponían el estado de
     carga y la pantalla no lo miraba. Era una línea en cada una.

     Dos casos de prueba sobre la de notificaciones, comprobados quitando el
     arreglo. Las otras dos no llevan prueba propia: el patrón es el mismo y
     montar dos pantallas enteras de administración para comprobar un `if` no
     lo vale. Si vuelve a aparecer en una tercera, entonces sí toca guarda.

     **Lo que queda de esta familia y no es un defecto:** otros 19 archivos
     muestran un texto de vacío sin mirar la carga, y están bien: son
     componentes que reciben los datos ya cargados por su pantalla. El estado
     de carga es de quien pide, no de quien pinta.

103. ✅ **RESUELTO el 02/10/2026: dos de los puntos que esperaban decisión.**

     **Borrar una torre con viviendas (36).** Decidiste impedirlo y avisar. Lo
     sujeta la base, y el mensaje dice **cuántas viviendas quedan y qué hacer**:
     «Esta torre todavía tiene 2 vivienda(s). Elimina primero sus viviendas y
     después la torre.»

     La prueba que lo cubría nació documentando el comportamiento viejo con una
     nota: «si algún día se decide impedirlo, este caso se pone rojo y hay que
     venir a cambiarlo». Hoy fue ese día, y funcionó exactamente así.

     **La portería de acceso vehicular (100).** El formulario ya ofrece el tipo
     --«Entrada peatonal» o «Acceso vehicular»-- y arranca en peatonal, que es
     lo que tenían todas: el campo nuevo no cambia lo que ya existe. La etiqueta
     vive en el módulo compartido de enums, así que si alguien añade un tercer
     tipo a la base, el `typecheck` falla hasta que tenga nombre.

     Las dos comprobadas por mutación.

104. ✅ **RESUELTO el 02/10/2026: un solo camino para resolver una reserva.**
     Cierra el punto 37, que llevaba abierto desde el 26/09.

     Había dos pantallas listando las reservas de una zona, y la que **no**
     resolvía era la que se llama «Gestión de Zonas Comunes». Aprobar y
     rechazar vivían escondidos en la pantalla del residente, tras el menú de
     una reserva y condicionados al rol.

     La mitad ya estaba hecha --la de administración ganó sus dos botones-- y
     hoy se cierra la otra: **la pantalla del residente deja de cambiar de
     funciones según quién mire.** Se van de allí «Aprobar reserva»,
     «Rechazar reserva» y los tres cambios de estado a mano; se queda lo que
     cualquiera puede hacer con **su** reserva, que es cancelarla.

     Y el linter hizo su trabajo: al quitar los bloques saltaron **dos cabos
     sueltos** --`rol` y `actualizarEstadoReserva` quedaban pedidos y sin usar--
     que ya no tenía sentido traer a esa pantalla. Es la misma regla que
     encontró los cinco eslabones sin conectar de septiembre.

     Dos casos, comprobados devolviendo la opción: el negativo se pone rojo.

105. ✅ **RESUELTO el 02/10/2026: el alta de una torre construye lo que
     promete.** Cierra el punto 35, abierto desde el 26/09.

     El formulario pedía tres cosas que no producían nada, y una de ellas lo
     anunciaba por escrito: la vista previa decía «**Se generarán 5 unidades:
     101 a 105**» y no se generaba ninguna. Igual con las cocheras de visita:
     la Torre 3 declaraba diez y en todo el edificio existía **una** plaza de
     visitante, sin torre.

     Elegiste construirlos, y es lo que hay ahora: al crear una torre con su
     rango se crean sus viviendas, y con su número de cocheras se crean las
     plazas, en esa torre y con código propio.

     Tres decisiones que tomé y conviene que sepas:

     · **Solo al crear, nunca al editar.** Reconciliar un número con filas que
       ya existen es destructivo: bajar de diez a cinco tendría que borrar
       cinco plazas, quizá ya asignadas. Al editar, los números no vuelven a
       generar nada y lo que vale son las filas.
     · **El piso sale del código**: las dos últimas cifras son la puerta y lo
       de delante el piso --`901` es noveno--, que es la convención que ya
       siguen los datos del edificio.
     · **Hay un tope de 500 viviendas por rango.** Esto lo teclea una persona,
       y «101» a «10100» por un cero de más serían diez mil filas insertadas de
       golpe y sin vuelta atrás.

     Y lo que no se genera: un rango al revés o mal tecleado **no inventa
     nada**, y tampoco tumba el alta. La torre es lo que se pidió; un rango
     imposible es un dato mal escrito, no un motivo para no crearla.

     Cinco casos llamando a la función del repositorio, no a HTTP crudo.
     Comprobados quitando la generación: tres se ponen rojos.

106. ✅ **RESUELTO el 02/10/2026: las cinco tablas que nadie probaba.** Cierra
     el punto 95.

     Sus políticas estaban escritas y **nunca ejercidas**: cuatro tablas vacías
     y una con una fila. No es que hubiera un agujero; es que nadie sabía si lo
     había.

     Once casos, cada uno trayéndose lo que necesita y llevándoselo:

     · **Depósitos**: los da de alta la administración, un vecino los ve --salen
       en el directorio-- y no los toca.
     · **Comité de propietarios**: lo nombra la administración y **nadie se
       nombra a sí mismo**, que es lo que importa: pertenecer da voz en el
       edificio. Pero sí se ve quién está, porque un comité secreto no sería un
       comité.
     · **Fechas especiales de una zona**: un vecino las ve --necesita saber que
       el 25 está cerrada-- y no las pone.
     · **Cronología de una visita**: la ve quien puede ver la visita y **no la
       ve quien no**. Guillermo, dueño de la 101, sí; Sofía, que vive en la 102,
       no. Y no se puede borrar para tapar un rastro.

     La última es la que importaba. Guarda quién entró y cuándo, y su política
     delega entera en `puede_ver_visita`: si esa función fallara, se filtraría
     el historial de entradas a una vivienda ajena. Hoy está vacía; esto existe
     para que el día que la portería empiece a llenarla ya esté comprobado.

     Comprobado abriendo esa política de par en par: dos casos se ponen rojos.

107. ✅ **RESUELTO el 02/10/2026: la foto del documento ya se guarda.** Cierra
     el punto 31, aparcado desde el 25/09 «para desbloquear la demo».

     El problema de fondo no era un permiso mal puesto: **no había a quién
     dárselo.** Una política de Storage decide por sesión, y quien hace el
     preregistro no tiene ninguna --por definición: todavía no es nadie en el
     sistema--. Lo único que trae es el enlace, y un enlace no es una sesión.

     Lo resuelve una función de servidor, `subir-documento-precheckin`, que
     comprueba el enlace **antes** de tocar el bucket: que el token exista --se
     compara su hash, nunca el token--, que no haya vencido, que el preregistro
     no esté ya cerrado, y que lo que llega sea una imagen de menos de 8 MB.

     Dos cosas que decidí por el camino:

     · **El reverso tiene ahora su propia columna.** La pantalla pide las dos
       caras --una cédula tiene datos por detrás-- y solo había sitio para una.
       Guardar solo el frente habría dejado la segunda foto siendo un campo que
       se rellena y se tira, que es justo la familia que llevo dos días
       cerrando.
     · **Un fallo al subir no detiene el preregistro**, pero se dice. El número
       de documento --lo que TRA/SIRE pide-- ya está guardado, y la portería
       compara con el documento físico al llegar. Dejar a alguien tirado por
       una foto sería peor que la foto.

     La foto queda en el mismo bucket y bajo la misma ruta que las de portería
     --empieza por el uuid de la visita-- así que **la ve exactamente quien
     puede ver la visita**, ni uno más.

     Siete casos contra la función desplegada, sin sesión ninguna, que es la
     situación real del huésped. Comprobados desplegando una versión que no
     mira el enlace: el caso del enlace inventado se pone rojo.

108. ✅ **RESUELTO el 02/10/2026: el precheckin vive una sola vez.** Cierra el
     punto 63, que esperaba «a que hubiera servidor donde probarlo». Ya lo hay.

     La copia de la aplicación **no la ejecutaba nadie en producción**: el
     huésped recorre el preregistro en la web, sin cuenta, con su enlace. Solo
     la corrían las pruebas, así que **lo que se probaba no era lo que se
     usaba**.

     Y ya había divergido **tres** veces sin que nada lo dijera. Una se conocía
     --la fecha de nacimiento-- y dos salieron al unificar:

     · **El dominio del enlace final.** Una lo sacaba de la configuración y la
       otra del navegador: dos enlaces distintos para la misma cosa.
     · **Los nombres de los campos** de la ficha: en camello en una, como la
       base en la otra.

     Ahora la implementación vive solo en `veciyo-web/src/lib/precheckin.ts` y
     los recorridos de este repositorio llaman a esa, pasándole su cliente.

     **El obstáculo que el aviso anticipaba era real, y era de tipos.** Cada
     repositorio trae su propia copia del SDK de Supabase y TypeScript no las
     reconoce entre sí aunque en ejecución sean idénticas. Se resolvió haciendo
     que el módulo declare **lo que de verdad necesita** --una función para
     llamar a la base-- en vez de pedir el SDK entero. Además de resolverlo,
     dice la verdad: de todo el SDK ahí solo se usa `rpc`.

     Y el dominio ya no se adivina: fuera del navegador hay que pasarlo.

     El guarda se reconvirtió. Ya no compara dos copias --no las hay-- sino que
     salta si la aplicación vuelve a llamar a una función del flujo del huésped.
     Comprobado plantándole una.

109. ✅ **Dos bombas de tiempo que estallaron solas el 02/10/2026.**

     **La estancia de Nadia empezaba hoy.** Existe en los datos para ser «la que
     todavía no ha llegado» --es lo único que distingue «ve dónde se va a
     alojar» de «ve dónde está la llave»-- y su fecha de entrada estaba sembrada
     a fuego: el 02/10/2026. Tres pruebas se pusieron rojas sin que nadie tocara
     una línea, porque la persona que no había llegado acababa de llegar.

     Es la bomba ya documentada para las fechas escritas en el código de una
     prueba, con los **datos** en lugar del código.

     Mi primer arreglo fue peor: que cada prueba moviera sus fechas y las
     devolviera. Funcionaba por separado y **fallaba al correrlas juntas**, tres
     archivos empujando la misma fila. Se tiró y se aplicó el precedente que ya
     usaba Tomás: **su estancia a 2030**. Si nunca llega, nunca deja de ser la
     que no ha llegado.

     **Y una prueba que documentaba el comportamiento viejo de borrar torres**
     se puso roja al cambiarlo, que es exactamente para lo que estaba escrita.
     Reescrita con los dos lados, y dejando dicho que el borrado **sigue siendo
     lógico**: las visitas y la correspondencia de años siguen colgando de esa
     torre.

110. 🔶 **El correo: todo montado menos las credenciales (02/10/2026).** Pediste
     «construye las plantillas y deja configurado todo en Supabase; luego yo
     pongo el SMTP». Hecho.

     **Las cuatro plantillas**, en `enviar-correo`. Son los correos que van a
     alguien que **todavía no tiene la aplicación**, que es donde el correo es
     el único canal: la invitación al edificio, el enlace del preregistro, el
     acceso del huésped al terminarlo, y el del acompañante.

     Lo demás --paquete recibido, reserva aprobada, reconocimiento-- ya viaja
     como notificación dentro de la aplicación, a gente que la tiene instalada.
     Duplicarlo por correo es una decisión que nadie ha tomado, así que no la
     tomé yo.

     **El transporte está montado**, por SMTP. Para encenderlo:

         supabase secrets set SMTP_HOST=... SMTP_PUERTO=587 \
           SMTP_USUARIO=... SMTP_CLAVE=... SMTP_DESDE="VeciYo <hola@tudominio>"

     Sin esos secretos responde **200 con `enviado: false` y la plantilla
     dentro**, no un error: la aplicación ya enseña el enlace en pantalla cuando
     el correo está apagado, y romper una invitación entera porque no hay
     servidor de correo sería peor que no enviarla. De paso, así se puede leer
     qué se habría mandado sin desplegar nada.

     **Y la configuración del proyecto, que eran dos de las tres cosas del
     punto 58:**

     · `site_url` pasa de `http://localhost:3000` a la web de verdad, y la lista
       de redirecciones permitidas --que estaba **vacía**-- ya incluye la web,
       la aplicación y el entorno local. Sin eso, el enlace del correo llevaba a
       localhost.
     · **La pantalla de nueva contraseña existe y funciona.** Era una maqueta
       --`onSubmit` que no hacía nada-- que además pedía «la contraseña actual
       recibida en el correo», la idea que se descartó. Y **no estaba enrutada**,
       así que no se podía llegar a ella ni escribiendo la dirección. Ahora está
       en `/nueva-contrasena`, que es justo a donde la aplicación ya apuntaba.
     · De paso, la contraseña mínima sube de 6 a 8 caracteres.

     **Lo único que queda es tuyo: las credenciales del servidor de correo.**

     Y un hueco que salió al conectarlo, pequeño pero real: al **abrir** el
     preregistro todavía no hay correo del huésped --lo rellena él mismo al
     hacerlo, y el anfitrión solo pone el nombre al reservar--. Así que ese
     enlace se sigue compartiendo a mano, como hoy. Si quieres que salga por
     correo, el formulario de la visita tiene que pedir el correo del huésped:
     es un campo. **Decisión tuya.**

111. ✅ **RESUELTO el 02/10/2026: una queja puede señalar a una vivienda.**
     Cierra la mitad del punto 98 y el hueco del 56.

     `reclamo.unidad_denunciada` existía desde la primera migración, estaba
     indexada, y **no la escribía ni la leía nadie**. Una queja de convivencia
     --ruido, humedades, un huésped que molesta-- no tenía dónde decir contra
     quién iba.

     Decidiste dos cosas y las dos están puestas:

     · **Señala a la vivienda, no a la persona.** Es menos invasivo y es lo que
       la administración necesita para actuar: quién vive allí ya lo sabe.
     · **La leen solo quien la escribió y la administración.**

     Lo segundo **ya lo cumplía la política** --`creado_por = auth.uid() OR
     es_admin_condominio(...)`-- así que no hubo que tocar permisos. Lo que
     faltaba era poder escribir la columna, y una prueba que dejara dicho lo
     que no puede pasar.

     Esa es la que importa: **la vivienda denunciada no se entera**. Si Sofía
     pudiera leer la queja de Guillermo sabría quién la denunció y qué dijo, y
     eso no se arregla después: queda escrito. Comprobado abriendo la política
     de par en par; ese caso es el que se pone rojo.

     Dos detalles del formulario: el campo es **opcional** --la mayoría de las
     quejas del edificio no van contra nadie, y obligar a señalar convertiría
     cada queja en una denuncia-- y **solo aparece en las quejas del
     condominio**: señalar una vivienda desde un reporte sobre la aplicación no
     significa nada.

112. ✅ **RESUELTO el 02/10/2026: ya existe quien opera la plataforma.** Cierra
     también el 41.

     Hasta hoy el rol más alto del producto era `administrador`, y su poder
     acaba en su edificio. Eso está bien y no se tocó: el aislamiento entre
     condominios es el requisito de seguridad central. Lo que no existía era
     **quien opera VeciYo**: dar de alta un edificio nuevo, atender las quejas
     sobre la aplicación —no sobre el edificio— y saber cuánta gente la usa. Eso
     se venía haciendo con la clave de servicio del proyecto, que no deja rastro
     de quién hizo qué.

     Elegiste el alcance entre tres opciones, y es lo que da forma a todo:
     **lo de la plataforma y nada de los vecinos**.

     · **Sí ve:** la lista de edificios con sus conteos, el alta de uno nuevo,
       las PQRS de área `aplicacion` y los totales.
     · **No ve:** nada de una persona concreta. Ni chats, ni documentos, ni
       correspondencia, ni visitas, ni reservas, ni pagos, ni votos, ni las
       PQRS del edificio.

     Por eso **no hay ni una política nueva sobre las tablas del dominio**. Lo
     que el panel necesita sale de funciones que devuelven agregados, y la lista
     de lo que puede pedir es finita y está en un archivo. El atajo —una línea,
     `or es_staff_plataforma()` en las políticas de lectura— habría convertido
     la regla 7 en una bandera que la apaga.

     Dos piezas que son las que de verdad podían salir caras:

     · **El único hueco por el que la plataforma entra a un edificio se cierra
       solo.** Invitar a su primera administración solo funciona si el edificio
       **no tiene ninguna**. Uno recién creado lo está; uno en marcha, no. Sin
       ese límite, el dueño de la plataforma podría invitarse como
       administrador de cualquier edificio con vecinos dentro.
     · **Nadie se nombra a sí mismo**, ni para darse ni para quitarse nada. Va
       en un disparador, no en una política, porque RLS no sabe comparar el
       valor viejo con el nuevo. El primer dueño lo siembra la clave de
       servicio, y ese es el único camino de entrada a propósito.

     Y queda **bitácora**: lo que se hace desde el panel se anota con quién, y
     no se puede editar ni borrar, ni desde la pantalla ni por la API.

     **Lo que queda pendiente, y lo decides tú:**

     · **Entrar a dar soporte a un edificio concreto.** Se descartó por ahora.
       Si se retoma, hay que decidir si la administración del edificio tiene
       que autorizarlo y durante cuánto tiempo.
     · **Quién más va en el equipo.** Hoy hay un solo dueño. El rol `soporte`
       —atiende las PQRS de la app y nada más— existe y no lo tiene nadie.

113. ✅ **RESUELTO el 03/10/2026: el selector de fecha no se abría en ocho
     pantallas.** Lo reportaste así: «en muchos lugares no se abría el selector
     de fecha». No eran muchos fallos, era **uno**, repetido dieciséis veces.

     `@react-native-community/datetimepicker` **no tiene implementación en
     web**: devuelve `null`. El `Pressable` respondía, el estado cambiaba, el
     componente se montaba y no se pintaba nada. Sin error, sin pantalla rara,
     sin nada que investigar.

     Y las pruebas no podían verlo, porque **doblaban ese paquete devolviendo
     `null`**: reproducían el defecto en vez de detectarlo.

     Ahora las fechas se eligen con `CampoFecha` y las horas con `CampoHora`,
     los dos React Native puro. Hay guarda (`npm run pretest`, tope 0) y seis
     pruebas de componente, comprobadas rompiendo el componente a propósito.

     **De paso:** el filtro de fechas de visitas no habría filtrado ni
     abriéndose —guardaba `dd/MM/yyyy` y comparaba contra ISO—. Comprobado en el
     navegador: elegir el 20/10 pasa la lista de «2 de 2» a «0 de 2».

114. ✅ **RESUELTO el 03/10/2026: el preregistro ya no se vacía.** Si el huésped
     cerraba el enlace y volvía, el formulario salía en blanco: once campos a
     teclear otra vez y las fotos del documento a subir de nuevo, sin saber
     siquiera si ya estaban.

     Todo estaba guardado. Lo que faltaba era una función que lo devolviera:
     `consultar_precheckin` entrega la reserva y no toca la tabla del invitado.

     Y ahora volver al enlace **lleva al paso donde se quedó**. Recorrido a mano
     en la web desplegada: nueve campos, borrar la sesión del navegador, reabrir
     el enlace, y caen los nueve en su sitio.

115. ✅ **RESUELTO el 03/10/2026: cada acompañante acepta sus propios
     términos.** `aceptar_terminos_precheckin` marcaba **solo al titular**, y
     `cerrar_precheckin` solo comprobaba al titular: un preregistro se cerraba
     con cuatro acompañantes que no habían aceptado nada.

     Aceptar unas condiciones en nombre de otro adulto no vale. El titular puede
     teclearle los datos —lo pediste tú— pero los términos no.

     La pantalla del acompañante (`/access/acompanante/:id`) era **una maqueta
     completa**: ignoraba el identificador, esperaba un segundo y navegaba con
     datos inventados. Ahora es real, y la ruta lleva `:token` y no `:id`
     —**un uuid de invitado no es una credencial**—.

     Se añadió además **cuándo** se aceptó y **qué versión** del reglamento: un
     «acepto» con valor legal sin sello temporal no es constancia de nada, y si
     el edificio cambia sus condiciones no había forma de saber qué aceptó quien
     ya pasó.

     **Cambio de comportamiento visible:** una reserva con acompañantes que no
     han aceptado deja de poder cerrarse. El mensaje los nombra.

116. ✅ **RESUELTO el 03/10/2026: cada teléfono con su país.** Había once
     columnas de teléfono en nueve tablas y una sola sabía de qué país era el
     número. La que lo tenía era un campo libre donde cabía «+57», «57» o
     «Colombia», las tres en la misma columna.

     Importa para WhatsApp —que necesita el prefijo— y para el huésped, que casi
     nunca tiene número del país donde se aloja.

     Puesto ya en configuración del perfil y en el preregistro. **Quedan ~12
     pantallas** por sustituir (portería, coadministradores, servicios, PQRS…):
     el componente y las columnas ya están.

     Lo viejo **no se normalizó a ciegas**: «57» podría ser Colombia, pero
     adivinarlo es inventarse el dato de alguien. Se corrige cuando su dueño
     abra su perfil.

117. ✅ **RESUELTO el 03/10/2026: la web se tragaba el motivo de todos sus
     errores.** Salió recorriendo el preregistro entero a mano. Al pulsar
     «Finalizar preregistro» con un acompañante que no había aceptado, la
     pantalla decía **«No pudimos cerrar el registro»** y nada más.

     La base sí se explica —«Falta que acepten los terminos: Diego Ortiz. A cada
     uno le llega su propio enlace; nadie puede aceptarlos por el»— y esa frase
     existe justamente para que el titular sepa a quién llamar.

     La causa: las siete pantallas hacían `e instanceof Error ? e.message : '…'`,
     y el error de Supabase es un **objeto plano**. Nunca pasa esa prueba, así
     que el motivo se tiraba **siempre**, en los siete sitios.

     Es el mismo síntoma que viste tú el 02/10 con el 409: el motivo estaba y la
     pantalla lo tapaba. Lo cuenta ahora `npm run motivos`, con la marca en cero
     y enganchado al `build`, o sea que un despliegue con uno nuevo no sale.

118. 🎨 **Las tarjetas y el calendario se estiran a toda la pantalla en un
     navegador ancho.** En la pantalla de la vivienda cada tarjeta ocupa ~600px
     de alto con un icono de 60px en medio, y el calendario de una visita nueva
     pinta celdas de 200px: hay que hacer cinco scrolls para ver octubre.

     En un teléfono se ve bien. Es la aplicación móvil estirada: no hay un ancho
     máximo para el contenido. Decidir si se le pone uno —y cuál— es tuyo.

119. ❓ **El nombre que escribe el anfitrión llega entero al campo «Nombres» del
     huésped.** El anfitrión escribe «Valentina Ortiz» en un solo campo, y el
     preregistro lo prellena todo en «Nombres», dejando «Apellidos» vacío.

     Partirlo por el primer espacio sería adivinar: en Colombia son dos
     apellidos y hay nombres compuestos. Las opciones son pedirle al anfitrión
     nombre y apellido por separado, o dejarlo así y que el huésped lo corrija
     —que es lo que hace hoy—. Tú decides.

120. ✅ **RESUELTO el 03/10/2026: cada menor con quien responde por él.** Hasta
     hoy «es menor» era una casilla que marcaba quien tecleaba, y no existía
     forma de decir quién se hace cargo del niño: buscando «parentesco»,
     «tutor» o «acudiente» en toda la base salían cero resultados.

     Y la casilla no era inocente. A un menor no se le pide documento —no lo
     tiene— así que **marcarse como menor era la forma de entrar al edificio sin
     identificarse**. Ahora, quien dice su fecha de nacimiento no elige además
     si es menor: lo calcula la base, contra el día en que empieza la estancia
     (quien cumple 18 durante el viaje entra como adulto; quien los cumple
     después es menor todo el tiempo que está dentro).

     Lo que pediste queda así: **todo** menor necesita un responsable, que tiene
     que ser un adulto de esa misma reserva; y si no es su padre ni su madre,
     además hay que subir la autorización firmada. Padre y madre no la
     necesitan: su vínculo no se acredita con un permiso de viaje.

     Recorrido entero a mano en la web: añadir al niño, elegir quién responde,
     marcar «su tutor legal», intentar finalizar —lo rechaza nombrándolo—,
     subir el papel, y cerrar.

121. ✅ **RESUELTO el 03/10/2026, y es gordo: ninguna de las seis funciones de
     servidor se podía llamar desde un navegador.**

     Entre ellas, el **reporte a la TRA**, el **reporte al SIRE**, el **envío de
     correo**, la **sincronización del calendario de Airbnb** y la **foto del
     documento del preregistro** —esta última dada por resuelta el 02/10—.

     El motivo es técnico y está en el commit. Lo que importa: todas fallaban
     con un «Failed to fetch» que no dice nada, y las pruebas no lo veían porque
     corren fuera del navegador. Salió al primer intento de subir la
     autorización de un menor desde la pantalla.

     Arregladas y comprobadas las seis. Hay un contador que impide que vuelva a
     pasar.

     **Esto no quiere decir que la TRA, el SIRE o el correo ya funcionen de
     punta a punta**: siguen esperando el token del ministerio y las
     credenciales de correo. Lo que estaba roto era el camino hasta ellas.

122. ✅ **RESUELTO el 03/10/2026: el preregistro que nadie termina ahora avisa
     solo.** Hasta hoy **no existía ninguna tarea automática en todo el
     proyecto**: quien abría su enlace, llenaba la mitad y lo dejaba, no volvía
     a saber de VeciYo. Aparecía en la puerta sin registrar.

     Es **parametrizable**, como pediste. Cada anfitrión elige, en su vivienda:
     si se avisa al huésped, si se le avisa a él, y con cuántos días de
     antelación (14, 7, 3, 2 o 1). Por defecto, 7, 3 y 1.

     Un detalle que conviene saber: **cada aviso al huésped le manda un enlace
     nuevo y el anterior deja de funcionar**. No es un capricho — el enlace
     viejo no se puede recuperar, en la base solo vive su huella. La pantalla lo
     dice, y por eso ese aviso se puede apagar.

     Los correos salen todos los días a las 9 de la mañana (hora de Colombia).
     **Hace falta el SMTP para que lleguen de verdad**: hoy el sistema prepara
     el correo y lo deja listo, pero sin credenciales no sale del servidor.

123. ✅ **RESUELTO el 03/10/2026: la última pantalla del huésped.** Añadido lo
     que pediste: que traiga sus documentos físicos, y que **quien se presente
     tiene que ser quien se registró** —eso no es un consejo, la portería no
     deja entrar a alguien cuyo documento no coincide, y nadie se lo advertía—.
     Y qué gana creando su cuenta: wifi, puerta, chat con portería, zonas
     comunes, sus visitas y su correspondencia.

     **Quitadas las insignias de App Store y Google Play**, que apuntaban a
     `#`: dos botones que no llevaban a ninguna parte en la última pantalla del
     registro. En su lugar, una frase que dice la verdad: la aplicación
     funciona desde el navegador y las versiones de tienda llegan más adelante.
     El día que haya algo publicado, se vuelven a poner.

124. ✅ **RESUELTO el 03/10/2026: un reconocimiento al mes, y solo entre
     vecinos.** Lo pediste así y no estaba: el límite que había era *una de
     cada tipo* al mes, y con ocho insignias en el catálogo una sola persona
     podía repartir ocho al mismo vecino el mismo mes. Un reconocimiento que se
     puede dar sin límite no reconoce nada.

     Ahora es **uno al mes por persona**, y solo se le puede dar a alguien que
     vive en el edificio — un huésped temporal está de paso y queda fuera, por
     los dos lados.

     La portada dejó de decir «Regalos por dar 0», que no significaba nada, y
     dice si te queda el tuyo o si ya lo diste.

     Las dos filas viejas que no cumplirían la regla **se quedan donde están**:
     la regla aplica de aquí en adelante.

125. ✅ **RESUELTO el 03/10/2026: la encuesta cerrada te pregunta qué hacer con
     los resultados.** Como pediste. Y debajo había un defecto:

     La tarjeta de una encuesta con resultados ocultos decía *«los resultados se
     mostrarán al cierre de la encuesta»*, y **eso no pasaba nunca**. La casilla
     se fijaba al crearla y nadie la volvía a tocar. Es la peor forma del
     problema de este proyecto: no un botón que no hace nada —eso se nota— sino
     una frase que promete algo que no va a ocurrir, porque quien la lee no
     vuelve a mirar: espera.

     Ahora, al entrar a Anuncios, la administración ve arriba las encuestas que
     cerraron esperando decisión, con dos botones: **publicar resultados** o
     **dejarlos en borrador**. Queda registrado quién lo decidió y cuándo, y se
     puede volver atrás — publicar por error algo sensible no puede ser
     definitivo por un clic.

     De paso se tapó un agujero: los resultados finales se enseñaban al cerrar
     **aunque la encuesta estuviera marcada como secreta**, que es justo lo
     contrario de lo que esa casilla promete.

126. ✅ **RESUELTO el 03/10/2026: las condiciones para que te aprueben una
     zona.** Como pediste, texto libre. Hasta hoy «requiere aprobación» era un
     interruptor y nada más: la reserva quedaba en Pendiente y quien la hacía
     no tenía forma de saber qué hacía falta cumplir —si pagar antes, si avisar
     con dos semanas, si el salón no se presta después de medianoche—.

     El administrador lo escribe al configurar la zona, y **el residente lo ve
     antes de reservar**, que es cuando todavía puede hacer algo al respecto.

     No se metió en el reglamento, que ya existía: ese son las normas de uso de
     la zona y se enseñan siempre. Esto es el criterio con el que alguien dice
     que sí o que no, y mezclarlos obligaría a leer tres párrafos de normas de
     piscina para encontrar que hay que mandar el comprobante.

127. ✅ **RESUELTO el 03/10/2026: el edificio elige qué publica de las
     cuotas.** Tres opciones, como pediste: **solo el porcentaje**, **quién
     está al día**, o **quién está al día y quién debe**. Por defecto la
     primera, que es lo que había.

     No es una preferencia de pantalla: publicar quién debe, en un edificio
     pequeño, es señalar a un vecino por su nombre. Por eso lo decide la
     administración y la base lo obedece — con la opción cerrada, la lista de
     morosos no sale ni en la respuesta. La administración lo ve todo siempre:
     es quien cobra.

     Y **el mes en curso sale siempre**, también como pediste. Antes el
     carrusel saltaba de agosto a junio si nadie había definido la cuota de
     septiembre, y no había forma de saber si es que todos pagaron o que nadie
     la creó. Ahora ese mes se ve, y si no tiene cuota lo dice en vez de
     enseñar un 0% que acusaría a los vecinos de no pagar algo que no se les ha
     pedido.

128. ✅ **RESUELTO el 03/10/2026: la galería de iconos de una zona.** Como
     pediste. Hasta hoy el icono salía del **tipo** de la zona: dos «BBQ» se
     veían con el mismo dibujo y una zona de un tipo raro se quedaba sin
     ninguno. Los ocho dibujos ya estaban en la aplicación y no había forma de
     escogerlos.

     Ahora el administrador elige uno, y si no elige ninguno se usa el del
     tipo, como antes.

129. ✅ **RESUELTO el 03/10/2026: los requisitos de la imagen, dichos por
     delante.** Lo pediste y había algo peor debajo:

     **La imagen de una zona nunca se guardaba.** El administrador la subía, la
     veía en la vista previa, guardaba… y al volver no estaba. No existía ni el
     sitio donde ponerla. Ahora se guarda de verdad.

     Y los requisitos se ven **antes** de elegir el archivo —«JPG, PNG o WEBP,
     hasta 5 MB»— en vez de aparecer como error después. Si la imagen pesa de
     más, el mensaje dice cuánto pesa, no solo que sobra.

130. ✅ **RESUELTO el 03/10/2026, y no lo buscaba: el formulario de una zona
     tenía cuatro campos que no se guardaban.** «Permitido para estancias
     cortas», «para estancias largas», las condiciones de aprobación y el
     icono: se podían cambiar, la pantalla los pintaba, y al guardar no
     llegaban a la base.

     Los dos primeros ya se habían arreglado una vez —en la capa de datos, con
     su comentario diciendo «se podían cambiar y no se guardaban nunca»— y la
     pantalla siguió sin mandarlos. Salió contando cuántos campos del
     formulario aparecían en el guardado.

     Además, cambiar un solo campo **borraba los demás**: tocar «permite
     estancia corta» dejaba la zona sin icono, sin descripción y sin
     reglamento. No se notaba porque la pantalla siempre manda el formulario
     entero, pero cualquier pantalla nueva lo habría sufrido.

131. ✅ **RESUELTO el 05/10/2026: el depto junto al nombre, en lo que
     faltaba.** Lo pediste el 02/10 como «el TAG del depto junto al rol», y al
     preguntarte en qué pantalla lo habías visto dijiste lo que de verdad
     querías: «va siempre, casi en todo lado donde salga el nombre o el
     alias».

     Al contarlo, en casi todos esos sitios ya estaba: el directorio **es** la
     vivienda, el cuadro de honor titula la tarjeta con el departamento, las
     reservas de zona dicen quién y de dónde, y los hilos de portería salen
     como «Seguridad · Dpto 301».

     Faltaban tres, y en los tres se notaba:

     · **El chat de grupo.** Un mensaje decía solo el nombre. En un grupo de
       residentes eso son cincuenta nombres sin ninguna pista, y con el alias
       encendido es peor: «Vecino Misterioso» a secas. Ahora va «Marcela
       Sierra · 301», y el depto lo pone la base al enviar —no se le deja
       poner a nadie: si lo pusiera la aplicación, un vecino podría escribir
       con el depto de otro—.
     · **Los resultados de una encuesta.** Decían el depto **o** el nombre, no
       los dos: en «A favor» salía «301» y en «No votaron», números sueltos
       sin nadie a quien llamar, que es justo para lo que se mira esa lista.
     · **Las PQRS.** La lista del edificio decía quién la abrió y no de qué
       vivienda: una queja de ruido o una fuga obligaba a abrir la ficha para
       saber a dónde ir. El dato estaba en la base desde el primer día y la
       consulta no lo pedía.

     Quien no vive en el edificio —la administración, la portería— no lleva
     etiqueta: no tienen depto, y una en blanco se lee como un dato que falta.

132. ✅ **RESUELTO el 05/10/2026, y no lo buscaba: en el chat de grupo, mis
     propios mensajes salían firmados «yo».** En minúscula, donde va el
     nombre. Lo vi escribiendo un mensaje en el grupo de residentes para
     comprobar lo de arriba.

     Por dentro, un mismo campo significaba dos cosas: el nombre de quien
     escribe y, si el mensaje era mío, la palabra «yo» —que servía para
     decidir a qué lado va la burbuja—. En una conversación de dos no se nota,
     porque ahí el nombre del autor no se pinta. En un grupo, sí.

133. ⚠️ **Decisión tuya: quien tiene dos viviendas, ¿con cuál vota?** Guillermo
     es propietario de la 101 y de la 205, y en «No votaron» aparece **dos
     veces**, una por cada una. Eso está bien: un voto por vivienda.

     Pero al votar, la aplicación le atribuye el voto a **la primera de las
     dos**, elegida sin ningún criterio. O sea que vota una vez y la otra
     vivienda sigue contando como pendiente, y cuál de las dos queda votada es
     cuestión de suerte.

     Tres salidas posibles y ninguna la decido yo:

     a) que elija él, con un desplegable al votar;
     b) que su voto cuente por todas sus viviendas a la vez;
     c) que vote una vez por vivienda, o sea dos veces en esta encuesta.

     El KT no lo dice. Hasta que lo decidas se queda como está, que es la
     opción (a) sin preguntar.

134. ⚠️ **Para tu información: los votos de antes del 1 de octubre no tienen
     vivienda.** Cinco de los ocho que hay en la base son de la siembra de
     septiembre, de cuando el voto todavía no se ataba a un departamento. Esos
     salen con el nombre y sin etiqueta.

     Todo lo votado desde la aplicación a partir del 01/10 la lleva. No los
     toco porque son datos de prueba y se purgan antes de la marcha blanca; si
     prefieres que se vean completos mientras muestras la aplicación, se les
     puede poner la vivienda de cada quien en un minuto.

135. ✅ **RESUELTO el 05/10/2026: los canales del chat.** Lo pediste el 02/10:
     «canales creados al dar de alta el edificio, con nombre y roles,
     editables». Hasta hoy no había canales: había **dos grupos fijos**, y lo
     eran en tres sitios a la vez —una lista cerrada de dos valores en la base,
     un límite que no dejaba tener un tercero, y quién pertenecía a cada uno
     escrito dentro de una función—. Cambiar los roles de un grupo era trabajo
     de programación.

     Y nadie los creaba: un edificio dado de alta desde el panel nacía con el
     chat vacío. El único grupo que había en la base era de la siembra.

     Ahora: **Vivienda → Configuración → CANALES DEL CHAT**. Se crean, se les
     cambia el nombre y los roles, y se archivan. Un edificio nuevo nace con
     «Residentes» y «Propietarios» puestos, y la administración los edita.

     Dice a cuánta gente alcanza cada canal, porque marcar roles sin ver eso es
     marcar a ciegas: «corresidente» puede ser una persona o ciento.

     Y **el residente entra solo** —lo otro que pediste—: se entra por el rol,
     no uno a uno. Quien llega al edificio con ese rol aparece en el canal, y
     quien se va deja de aparecer. No hay que dar de alta a nadie ni acordarse
     de darlo de baja.

136. ⚠️ **Decisión tuya, y cambia algo: la administración ve y modera todos los
     canales.** Pediste moderación, y no hay forma de retirar un mensaje que no
     se ve. La consecuencia es que **el canal de propietarios deja de ser
     privado frente a la administración**.

     Hasta hoy el administrador solo lo veía si además era propietario. Si
     quieres un canal que la administración no lea, hay que decirlo y se hace
     —pero entonces en ese canal no hay moderación posible—.

     Lo que **no** cambia: el hilo de un vecino con la portería sigue siendo
     privado. Eso se decidió en su día (D-13) y sigue igual; un hilo con la
     portería tampoco se modera, por lo mismo.

137. ⚠️ **Decisión tuya: un mensaje retirado desaparece sin dejar rastro.** Hoy
     se va y el hilo queda como si nunca hubiera habido nada.

     La alternativa es dejar una lápida —«Mensaje retirado por la
     administración»—. A favor: sin ella, una conversación pierde mensajes en
     silencio y después se discute sobre lo que se dijo. En contra: la lápida
     señala que alguien escribió algo que hubo que quitar, y a veces lo mejor
     es que no quede ni eso.

     Queda constancia **en la base** de quién lo retiró y cuándo —su autor o la
     administración—, así que la decisión es solo sobre lo que se ve.

     Y una cosa que falta en cualquiera de los dos casos: a quien le retiran un
     mensaje **no se le avisa**. Hoy el chat no genera notificaciones de ningún
     tipo (ver el punto siguiente).

138. ✅ **RESUELTO el 05/10/2026: silenciar un canal.** Como pediste. El canal de
     residentes de un edificio de cien viviendas suena igual que el hilo con la
     portería, y la única salida era no mirar.

     Conviene que sepas **qué apaga exactamente**: hoy el contador de no leídos
     —la cifra que hace que uno entre—. Un mensaje de chat todavía no genera una
     notificación en el teléfono, así que esa cifra es lo único que avisa. La
     lista lo pinta en gris con la campana tachada, para que el interruptor se
     note.

     El día que el chat avise de verdad, el silencio ya está puesto donde hay
     que mirarlo antes de avisar.

139. ✅ **RESUELTO a medias el 05/10/2026, y la otra mitad no es código: los
     avisos por WhatsApp.** Pediste «WhatsApp configurable por residente y por
     tipo de aviso». Está en **Perfil → Configuración → Avisos: de qué y por
     dónde**: ocho tipos de aviso, y para cada uno aplicación, correo y
     WhatsApp.

     Lo que funciona de verdad hoy: la campana de la aplicación. Apagar «Llega
     un paquete» lo apaga —la notificación no se crea—, y apagar uno no apaga
     los demás.

     Lo que **no sale todavía**: el correo y el WhatsApp. Falta una cuenta de
     WhatsApp Business API (o un intermediario como Twilio) con sus
     credenciales, y el servidor de correo propio que ya está pendiente desde el
     punto 58. La pantalla lo dice con un aviso, en vez de callarlo: lo que
     elijas queda guardado y se respeta en cuanto estén.

     Dos cosas decididas por el camino, dime si no estás de acuerdo:

     · **la alarma de S.O.S. no se puede apagar**, por ningún medio. Una alarma
       de pánico que se silencia no es una alarma;
     · **no se deja encender WhatsApp sin un teléfono en el perfil**, porque el
       aviso no llegaría a ninguna parte y nadie se enteraría.

140. ⚠️ **Para tu información: publicar un anuncio no avisa a nadie.** Apareció
     al conectar lo de arriba. El tipo de aviso «Se publica un anuncio» existe
     en la base desde septiembre y **nadie lo crea**: se publica el anuncio y
     ningún vecino recibe nada; hay que entrar a mirar.

     No lo he tocado porque no es de lo que pediste y conviene decidirlo: ¿a
     quién avisa, a todo el edificio o solo a quien le toca por el público del
     anuncio? ¿Y las encuestas, que tienen fecha de cierre, avisan también
     cuando quedan dos días?

141. ✅ **RESUELTO el 05/10/2026, y no lo buscaba: nadie podía borrar un mensaje
     del chat, ni el suyo propio.** El botón no existía todavía, así que no se
     notaba; al ponerlo, no funcionaba.

     El motivo es de los que no se ven leyendo: la regla que esconde los
     mensajes borrados hacía que **el propio borrado se rechazara a sí mismo**.
     Estaba así desde el 22 de septiembre, con un comentario en el código que
     afirmaba lo contrario.

142. ✅ **RESUELTO el 05/10/2026, y es lo más grave de la tanda: un mensaje
     enviado se podía reescribir.** Quien lo escribió podía cambiarle el texto
     después —y el de quién lo firmaba—, sin que la pantalla distinguiera un
     mensaje editado de uno que siempre dijo eso.

     O sea: escribir algo en el canal, dejar que lo lean, y cambiarlo por otra
     cosa. Ya no.

143. ⚠️ **Para tu información: el perfil de Sofía no se podía editar, por nada.**
     Ni su nombre, ni su teléfono, ni su alias. Su fila tenía guardado «+57»
     donde va el código de país («CO»), de antes de que el selector de teléfono
     existiera, y una regla de la base dejaba la fila inservible: cualquier
     cambio fallaba quejándose de un campo que no se había tocado.

     Corregido, y comprobado que no queda ninguna otra fila así. Sofía es la
     cuenta que más sale en las demostraciones.

144. ⚠️ **Para tu información, de seguridad: dos cosas internas que podía
     disparar cualquiera.** Aparecieron mientras probaba lo de los avisos:

     · cualquiera con sesión —y en un caso, sin cuenta siquiera— podía meterle
       a toda una vivienda una notificación con el texto que quisiera («Tienes
       un paquete en portería», «Te rechazaron la reserva»);
     · y podía disparar la pasada completa de recordatorios del pre-registro,
       que **le emite un enlace nuevo a cada huésped y anula el que tenía**.

     Las dos cerradas, con su prueba. Y antes, el 2 de octubre, otras tres de la
     misma familia: una de ellas descontaba una verificación de antecedentes
     —que se paga— sin mirar quién la pedía.

     No hay indicios de que nadie lo haya usado; las cuentas son todas de
     prueba. Lo cuento porque es el tipo de cosa que conviene que sepas que se
     revisa.

145. ✅ **RESUELTO el 05/10/2026: publicar un anuncio ahora sí avisa.** Como
     dijiste. Hasta hoy no avisaba a nadie: se publicaba y había que entrar a
     mirar.

     Tal como lo pediste:

     · **avisar es opcional, por publicación.** Una casilla en el formulario,
       marcada por defecto, igual para un anuncio y para una encuesta;
     · **nada de recordatorios** antes de que cierre una encuesta. No se ha
       construido;
     · **la fecha de publicación programa de verdad.** Hasta ese día el anuncio
       no se ve y no avisa; ese día sale el aviso, a primera hora, y solo a
       quien le toque por la audiencia que elegiste.

     Respeta lo que cada vecino eligió en «Avisos: de qué y por dónde», y no se
     avisa a quien lo publicó.

146. 🚫 **RETIRADO el mismo día: lo de corregir un anuncio.** Lo construí porque
     tu respuesta sobre avisar del cambio lo daba por hecho, y me lo zanjaste
     bien: «pero si no había lo de corregir anuncio, pues no lo pongas». Tienes
     razón —no era lo que pediste—. Fuera el botón, el formulario de corrección
     y lo que hacía falta en la base.

     Lo que se queda es lo que sí pediste: que publicar avise, la casilla para
     elegirlo, y que la fecha de publicación programe.

147. ✅ **RESUELTO el 05/10/2026: fuera «Fecha de finalización» de un anuncio.**
     Como dijiste: eso solo en encuesta. Y tenías razón en que sobraba, porque
     en un anuncio **no filtraba nada** —pasado ese día el anuncio se seguía
     viendo igual—. Era otro campo que prometía algo que no pasaba.

     En una encuesta se queda, porque ahí es cuando cierra la votación y eso sí
     funciona.

     Lo guardado no se toca: si algún anuncio ya tiene una fecha ahí, sigue en
     la base. Borrar datos tuyos para limpiar una pantalla no se hace.

148. 🚫 **No se añade botón de borrar un anuncio.** Como dijiste. La función
     sigue escrita en el código desde antes y ninguna pantalla la llama; si
     algún día la quieres, se pone.

149. ✅ **RESUELTO el 05/10/2026: el aviso de la consola.** El que me pasaste:
     «Unexpected text node. A text node cannot be a child of a View».

     Para que sepas qué era, porque no es inofensivo: en el navegador solo sale
     en la consola, pero **en el teléfono eso hace que la pantalla falle**. Un
     contenedor no sabe pintar texto; solo el componente de texto sabe.

     Había **49 sitios** con la misma forma, y ninguno se veía leyendo. Es un
     caso que solo aparece cuando un dato viene **vacío**: «si hay subtítulo,
     píntalo» se escribía de una manera que, con el subtítulo vacío, pintaba
     justamente ese vacío. Por eso salía a veces y a veces no.

     Los 49 arreglados, y ahora hay una comprobación que no deja entrar uno
     nuevo: antes de cada tanda de pruebas se cuentan, y si aparece alguno no
     arranca.

     Comprobado donde más probable era que lo vieras —las visitas, las zonas
     comunes y «Mi alojamiento»—: la consola queda limpia.

150. 🚫 **RETIRADO el 05/10/2026: retirar mensajes del chat.** Me dijiste «yo no
     te pedí que se pueda retirar mensajes, elimina esa función», y al
     preguntarme de dónde la había sacado la busqué: **de ninguna parte.**
     «Moderación» no aparece en el KT, ni en los hallazgos del prototipo, ni en
     ningún documento del proyecto. Tampoco «canales» ni «silenciar».

     Salió de la lista que armé yo después de tu reunión del 02/10. Así que
     mientras no aparezca de dónde, hay que tratarla como mía. Fuera.

     **Esto resuelve también el punto 137** (si un mensaje retirado dejaba
     lápida): ya no se retira nada.

151. ✅ **RESUELTO, y cambia el 136: la administración vuelve a no ver el canal
     de propietarios.** Te dije que lo veía «para poder moderar». Sin
     moderación esa razón desaparece, así que lo dejo como estaba antes: quien
     administra ve los canales en los que **está**, por su rol, como
     cualquiera.

     Lo que sí sigue pudiendo: **configurarlos** —crear, renombrar, archivar—.
     Leer un canal y configurarlo son dos cosas distintas y conviene que sigan
     siéndolo.

152. ✅ **CONTESTADO el 05/10/2026: «lo del chat pues va todo».** Los cuatro
     que quedaban se quedan. Lo único que se retiró fue lo de moderar, que era
     mío (punto 150). La pregunta era esta:

     ¿cuáles de los seis puntos del chat eran tuyos? Ninguno de los seis está escrito en ningún sitio.
     Eran:

     1. canales creados al dar de alta el edificio, con nombre y roles,
        editables;
     2. que el residente entre automáticamente al crearse;
     3. silenciar un canal;
     4. ~~moderación del administrador~~ (retirada, era mía);
     5. WhatsApp configurable por residente y por tipo de aviso.

     Los cuatro que quedan están hechos y funcionando.

153. ✅ **RESUELTO el 05/10/2026: quien tiene dos viviendas vota dos veces.**
     Como dijiste. Guillermo es propietario de la 101 y de la 205: ahora la
     pantalla le dice «Votas por la 101, y después la 205», y cuando acaba,
     «Ya votaste por todas tus viviendas».

     Y arreglé un defecto que salió de ahí y que no habías visto: **«No
     votaron» contaba mal.** Sacaba una vivienda de la lista cuando *su
     propietario* había votado, aunque fuera por la otra. O sea que Guillermo
     votaba una vez y sus dos viviendas desaparecían de los pendientes: el
     porcentaje de participación salía inflado.

     Y uno de seguridad, que el cambio empeoraba: la vivienda por la que se
     vota la mandaba la aplicación y **nadie comprobaba que fuera tuya**.
     Mientras el límite era por persona no importaba —el segundo voto se
     rechazaba igual—; con el límite por vivienda, un vecino podía mandar el
     número de otra y gastarle el voto. Cerrado.

     Lo comprobé votando con Guillermo en el navegador: votó por la 101, la
     pantalla pasó a ofrecerle la 205, y el recuento subió de 2 a 4. Los dos
     votos los retiré después.

154. ✅ **RESUELTO el 05/10/2026: el teléfono con su país, en todas las
     pantallas.** Era lo que quedaba de la tanda 3. El selector de país se hizo
     el 3 de octubre y **se había puesto en una sola pantalla**; las otras
     seguían con una caja de texto donde cada quien escribía lo que quería, y
     el ejemplo que sugería decía «+593 999999999» —que es Ecuador, copiado del
     prototipo—.

     Ya está en las seis que faltaban: el teléfono del edificio, el de una
     portería, el de un coadministrador, el de quien abre una PQRS, el de un
     menor, y el del perfil que ya lo tenía.

     Y debajo había algo peor: **nueve columnas de país que existían y nadie
     llenaba.** El número se guardaba con el prefijo metido dentro —«+57 601
     7561234»— y eso es justo lo que no se puede volver a separar. Importa
     porque para mandar un WhatsApp hace falta el número con su prefijo: un
     «3001234567» sin país no se puede marcar desde fuera.

     De paso separé los diez números que ya estaban guardados así. Uno no:
     `591646461949`, que podría ser Bolivia o un número local que empieza por
     591, y adivinar sobre un dato tuyo es peor que dejarlo.

155. ✅ **RESUELTO el 05/10/2026: las tres cosas del 155.** Las tres están
     abajo con detalle (159, 160) y la del país en el 157.

156. ✅ **RESUELTO el 05/10/2026: las dos columnas duplicadas, borradas.**
     Me dijiste «las columnas duplicadas hay que borrarlas» y están fuera.

     Y una corrección de lo que te dije la vez pasada: te escribí que no era
     una columna que yo creara. **Sí lo era** —la puse yo el 3 de octubre, sin
     fijarme en que ya existía con otro nombre—, así que esto no era quitarte
     nada tuyo, era recoger lo mío. Antes de borrarlas las conté: cero filas
     con dato de 11 y de 17.

157. ✅ **RESUELTO el 05/10/2026: el país se elige de una lista, con buscador.**
     Me preguntaste si lista nuestra o una API pública. **Nuestra**, y te
     explico por qué: son 28 países que cambian una vez por década, la lista ya
     existía en el proyecto para los teléfonos, y pedirla por internet añade
     una espera, una dependencia de alguien, y deja el campo inservible si se
     cae su servidor o no hay conexión. Por decoración no vale la pena.

     Qué cambia para quien lo usa: en «Arquitectura → Condominio», «País» ya no
     es una caja de texto. Se pulsa, se abre la lista con su buscador —por
     nombre o por código— y se elige. El mismo panel que ya tenía el teléfono,
     así que hay **uno solo** y no dos que se separen con el tiempo.

     **Las banderas, dibujadas.** La primera versión las sacaba del propio
     código del país, sin descargar nada, y en Windows no se veían: ese sistema
     no trae la fuente y Chrome pintaba las dos letras. Me dijiste que las
     quieres con imagen y ya están: se ven igual en el ordenador, en el iPhone
     y en Android.

     Van **dentro de la aplicación**, no pedidas a internet —por lo mismo que
     la lista: una lista de países que no funciona sin conexión es peor que una
     sin banderas—. Pesan 13 KB las veintiocho juntas, que es nada: elegí un
     juego con el escudo simplificado, porque el detallado pesa medio mega y a
     veinte píxeles de ancho un escudo detallado es una mancha igual.

     Y el defecto de verdad que esto cierra, que es el que importa: lo que se
     guardaba eran **las dos primeras letras de lo que escribieras**. «Estados
     Unidos» se guardaba como `ES`, que es España. Y de ese dato salen el
     documento que se pide en la puerta, si pone RUC o NIT, y el formato de los
     reportes al ministerio. Comprobado desde la pantalla: elegí Uruguay, guardé
     y en la base quedó `UY` —no `UR`—; después lo devolví a Colombia.

158. ⚠️ **Para tu información: doce reglas que estaban a medias y ya no.**
     No lo pediste y no cambia nada de lo que ves; lo cuento porque es el tipo
     de cosa que explota en el peor momento.

     Una regla se puede crear «sin mirar las filas viejas», que es útil para no
     bloquear un cambio. El problema es que después **sí** se aplica a esa fila
     en cuanto alguien la edita, aunque esté editando otra cosa. Eso es lo que
     dejó el perfil de Sofía imposible de modificar hace unos días: no se le
     podía cambiar ni el nombre, y el error hablaba de una columna que nadie
     había tocado.

     Había doce así. Las repasé una a una, estaban todas limpias, y quedaron
     terminadas. Ahora un dato malo se rechaza cuando se escribe, que es donde
     se entiende, en vez de esperar escondido.

     Y para que no vuelvan: hay una comprobación automática que las cuenta
     antes de cada tanda de pruebas. Si alguien deja una a medias, no pasa.

159. ✅ **RESUELTO: el modal de «agregar residente» estaba muerto, y lo quité.**
     Y aquí te debo una corrección de lo que te dije la vez pasada.

     Te escribí que rellenabas cinco datos, pulsabas y te mandaba a Invitar
     perdiéndolos. Eso es lo que hacía **el código**. Al ir a abrirlo en
     pantalla para arreglarlo resultó que **no se puede abrir**: no hay ningún
     botón en toda la aplicación que lo abra. Llevaba ahí sin que nadie pudiera
     llegar. O sea que te describí algo leyendo, no usándolo, y eso es
     justamente lo que no debo hacer.

     Lo quité entero. Las altas de la vivienda ya funcionan por dos sitios que
     sí existen: «Invitar a alguien a la vivienda» —invita a quien va a tener
     cuenta y registra a un menor, que no la tiene— y el «+», que lleva a
     Gestión de usuarios.

160. ✅ **RESUELTO: el celular del coadministrador ya no se tira. Y el nombre
     tampoco.** Ahora el teléfono viaja con la invitación y se guarda solo
     cuando la persona acepta.

     Al tocarlo apareció uno que no habíamos visto y es peor: **el nombre se
     perdía igual**. Escribías «Rosa Delgado», Rosa aceptaba, y en la lista de
     coadministradores aparecía «Sin nombre». Nadie lo había sufrido todavía
     —lo comprobé contando: ninguna fila tuya está así— pero la puerta estaba
     abierta. Arreglado en el mismo sitio.

     **Lo que sigue sin guardarse son los permisos que marcas al invitar.** Se
     ponen después, editando a la persona cuando ya aceptó. Dímelo y lo hago
     igual que el teléfono; no lo hice por mi cuenta.

161. ⚠️ **Para tu información, y esto salió usando la pantalla: el teléfono se
     guardaba sin país en las seis pantallas.** Incluidas las que arreglé hace
     un rato.

     El campo enseña «🇨🇴 +57» cuando no le dicen ningún país —un botón en
     blanco no se entendería— pero lo que llegaba a la base era vacío. O sea
     que la pantalla decía Colombia y el número se guardaba sin país, que es
     exactamente lo que ese campo existe para evitar: un «3001234567» sin país
     no se puede marcar desde fuera ni mandar por WhatsApp.

     No lo vio ninguna prueba, porque todas le pasaban el país a propósito. Lo
     vi invitando a Rosa desde el navegador y mirando después qué había quedado
     guardado. Arreglado en las seis, y ahora hay una comprobación automática
     que no deja entrar una séptima.

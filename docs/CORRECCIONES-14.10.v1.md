# Correcciones 14.10.v1

## Contexto

El 14/10/2026 la responsable de producto (M) recorrió la app y dejó una lista de
observaciones (renta corta, portería, menores, notificaciones). Además hay que
terminar Tus Datos, que ya consulta de verdad contra su ambiente de pruebas pero
la app no usa (el cierre del preregistro sigue anotando una verificación
«simulada»). El cliente pidió un plan para todo, llamado **correcciones
14.10.v1**, y al terminar un **resumen cortito** de lo hecho.

Decisiones ya tomadas por el cliente:
- Tus Datos: plan de 7 pasos aprobado. Con hallazgo, el huésped **requiere
  aprobación manual del anfitrión** (no se bloquea solo). Solo el nivel «alto»
  marca; si cae una fuente importante no se aprueba (lo que recomendé).
- Intercomunicador: **llamada real por internet dentro de la app**, lo más simple
  posible, de preferencia en su servidor de Contabo.
- QR: **QR en la app + compartir como imagen**. Wallet queda para cuando haya
  cuentas de Apple y Google.
- Menor en portería: **sin foto** (el guardia tiene el documento en la mano).

Reglas que rigen todo: migraciones solo aditivas (`alter type add value` en
archivo aparte); reglas de negocio se buscan en el KT; decisiones visuales en
`docs/REVISAR-A-OJO.md` desde el punto **197**; TRA/SIRE simulados; guardar por
ruta (hay otra sesión en la carpeta), merge a `main` sin checkout; cada regla
nueva con su prueba **mutada**; nada se da por hecho sin recorrerlo en el
navegador con el rol que lo usa. Al empezar, copiar este plan a
`veci-yo/docs/CORRECCIONES-14.10.v1.md` y marcar el avance ahí.

---

## Bloque 1 — Tus Datos conectado al preregistro

1. **Hacerme cargo del trabajo de la otra sesión**: revisar y guardar por ruta
   `_compartido/tusdatos.ts`, `verificar-antecedentes/index.ts`, la migración
   `20261013260000_la_verificacion_se_resuelve_despues.sql`, sus pruebas.
   (Coordinar: si esa sesión sigue viva, no pisarla.)
2. **Fecha de expedición del documento**: columna
   `invitado.documento_fecha_expedicion date`; parámetro opcional en
   `guardar_precheckin`, `guardar_acompanante`, `guardar_mi_ficha_acompanante`;
   campo en la web (`ConfirmData.tsx`, `CompanionAccess.tsx`, `Companions.tsx`),
   obligatorio para cédula de extranjería y PPT. La función lee la fecha de la
   base, no del cuerpo de la petición.
3. **Permiso del huésped**: documento legal de plataforma «Autorización de
   consulta en listas públicas» (sin la palabra «verificación», KT); se acepta
   con los términos. Texto provisional → REVISAR-A-OJO para el abogado.
4. **Cierre del preregistro**: `cerrar_precheckin` deja de anotar `simulado` y
   **encola** una consulta por cada adulto (fila `pendiente` + `net.http_post` a
   `verificar-antecedentes` con clave de servicio). Arreglar la regresión: el
   error vuelve a anotarse en `visita.precheckin_aviso` en vez de tragarse.
   Cron `verificaciones-pendientes` cada 5 min recoge las pendientes (sin volver
   a pagar). Los botones «Aprobar / Aprobar con hallazgos» dejan de escribir
   `simulado`.
5. **Lo que ve el anfitrión** (`ReservaPropietarioDetail.tsx`,
   `estadoDelPaso.ts`, mapeo en `visitas.repo.ts`): estados *aprobada*,
   *en curso*, *requiere aprobación manual*, *no se pudo consultar*. Requiere
   aprobación manual cuando hay **hallazgo alto** o **declaración de
   discapacidad** (`declarar_incapacidad_acompanante`). Ahí sale:
   - el **reporte de Tus Datos en PDF** (endpoint del reporte por `reporteId`;
     confirmar en su documentación), guardado en storage con **marca de agua
     «Confidencial — no compartir con el huésped»** (estampada en servidor,
     reutilizando la idea de `subir-documento-porteria`; para PDF, `pdf-lib`),
     para subirlo a Airbnb como justificación;
   - botones **Aprobar bajo mi responsabilidad** / **Rechazar**, que quedan
     anotados con quién y cuándo (RPC nueva `resolver_revision_manual`).
   El huésped y la portería no ven nada (KT).
6. **Pruebas**: recorrido con las cédulas de ejemplo (111 hallazgo → manual;
   112 limpia → aprobada; 113 fuentes caídas → no se pudo; 128 prohíbe → no se
   pudo); CE sin fecha no gasta cupo; mutar la condición de «manual».
7. **Pasar a real**: queda fuera hasta que haya cuenta con plan (credenciales,
   aviso automático, quién paga).

## Bloque 2 — La estancia del huésped de punta a punta (anfitrión y web)

1. **Línea de tiempo completa** en la ficha de la estancia: origen (**Airbnb**
   / **manual**, de `visita.origen`, hoy no se lee) → preregistro → verificación
   → **entrada en portería** → uso de la app → **salida**. «Todo termina en la
   salida»: al salir el último, la estancia se ve **completa**.
2. **Faltan menos de 3 días**: en Inicio del anfitrión, alerta con las estancias
   que llegan en <3 días con preregistro incompleto, y botón **Enviar
   recordatorio** (RPC nueva que reutiliza `enviar_recordatorios_precheckin` /
   plantilla `recordatorio-huesped` para una sola estancia, anotada en
   `recordatorio_precheckin`). En la web, la página del enlace muestra
   «Faltan N días para tu reserva».
3. **Reserva terminada o cancelada**: la web dice «Esta reservación ya terminó»
   / «fue cancelada» (hoy una cancelada con enlace vigente sigue abierta:
   `consultar_precheckin` y `abrir_precheckin_por_reserva` miran `estado`).
4. **El anfitrión edita la estancia**: cambiar fechas (extender/acortar,
   respetando `visita_sin_estancias_solapadas`), **agregar y quitar personas**
   (antes de que entren) y **agregar vehículos**. Panel «Qué puedes hacer» que
   lo enumera y dice por qué algo no se puede.
5. **Corta / larga estancia**: al cambiar fechas o al salir antes, los
   privilegios se recalculan solos (`reglas_de_estancia` ya cuenta por noches;
   verificar con prueba). Zonas: un huésped de **larga** estancia accede a las
   zonas con `permite_estancia_larga` (hoy siempre se le trata como corta). Ej.
   «gimnasio solo para estadía prolongada» y la pantalla lo explica.
6. **QR del huésped con cuenta**: se genera `visita.codigo_acceso` al cerrar el
   preregistro; el huésped lo ve en «Mi alojamiento» (`react-native-qrcode-svg`,
   ya instalado) y lo **comparte como imagen** (captura + `expo-sharing`; en web,
   `navigator.share` o descarga). Wallet: anotado para después.

## Bloque 3 — Portería

1. **Pestaña del medio «Vivienda» para el guardia**: zonas comunes (ver y
   gestionar reservas — `ZonaDetallesScreen` ya lo soporta, falta la entrada),
   **estacionamientos de visita** (asignar/liberar, ya existe el modal), chat e
   intercomunicador.
2. **Registrar visita desde Inicio con búsqueda**: por nombre, por
   departamento, o **escaneando el QR** (solo huéspedes temporales; cámara con
   `expo-camera` y lector de QR en web). El QR abre la estancia lista para
   marcar entrada.
3. **Vehículos y estacionamientos**: el guardia edita placas y asigna puesto
   según los parámetros del edificio para huéspedes (`reglas_de_estancia` →
   `*_permite_cocheras`); si el departamento tiene estacionamiento propio,
   puede editar las placas.
4. **Visitantes en general**: el guardia registra y edita; campo
   «Comentarios / registros adicionales» al registrar (existe
   `anotaciones_ingreso`); arreglar el botón de foto del formulario nuevo, que
   hoy no sube nada.
5. **Menor en el registro físico** (sin foto): pantalla con el texto de
   protección de M y tres botones:
   - **Sí se parece** → entra.
   - **No se parece, pero el menor parece estar seguro** → entra y se avisa al
     anfitrión para que **apruebe manualmente y se haga responsable**.
   - **No se parece, avisar al anfitrión** → no entra hasta que el anfitrión lo
     revise.
   Lo elegido queda anotado (`verificacion_documento`, columna nueva de
   resultado del menor) y el aviso al anfitrión es una notificación nueva.
   Botones **Llamar al anfitrión** (ya existe el número) y **Llamar a la
   policía (123)**.
6. **S.O.S. que llega al guardia**: alerta en vivo (Supabase Realtime + sonido)
   con pantalla propia; la única acción es **Desactivar y reportar incidencia**
   (qué pasó, qué vio) → crea una PQRS de seguridad enlazada a la alarma
   (columna nueva `reclamo.alarma_sos_id`) y cierra la alarma como «atendida».
7. **Salidas**: marcar salida por persona con comentario; **salida parcial**
   (sale uno, quedan otros) avisa al anfitrión.

## Bloque 4 — Notificaciones del anfitrión parametrizables

- Motivos nuevos (archivo aparte): `huesped_salida_parcial`, `huesped_salida`,
  `verificacion_requiere_revision`, `menor_por_revisar`,
  `preregistro_incompleto`. Ingreso ya existe (`visita_ingreso`).
- Cada uno se enciende o apaga en Perfil → Avisos (`preferencia_aviso`, ya
  existe). Los avisos salen en la campana y en una tarjeta del Inicio del
  anfitrión (hoy ese cuadro es texto fijo).

## Bloque 5 — Intercomunicador: llamada por internet

- **LiveKit** (código abierto, se instala en un servidor propio con Docker; tiene
  librerías para web y React Native). Instalado en el **Contabo**, con un
  subdominio y certificado. Si no hay acceso al Contabo, alternativa: LiveKit
  Cloud (tiene plan gratuito).
- Función de servidor `token-llamada` (Supabase) que da el permiso para entrar a
  la sala solo a quien corresponde (vivienda ↔ portería del mismo edificio).
- **La vivienda llama a portería** y portería ve una **llamada entrante**
  (Realtime: suena y muestra «Vivienda 102 te llama», contestar/rechazar); y al
  revés. Se anota en la tabla `llamada` (`entrante` / `perdida`, ya existen).
- Límite: con la app cerrada no suena (no hay avisos push todavía); en el
  teléfono necesita la app compilada, no Expo Go. Se anota.
- **Necesito de ti**: acceso al Contabo (o que lo instales tú con mis pasos) y
  un subdominio.

---

## Orden

1 → 2 → 3 → 4 → 5. El 5 puede ir en paralelo cuando tenga el acceso al
servidor.

## Verificación (al cerrar cada bloque y al final)

- `npm run typecheck`, `npm test`, `npm run test:componentes`, pruebas de base
  de los archivos tocados (y la suite completa al final), `npm run objetos`,
  `npm run tipos`. Pruebas de la web (`veciyo-web`).
- Recorrido en el navegador con las cuentas de prueba: Sofía
  (`vecino@`, anfitriona 102), Juan (`guardia@`), un huésped en incógnito por el
  enlace. Recorrido completo: estancia creada → recordatorio → preregistro con
  fecha de expedición y autorización → verificación 111 (manual, PDF con marca)
  → aprobación del anfitrión → QR del huésped → Juan lo escanea, menor con los
  tres botones, salida parcial → aviso en el Inicio de Sofía → salida final y
  estancia completa. S.O.S. de prueba **no se pulsa** (regla del cliente): se
  prueba con prueba automática y lo recorre el cliente.
- Desplegar app y web (`vercel deploy --prod`), funciones de Supabase.
- Al terminar: **resumen cortito de la fase v1** al cliente.

## Pendientes del cliente (no bloquean empezar)

- Texto legal de la autorización (abogado).
- Acceso al Contabo y subdominio (bloque 5).
- Cuentas de Apple/Google para Wallet (después de v1).

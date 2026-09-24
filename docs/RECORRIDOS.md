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
- [ ] Acepta la invitación y queda con membresía vigente
- [ ] Ve el libro del huésped (wifi, puerta) mientras la estancia dura
- [ ] **No** lo ve cuando la estancia venció (control negativo: Ramiro)
- [ ] Reserva una zona de estancia corta **y apunta acompañantes**
- [ ] No reserva una zona que no admite estancia corta
- [ ] No reserva fuera de su estancia
- [ ] Cancela su propia reserva, no la del propietario

### Anfitrión (propietario / inquilino líder)
- [ ] Configura el alojamiento de renta corta y lo vuelve a leer igual
- [ ] Invita a un huésped y la invitación llega a la base
- [ ] Acepta los T&C por excepción y queda registrado quién
- [ ] Pide la verificación de antecedentes y descuenta del saldo
- [ ] Compra un paquete cuando se acaban
- [ ] Reporta el TRA de entrada y el de salida
- [ ] Ve y gestiona a los residentes de su vivienda

### Guardia
- [ ] Ve las visitas del condominio, no las de una unidad suelta
- [ ] Registra la entrada de un invitado y la visita pasa a `ingresada`
- [ ] Registra la salida y la visita pasa a `finalizada`
- [ ] Tiene a quién llamar: el contacto sale de la vivienda
- [ ] Anuncia la visita y queda con actor y hora
- [ ] Verifica el documento de un invitado
- [ ] Asigna un estacionamiento de visita
- [ ] Adjunta una foto de ingreso **y acaba en el bucket**, no como `blob:`

### Administración
- [ ] Da de alta torre, unidad, portería y estacionamiento
- [ ] Aprueba y rechaza una reserva de zona
- [ ] Publica un anuncio con votación y cuenta los votos
- [ ] Genera un reporte y lo vuelve a leer
- [ ] Gestiona guardias y turnos
- [ ] Ve las cuotas y marca un pago

### Transversales
- [ ] Correspondencia: alta, cambio de estado y entrega
- [ ] PQRS: alta, adjunto y cambio de estado
- [ ] Chat por áreas y registro de llamada
- [ ] Notificaciones: se crean y se marcan leídas

## Lo que una prueba de recorrido no puede juzgar

El criterio visual. Va a `docs/REVISAR-A-OJO.md`, que se acumula para una sola
revisión con el cliente en vez de interrumpirle por cada cosa.

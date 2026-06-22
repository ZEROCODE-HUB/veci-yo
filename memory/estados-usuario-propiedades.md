---
name: estados-usuario-propiedades
description: Cómo el prototipo VeciYo distingue usuario con/sin propiedades e incógnito
metadata:
  type: project
---

En el prototipo (sin backend), "propiedad" del usuario ≡ una entrada en `ubicaciones`
(la lista del selector de la barra superior / "Administrar mis ubicaciones").

`AppContext` deriva tres estados que la UI trata distinto:
- `esIncognito` = `modo === 'incognito'` → navega con datos de ejemplo (dummy).
- `tienePropiedades` = `ubicaciones.length > 0`.
- `sinPropiedades` = `!esIncognito && ubicaciones.length === 0` → funciones bloqueadas.

Seeding por flujo de ingreso (en AppContext):
- login (Guillermo) y demos → con propiedades (initialUbicaciones).
- registro nuevo → `ubicaciones = []` (sin propiedades; las va agregando).
- incógnito → propiedades de ejemplo.
- demo `propietario-sin-propiedades` (en demoRoles.js) → rol propietario con `ubicaciones = []`.

**Why:** decisión de producto del usuario para mapear los 3 estados sin backend.
**How to apply:** para diferenciar comportamiento por estado, leer estos flags de `useApp()`;
no inventar un nuevo concepto de propiedad. Ver [[sistema-ayuda-y-tabs]].

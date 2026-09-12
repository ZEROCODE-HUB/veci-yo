---
name: sistema-ayuda-y-tabs
description: Componentes reutilizables de ayuda contextual y tabs estandarizados en VeciYo
metadata:
  type: project
---

Patrones únicos reutilizables creados para toda la app:

- `components/ui/InfoButton.jsx` — ÚNICO sistema de ayuda contextual. Icono de
  información (lucide `Info`) que abre un Modal consistente. Toda explicación
  debe abrirse desde este icono (no tooltips/popups sueltos). Variantes 'info'
  y 'bloqueado'. Props de contenido: descripcion, bullets, ejemplo, motivo,
  accion, accionLabel+onAccion.
- `config/helpContent.js` — textos de ayuda centralizados por módulo (`HELP`),
  cada uno con `info` y `bloqueo`.
- `components/ui/ModuloEstado.jsx` — `IncognitoBanner`, `ModuloBloqueado`,
  `ModuloHeaderInfo` (icono en PageHeader.action) y `ModuloGate` (envuelve el
  contenido del módulo: bloquea si sinPropiedades, banner si incógnito).
- `components/ui/Tabs.jsx` — tabs/filtros estandarizados móvil: una sola fila,
  scroll horizontal, sin wrap, altura uniforme, auto-scroll al activo, acorta
  labels largos. `StatusTabs` delega aquí (variant 'status'); selectores de
  categoría usan variant 'chip'.

**Why:** requerimiento de estandarizar ayuda contextual y filtros tipo tabs.
**How to apply:** para un módulo nuevo, añadir entrada en `HELP`, envolver el
contenido con `<ModuloGate helpKey="...">` y poner `<ModuloHeaderInfo helpKey=...
action={...}/>` en el PageHeader. Ver [[estados-usuario-propiedades]].

# Referencias de diseño

Imágenes de referencia (exports de Figma) usadas para construir el prototipo React.
**No son assets de producción** — la mayoría no se cargan en la app, solo sirven de guía visual.

## Convención

Cada subcarpeta = un rol o feature, con el **mismo nombre** que su carpeta en `src/features/`:

- `home/`, `correspondencia/`, `visitas/`, `zonas/` → ya implementados (referencia histórica de cómo se construyeron)
- `guardia/` → en construcción, referencia para el rol de guardia de seguridad
- `onboarding/` → en construcción, referencia para login/registro
- `shared/` → piezas que no pertenecen a un solo feature (logo, popups genéricos, ilustraciones reutilizables)

Al agregar un nuevo rol o feature, crea su carpeta aquí (`design/<nombre>/`) con ese mismo
nombre que tendrá luego en `src/features/`. Si una pantalla se comparte entre roles, va en
`design/shared/`.

## Assets reales

Los íconos, avatares e imágenes que sí se importan en el código van en `src/assets/`
(organizados por feature: `icons/home`, `icons/visitas`, `icons/zonas`, `avatars`, etc.),
no aquí.

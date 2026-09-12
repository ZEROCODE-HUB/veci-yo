import logoUrl from '../../assets/branding/logo-veciyo.png';

// Logo oficial de la plataforma. Punto único de referencia: cualquier
// sección (actual o futura) que necesite mostrar la marca debe usar este
// componente en vez de repetir el emoji o la ruta del archivo.
export default function Logo({ size = 36, style = {} }) {
  return (
    <img
      src={logoUrl}
      alt="Veciyo"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

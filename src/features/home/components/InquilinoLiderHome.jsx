import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import InfoButton from '../../../components/ui/InfoButton';
import Modal from '../../../components/ui/Modal';
import { HELP } from '../../../config/helpContent';
import { inquilinoLiderReputacion, agendaHoyInquilinoLider, ingresosSalidasHoy, ingresosSalidasManana } from '../../../data/mockData';
import iconReputacion from '../../../assets/icons/inquilino-lider/reputacion.png';
import imagenBeach from '../../../assets/imagenes/beach.png';
import iconRegalos from '../../../assets/icons/inquilino-lider/regalos.png';
import iconReciclador from '../../../assets/icons/inquilino-lider/medalla-reciclador.png';
import iconAtento from '../../../assets/icons/inquilino-lider/medalla-atento.png';
import iconLogro3 from '../../../assets/icons/inquilino-lider/medalla-logro3.png';
import iconLogro4 from '../../../assets/icons/inquilino-lider/medalla-logro4.png';
import iconLogro5 from '../../../assets/icons/inquilino-lider/medalla-logro5.png';

const LOGRO_ICONS = {
  reciclador: { src: iconReciclador, scale: 1 },
  atento: { src: iconAtento, scale: 1 },
  logro3: { src: iconLogro3, scale: 1 },
  logro4: { src: iconLogro4, scale: 1 },
  logro5: { src: iconLogro5, scale: 1 },
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const filaStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '14px 0',
  background: 'none',
  fontFamily: theme.fonts.family,
};

// Pantalla 1 del Inquilino Líder: Reputación, Gratitud y agenda de "Hoy".
// Reemplaza el resumen de Vivienda como Home de este rol; "Vivienda" pasa a
// vivir en su propia pantalla (/vivienda, tab "Viviendas").
const HORAS_TURNO = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00'];
const COLOR_FAMILIARES = '#2563EB';
const COLOR_TEMPORAL = '#F59E0B';
const COLOR_SALIDA = '#EAB308';
const COLOR_GRIS = '#9CA3AF';

function getFechaStr(delta) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString('es-AR');
}

export default function InquilinoLiderHome() {
  const navigate = useNavigate();
  const { addToast, rolActivo, visitas, esIncognito } = useApp();
  const { nombre, nivel, logros } = inquilinoLiderReputacion;
  const esGuardia = rolActivo === 'guardia';
  const reputacionHelp = HELP.reputacion?.info;
  const gratitudHelp = HELP.ranking?.info;

  const [planDia, setPlanDia] = useState('Hoy');
  const [modoIngreso, setModoIngreso] = useState(true); // true=ingresos, false=salidas
  const [barraPopup, setBarraPopup] = useState(null);

  const dias = [
    { key: 'Ayer', delta: -1 },
    { key: 'Hoy', delta: 0 },
    { key: 'Mañana', delta: 1 },
  ];
  const diaActual = dias.find(d => d.key === planDia) || dias[1];
  const fechaStr = getFechaStr(diaActual.delta);

  const visitasDelDia = visitas.filter(v => {
    const fecha = v.fechaDesde || '';
    return fecha === fechaStr;
  });

  const familiarPorHora = HORAS_TURNO.map(() => 0);
  const temporalPorHora = HORAS_TURNO.map(() => 0);
  const familiarIngresados = HORAS_TURNO.map(() => 0);
  const temporalIngresados = HORAS_TURNO.map(() => 0);
  const vehiculosPorHora = HORAS_TURNO.map(() => 0);

  visitasDelDia.forEach(v => {
    const rango = (v.horaEstimadaLlegada || '').split('–')[0].trim();
    if (!rango) return;
    const [hStr] = rango.split(':');
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return;
    let idx = h < 6 ? HORAS_TURNO.length - 1 : Math.floor((h - 6) / 2);
    if (idx < 0) idx = 0;
    if (idx >= HORAS_TURNO.length) idx = HORAS_TURNO.length - 1;
    const totalPersonas = v.personas || 1;
    const guests = v.invitados || [];
    const llegaron = guests.filter(g => g.llego).length;
    const tieneVehiculo = (v.vehiculos?.length || 0) > 0 || (v.estacionamientosAsignados || 0) > 0;
    if (v.tipo === 'huesped-temporal') {
      temporalPorHora[idx] += totalPersonas;
      temporalIngresados[idx] += llegaron || (v.horaIngreso ? 1 : 0);
    } else {
      familiarPorHora[idx] += totalPersonas;
      familiarIngresados[idx] += llegaron || (v.horaIngreso ? 1 : 0);
    }
    if (tieneVehiculo) vehiculosPorHora[idx]++;
  });

  // Salidas mode: solo temporales
  const salidasPorHora = HORAS_TURNO.map(() => 0);
  visitasDelDia.filter(v => v.tipo === 'huesped-temporal').forEach(v => {
    const rango = (v.horaEstimadaLlegada || '').split('–')[0].trim();
    if (!rango) return;
    const [hStr] = rango.split(':');
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return;
    let idx = h < 6 ? HORAS_TURNO.length - 1 : Math.floor((h - 6) / 2);
    if (idx < 0) idx = 0;
    if (idx >= HORAS_TURNO.length) idx = HORAS_TURNO.length - 1;
    salidasPorHora[idx] += v.personas || 1;
  });

  // For salidas mode, show only temporary totals
  const mostrarPorHora = modoIngreso
    ? familiarPorHora.map((f, i) => f + temporalPorHora[i])
    : salidasPorHora;
  const maxVisitas = Math.max(1, ...mostrarPorHora);

  // Popup data for a given hour
  function getVisitasDeHora(idx) {
    const hora = HORAS_TURNO[idx];
    return visitasDelDia.filter(v => {
      const rango = (v.horaEstimadaLlegada || '').split('–')[0].trim();
      if (!rango) return false;
      const [hStr] = rango.split(':');
      const h = parseInt(hStr, 10);
      if (isNaN(h)) return false;
      let hidx = h < 6 ? HORAS_TURNO.length - 1 : Math.floor((h - 6) / 2);
      if (hidx < 0) hidx = 0;
      if (hidx >= HORAS_TURNO.length) hidx = HORAS_TURNO.length - 1;
      return hidx === idx;
    });
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Reputación — oculto para guardia */}
      {!esGuardia && <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => navigate('/reputacion')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.fonts.sizes.md,
              fontWeight: theme.fonts.weights.semibold,
              color: theme.colors.text,
              textDecoration: 'underline',
              fontFamily: theme.fonts.family,
            }}
          >
            Reputación
          </button>
          {esIncognito && reputacionHelp && (
            <InfoButton variant="info" titulo={reputacionHelp.titulo} descripcion={reputacionHelp.descripcion} bullets={reputacionHelp.bullets} ejemplo={reputacionHelp.ejemplo} />
          )}
        </div>

        <div style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          background: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: theme.shadows.fab,
          overflow: 'hidden',
        }}>
          <img src={iconReputacion} alt="Reputación" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            {nombre}
          </div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
            {nivel}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
          {logros.map(logro => (
            <div key={logro.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: logro.conseguido ? theme.colors.iconAmberBg : theme.colors.bgMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: logro.conseguido ? 1 : 0.45,
                filter: logro.conseguido ? 'none' : 'grayscale(1)',
                overflow: 'hidden',
              }}>
                <img src={LOGRO_ICONS[logro.key].src} alt={logro.label} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${LOGRO_ICONS[logro.key].scale})` }} />
              </div>
              <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, textAlign: 'center' }}>
                {logro.label}
              </span>
            </div>
          ))}
        </div>
      </div>}

      {/* Gratitud — oculto para guardia */}
      {!esGuardia && <button
        type="button"
        onClick={() => navigate('/cuadro-honor')}
        style={{
          ...cardStyle,
          border: 'none',
          cursor: 'pointer',
          fontFamily: theme.fonts.family,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          minHeight: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
        }}
      >
        <img src={imagenBeach} alt="" style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.40)',
          zIndex: 1,
        }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {esIncognito && gratitudHelp && (
            <InfoButton variant="info" titulo={gratitudHelp.titulo} descripcion={gratitudHelp.descripcion} bullets={gratitudHelp.bullets} ejemplo={gratitudHelp.ejemplo} />
          )}
        </div>
        <span style={{
          fontSize: '28px',
          fontWeight: theme.fonts.weights.bold,
          color: '#FFFFFF',
          position: 'relative',
          zIndex: 2,
          marginBottom: '6px',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          letterSpacing: '1.5px',
        }}>
          Gratitud
        </span>
        <span style={{
          fontSize: theme.fonts.sizes.sm,
          color: 'rgba(255,255,255,0.9)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '260px',
          lineHeight: theme.fonts.lineHeights.snug,
          textShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}>
          Reconoce a tu comunidad con medallas y regalos.
        </span>
      </button>}

      {/* Bloque de tráfico — solo para Guardia de Seguridad */}
      {esGuardia && (<>
        <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header: title + day selector + mode toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
                Tráfico de ingresos y salidas
              </h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                {dias.map(dia => (
                  <button
                    key={dia.key}
                    type="button"
                    onClick={() => setPlanDia(dia.key)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: theme.radius.full,
                      background: planDia === dia.key ? theme.colors.primary : theme.colors.bgMuted,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: theme.fonts.sizes.xs,
                      fontWeight: theme.fonts.weights.semibold,
                      color: planDia === dia.key ? theme.colors.text : theme.colors.textSecondary,
                      fontFamily: theme.fonts.family,
                    }}
                  >
                    {dia.key}
                  </button>
                ))}
              </div>
            </div>
            {/* Toggle Ingresos/Salidas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setModoIngreso(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 16px', borderRadius: theme.radius.full,
                  background: modoIngreso ? theme.colors.secondary : theme.colors.bgMuted,
                  border: 'none', cursor: 'pointer',
                  color: modoIngreso ? '#fff' : theme.colors.textSecondary,
                  fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
                Ingresos
              </button>
              <button
                type="button"
                onClick={() => setModoIngreso(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 16px', borderRadius: theme.radius.full,
                  background: !modoIngreso ? theme.colors.secondary : theme.colors.bgMuted,
                  border: 'none', cursor: 'pointer',
                  color: !modoIngreso ? '#fff' : theme.colors.textSecondary,
                  fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                </svg>
                Salidas
              </button>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 4px' }}>
            {HORAS_TURNO.map((hora, i) => {
              const total = mostrarPorHora[i] || 0;
              const faltaFamiliar = modoIngreso ? (familiarPorHora[i] || 0) - (familiarIngresados[i] || 0) : 0;
              const faltaTemporal = modoIngreso ? (temporalPorHora[i] || 0) - (temporalIngresados[i] || 0) : 0;
              const faltaTotal = faltaFamiliar + faltaTemporal;
              const completado = modoIngreso && total > 0 && faltaTotal === 0;
              const alturaTotal = maxVisitas > 0 ? (total / maxVisitas) * 100 : 0;
              return (
                <div
                  key={hora}
                  onClick={() => setBarraPopup({ hora, idx: i })}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '9px', fontWeight: theme.fonts.weights.bold, color: completado ? COLOR_GRIS : theme.colors.text, lineHeight: 1 }}>
                    {total}
                  </span>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(4, alturaTotal)}%`,
                    borderRadius: '4px 4px 0 0',
                    background: completado ? COLOR_GRIS : (modoIngreso ? COLOR_FAMILIARES : COLOR_SALIDA),
                    opacity: completado ? 0.5 : (modoIngreso ? 0.8 : 0.9),
                    transition: 'height 300ms ease',
                    minHeight: '4px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {modoIngreso && temporalPorHora[i] > 0 && !completado && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%',
                        height: `${((temporalPorHora[i] || 0) / total) * 100}%`,
                        background: COLOR_TEMPORAL, borderRadius: '4px 4px 0 0', opacity: 0.85,
                      }} />
                    )}
                  </div>
                  {/* Vehicle indicator */}
                  {vehiculosPorHora[i] > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '7px', color: theme.colors.textMuted }}>
                      <span>🚗</span>
                      <span>{vehiculosPorHora[i]}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '7px', color: theme.colors.textMuted, writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
                    {hora}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: theme.fonts.sizes['2xs'] }}>
            <div style={{ display: 'flex', gap: '10px', color: theme.colors.textMuted }}>
              {modoIngreso ? (<>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLOR_FAMILIARES, display: 'inline-block' }} /> Familiares y amigos
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLOR_TEMPORAL, display: 'inline-block' }} /> Huéspedes Temporales
                </span>
              </>) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLOR_SALIDA, display: 'inline-block' }} /> Salidas (Temp.)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', color: theme.colors.textMuted }}>
              <span>Menos</span>
              <span>Más</span>
            </div>
          </div>

          {/* Ingresos / Salidas counters */}
          {(() => {
            let totalIngresos = 0;
            let totalSalidas = 0;
            visitasDelDia.forEach(v => {
              const guests = v.invitados || [];
              guests.forEach(g => { if (g.llego) totalIngresos++; });
              if (v.horaIngreso && guests.length === 0) totalIngresos++;
              if (v.horaSalida && v.tipo === 'huesped-temporal') totalSalidas++;
            });
            return (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '8px 16px' }}>
                  <span style={{ fontSize: '16px' }}>🚗</span>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>Ingresos</div>
                    <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.success }}>{totalIngresos}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '8px 16px' }}>
                  <span style={{ fontSize: '16px' }}>🚙</span>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>Salidas</div>
                    <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.warning }}>{totalSalidas}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tabla resumen + botón */}
        <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
              Ingresos y salidas
            </h2>
            <button
              type="button"
              onClick={() => navigate('/visitas', { state: { fromHome: true } })}
              style={{
                padding: '6px 14px',
                borderRadius: theme.radius.full,
                background: theme.colors.primary,
                border: 'none',
                cursor: 'pointer',
                fontSize: theme.fonts.sizes.xs,
                fontWeight: theme.fonts.weights.semibold,
                color: theme.colors.text,
                fontFamily: theme.fonts.family,
              }}
            >
              Ver detalle y registrar
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 70px 44px 50px 50px 60px',
            gap: '4px',
            padding: '7px 8px',
            background: theme.colors.bgMuted,
            borderRadius: theme.radius.sm,
            fontSize: theme.fonts.sizes['2xs'],
            fontWeight: theme.fonts.weights.semibold,
            color: theme.colors.textMuted,
            alignItems: 'center',
          }}>
            <span>Nombre</span>
            <span>Tipo</span>
            <span>Depto</span>
            <span>Ingreso</span>
            <span>Salida</span>
            <span>Estado</span>
          </div>

          {(planDia === 'Hoy' ? ingresosSalidasHoy : planDia === 'Mañana' ? ingresosSalidasManana : ingresosSalidasHoy).map((item, idx) => (
            <div key={item.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 70px 44px 50px 50px 60px',
              gap: '4px',
              padding: '7px 8px',
              borderRadius: theme.radius.sm,
              background: idx % 2 === 0 ? 'transparent' : theme.colors.bgMuted,
              fontSize: theme.fonts.sizes.xs,
              color: theme.colors.text,
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: theme.colors.secondaryLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: theme.fonts.weights.bold,
                  color: theme.colors.secondary, flexShrink: 0,
                }}>
                  {item.nombre.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: theme.fonts.weights.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.nombre}
                </span>
              </div>
              <span style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes['2xs'] }}>
                {item.tipo}
              </span>
              <span style={{ textAlign: 'center' }}>{item.depto}</span>
              <span style={{ textAlign: 'center' }}>{item.horaIngreso}</span>
              <span style={{ textAlign: 'center' }}>{item.horaSalida}</span>
              <span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: theme.radius.full,
                  fontSize: theme.fonts.sizes['2xs'],
                  fontWeight: theme.fonts.weights.semibold,
                  whiteSpace: 'nowrap',
                  background: item.estado === 'Ingresó' ? theme.colors.successLight
                    : item.estado === 'Finalizado' ? theme.colors.bgMuted
                    : item.estado === 'Cancelado' ? theme.colors.dangerLight
                    : theme.colors.secondaryLight,
                  color: item.estado === 'Ingresó' ? theme.colors.success
                    : item.estado === 'Finalizado' ? theme.colors.textMuted
                    : item.estado === 'Cancelado' ? theme.colors.danger
                    : theme.colors.secondary,
                }}>
                  {item.estado}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Popup detalle por hora */}
        <Modal isOpen={!!barraPopup} onClose={() => setBarraPopup(null)} title={`Visitas - ${barraPopup?.hora || ''}`}>
          {barraPopup && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {getVisitasDeHora(barraPopup.idx).length === 0 && (
                <div style={{ textAlign: 'center', color: theme.colors.textMuted, padding: '16px 0', fontSize: theme.fonts.sizes.sm }}>
                  No hay visitas registradas para esta hora.
                </div>
              )}
              {getVisitasDeHora(barraPopup.idx).map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: theme.radius.lg,
                  background: theme.colors.bgMuted,
                  border: `1px solid ${theme.colors.border}`,
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: theme.colors.secondaryLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: theme.fonts.weights.bold,
                    color: theme.colors.secondary, flexShrink: 0,
                  }}>
                    {v.nombre?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                      {v.nombre}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      {v.torre} - {v.depto} · {v.tipo === 'huesped-temporal' ? 'Huésped Temporal' : 'Familiares y amigos'}
                      {v.vehiculos?.length > 0 && ` · 🚗 ${v.vehiculos.length}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </>)}

      {esGuardia && (
        <button
          onClick={() => navigate('/administracion-ubicacion')}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: theme.colors.primary,
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: theme.fonts.weights.semibold,
            fontFamily: theme.fonts.family,
            zIndex: 100,
          }}
          title="Marcar mi ubicación"
        >
          📍
        </button>
      )}

      {/* Hoy — oculto para guardia */}
      {!esGuardia && <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '4px' }}>
          Hoy
        </h2>

        <button
          type="button"
          onClick={undefined}
          style={{
            ...filaStyle,
            borderWidth: '0 0 1px 0',
            borderStyle: 'solid',
            borderColor: theme.colors.borderLight,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Regalos por dar 1</span>
          <span style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: theme.colors.dangerLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            <img src={iconRegalos} alt="Regalos por dar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </span>
        </button>

        {agendaHoyInquilinoLider.map((item, i) => (
          <div
            key={item.id}
            style={{
              ...filaStyle,
              borderWidth: i === agendaHoyInquilinoLider.length - 1 ? 0 : '0 0 1px 0',
              borderStyle: 'solid',
              borderColor: theme.colors.borderLight,
            }}
          >
            <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{item.titulo}</span>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.hora}</span>
          </div>
        ))}
      </div>}

      <div style={{ height: '24px' }} />
    </div>
  );
}

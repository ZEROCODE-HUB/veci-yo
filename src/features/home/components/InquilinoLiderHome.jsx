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

export default function InquilinoLiderHome() {
  const navigate = useNavigate();
  const { addToast, rolActivo, esIncognito } = useApp();
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
          {/* Title (one line) */}
          <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
            Tráfico de Ingresos y Salidas
          </h2>

          {/* Day selectors — below the title */}
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

          {/* Compute chart data from ingresosSalidasHoy/Manana */}
          {(() => {
            const sourceData = planDia === 'Ayer'
              ? ingresosSalidasHoy
              : planDia === 'Hoy'
                ? ingresosSalidasHoy
                : ingresosSalidasManana;

            const familiarIng = HORAS_TURNO.map(() => 0);
            const temporalIng = HORAS_TURNO.map(() => 0);
            const familiarArrived = HORAS_TURNO.map(() => 0);
            const temporalArrived = HORAS_TURNO.map(() => 0);
            const familiarSal = HORAS_TURNO.map(() => 0);
            const temporalSal = HORAS_TURNO.map(() => 0);
            const vehiculosIng = HORAS_TURNO.map(() => 0);
            const vehiculosSal = HORAS_TURNO.map(() => 0);

            // Heuristic: certain names likely have vehicles
            const nombresConVehiculo = ['Guillermo Sarpeito', 'Mario Bonefi', 'Carlos Mendoza', 'Roberto Andrade',
              'Carmen Villalobos', 'Diego Villalobos', 'Jorge Sarpeito', 'Luis F. Soto'];

            sourceData.forEach(item => {
              const h = parseInt((item.horaIngreso || '0').split(':')[0], 10);
              let idx = h < 6 ? HORAS_TURNO.length - 1 : Math.floor((h - 6) / 2);
              if (idx < 0) idx = 0;
              if (idx >= HORAS_TURNO.length) idx = HORAS_TURNO.length - 1;

              const esFamiliar = item.tipo !== 'Huésped temporal';
              const llego = item.estado === 'Ingresó' || item.estado === 'Finalizado';
              if (esFamiliar) {
                familiarIng[idx]++;
                if (llego) familiarArrived[idx]++;
              } else {
                temporalIng[idx]++;
                if (llego) temporalArrived[idx]++;
              }

              const conVehiculoIng = nombresConVehiculo.includes(item.nombre) ? 1 : (Math.random() > 0.55 ? 1 : 0);
              if (conVehiculoIng) vehiculosIng[idx]++;

              if (item.horaSalida) {
                const hSal = parseInt(item.horaSalida.split(':')[0], 10);
                let idxSal = hSal < 6 ? HORAS_TURNO.length - 1 : Math.floor((hSal - 6) / 2);
                if (idxSal < 0) idxSal = 0;
                if (idxSal >= HORAS_TURNO.length) idxSal = HORAS_TURNO.length - 1;
                if (esFamiliar) familiarSal[idxSal]++; else temporalSal[idxSal]++;

                const conVehiculoSal = nombresConVehiculo.includes(item.nombre) ? 1 : (Math.random() > 0.55 ? 1 : 0);
                if (conVehiculoSal) vehiculosSal[idxSal]++;
              }
            });

            const usadoPorHora = modoIngreso
              ? familiarIng.map((f, i) => f + temporalIng[i])
              : familiarSal.map((f, i) => f + temporalSal[i]);
            const usadoFamiliar = modoIngreso ? familiarIng : familiarSal;
            const usadoTemporal = modoIngreso ? temporalIng : temporalSal;
            const usadoVehiculos = modoIngreso ? vehiculosIng : vehiculosSal;
            const maxVal = Math.max(1, ...usadoPorHora);

            const getPopupData = (idx) => {
              const total = usadoPorHora[idx] || 0;
              const familiar = usadoFamiliar[idx] || 0;
              const temporal = usadoTemporal[idx] || 0;
              const vehiculos = usadoVehiculos[idx] || 0;
              const tipo = modoIngreso ? 'ingresos' : 'salidas';
              return { hora: HORAS_TURNO[idx], total, familiar, temporal, vehiculos, tipo };
            };

            return (
              <>
                {/* Bar chart with two bars per hour */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '130px', padding: '0 2px' }}>
                  {HORAS_TURNO.map((hora, i) => {
                    const fVal = usadoFamiliar[i] || 0;
                    const tVal = usadoTemporal[i] || 0;
                    const fArrived = modoIngreso ? (familiarArrived[i] || 0) : 0;
                    const tArrived = modoIngreso ? (temporalArrived[i] || 0) : 0;
                    const fGray = modoIngreso && fVal > 0 && fArrived >= fVal;
                    const tGray = modoIngreso && tVal > 0 && tArrived >= tVal;
                    const altF = maxVal > 0 ? (fVal / maxVal) * 100 : 0;
                    const altT = maxVal > 0 ? (tVal / maxVal) * 100 : 0;
                    return (
                      <div
                        key={hora}
                        onClick={() => setBarraPopup(getPopupData(i))}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '8px', fontWeight: theme.fonts.weights.bold, color: theme.colors.text, lineHeight: 1, minHeight: '10px' }}>
                          {fVal + tVal > 0 ? fVal + tVal : ''}
                        </span>
                        {/* Two bars: blue (familiar) then orange (temporal) — gray when 100% arrived */}
                        <div style={{ display: 'flex', gap: '2px', width: '100%', height: '80px', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div style={{
                            width: '40%', maxWidth: '12px',
                            height: `${Math.max(2, altF)}%`,
                            borderRadius: '3px 3px 0 0',
                            background: fGray ? COLOR_GRIS : COLOR_FAMILIARES,
                            opacity: fGray ? 0.5 : 0.85,
                            transition: 'height 300ms ease',
                            minHeight: fVal > 0 ? '2px' : '0',
                          }} />
                          <div style={{
                            width: '40%', maxWidth: '12px',
                            height: `${Math.max(2, altT)}%`,
                            borderRadius: '3px 3px 0 0',
                            background: tGray ? COLOR_GRIS : COLOR_TEMPORAL,
                            opacity: tGray ? 0.5 : 0.85,
                            transition: 'height 300ms ease',
                            minHeight: tVal > 0 ? '2px' : '0',
                          }} />
                        </div>
                        <span style={{ fontSize: '6px', color: theme.colors.textMuted, writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
                          {hora}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend — same for both modes */}
                <div style={{ display: 'flex', gap: '10px', fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLOR_FAMILIARES, display: 'inline-block' }} /> Familiares y Amigos
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLOR_TEMPORAL, display: 'inline-block' }} /> Huéspedes Temporales
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Tabla resumen + botones */}
        <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
              Ingresos y salidas
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
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
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => navigate('/visitas/nuevo')}
                style={{
                  padding: '6px 14px',
                  borderRadius: theme.radius.full,
                  background: theme.colors.secondary,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: theme.fonts.sizes.xs,
                  fontWeight: theme.fonts.weights.semibold,
                  color: '#fff',
                  fontFamily: theme.fonts.family,
                }}
              >
                Registrar
              </button>
            </div>
          </div>

          {/* Scrollable table */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '500px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1.2fr 0.6fr 0.7fr 0.7fr 0.9fr',
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
                  gridTemplateColumns: '1.8fr 1.2fr 0.6fr 0.7fr 0.7fr 0.9fr',
                  gap: '4px',
                  padding: '7px 8px',
                  borderRadius: theme.radius.sm,
                  background: idx % 2 === 0 ? 'transparent' : theme.colors.bgMuted,
                  fontSize: theme.fonts.sizes.xs,
                  color: theme.colors.text,
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: theme.colors.secondaryLight, flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: theme.fonts.weights.medium, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {item.nombre}
                    </span>
                  </div>
                  <span style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.xs, whiteSpace: 'normal' }}>
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
          </div>
        </div>

        {/* Popup detalle por hora — shows vehicle info */}
        <Modal isOpen={!!barraPopup} onClose={() => setBarraPopup(null)} title={barraPopup?.hora || ''}>
          {barraPopup && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
              <div style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                Total {barraPopup.tipo === 'ingresos' ? 'ingresos' : 'salidas'}: {barraPopup.total}
              </div>
              <div style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                🚗 {barraPopup.vehiculos} {barraPopup.tipo === 'ingresos' ? 'ingresos' : 'salidas'} con vehículo
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLOR_FAMILIARES, display: 'inline-block' }} /> Familiares: {barraPopup.familiar}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLOR_TEMPORAL, display: 'inline-block' }} /> Huéspedes: {barraPopup.temporal}
                </span>
              </div>
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

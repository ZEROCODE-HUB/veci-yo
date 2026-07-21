import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import InfoButton from '../../../components/ui/InfoButton';
import Modal from '../../../components/ui/Modal';
import { HELP } from '../../../config/helpContent';
import { inquilinoLiderReputacion, agendaHoyInquilinoLider, ingresosSalidasHoy, ingresosSalidasManana, reputacionInsigniasVecino } from '../../../data/mockData';
import iconReputacion from '../../../assets/icons/inquilino-lider/reputacion.png';
import imagenGratitud from '../../../assets/imagenes/gratitud.webp';
import GratitudPopup from '../../inquilino-lider/components/GratitudPopup';
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
  const { addToast, rolActivo, esIncognito, esResidente, visitas, estacionamientosVisitantes, actualizarEstacionamientosVisitantes } = useApp();
  const { nombre, nivel, logros } = inquilinoLiderReputacion;
  const esGuardia = rolActivo === 'guardia';
  const esAdmin = rolActivo === 'administrador';
  const puedeVerReputacionGratitud = !esGuardia && !esAdmin && esResidente;
  const puedeVerTrafico = esGuardia || esAdmin;
  const reputacionHelp = HELP.reputacion?.info;
  const gratitudHelp = HELP.ranking?.info;

  const [planDia, setPlanDia] = useState('Hoy');
  const [modoIngreso, setModoIngreso] = useState(true);
  const [barraPopup, setBarraPopup] = useState(null);
  const [showGratitudPopup, setShowGratitudPopup] = useState(false);
  const [showParkingModal, setShowParkingModal] = useState(false);
  const [parkingAssignments, setParkingAssignments] = useState({});

  const dias = [
    { key: 'Ayer', delta: -1 },
    { key: 'Hoy', delta: 0 },
    { key: 'Mañana', delta: 1 },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Reputación — solo para residentes */}
      {puedeVerReputacionGratitud && <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
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
          {reputacionInsigniasVecino.map(insignia => (
            <div key={insignia.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: theme.colors.iconAmberBg || '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}>
                {insignia.icono}
              </div>
              <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, textAlign: 'center' }}>
                {insignia.cantidad}
              </span>
            </div>
          ))}
        </div>
      </div>}

      {/* Gratitud — solo para residentes */}
      {puedeVerReputacionGratitud && <button
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
        <img src={imagenGratitud} alt="" loading="lazy" style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.50)',
          zIndex: 1,
        }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
          Reconoce a tu comunidad con regalos y colaboración.
        </span>
      </button>}

      {/* Feed de notificaciones — para propietario no-residente */}
      {rolActivo === 'propietario' && !esResidente && !esAdmin && (
        <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
            Notificaciones
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ fontSize: '24px' }}>📢</span>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>No hay anuncios nuevos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ fontSize: '24px' }}>📅</span>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>No hay eventos próximos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
              <span style={{ fontSize: '24px' }}>💬</span>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>No hay chats pendientes</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notificaciones')}
            style={{
              padding: '10px', borderRadius: theme.radius.full,
              background: theme.colors.primary, border: 'none',
              cursor: 'pointer', fontFamily: theme.fonts.family,
              fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold,
              color: theme.colors.text,
            }}
          >
            Ver todas las notificaciones
          </button>
          <button
            type="button"
            onClick={() => navigate('/cuadro-honor')}
            style={{
              padding: '10px', borderRadius: theme.radius.full,
              background: theme.colors.bgMuted, border: `1px solid ${theme.colors.border}`,
              cursor: 'pointer', fontFamily: theme.fonts.family,
              fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold,
              color: theme.colors.text,
            }}
          >
            Ver Ranking →
          </button>
        </div>
      )}

      {/* Bloque de tráfico — para Guardia de Seguridad y Administrador */}
      {puedeVerTrafico && (<>
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
                            position: 'relative',
                          }}>
                            {fVal > 0 && (
                              <span style={{
                                position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
                                fontSize: '9px', fontWeight: theme.fonts.weights.bold,
                                color: fGray ? theme.colors.textMuted : '#fff',
                                lineHeight: 1, textShadow: fGray ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
                              }}>
                                {fVal}
                              </span>
                            )}
                          </div>
                          <div style={{
                            width: '40%', maxWidth: '12px',
                            height: `${Math.max(2, altT)}%`,
                            borderRadius: '3px 3px 0 0',
                            background: tGray ? COLOR_GRIS : COLOR_TEMPORAL,
                            opacity: tGray ? 0.5 : 0.85,
                            transition: 'height 300ms ease',
                            minHeight: tVal > 0 ? '2px' : '0',
                            position: 'relative',
                          }}>
                            {tVal > 0 && (
                              <span style={{
                                position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
                                fontSize: '9px', fontWeight: theme.fonts.weights.bold,
                                color: tGray ? theme.colors.textMuted : '#fff',
                                lineHeight: 1, textShadow: tGray ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
                              }}>
                                {tVal}
                              </span>
                            )}
                          </div>
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
        {/* Estacionamientos de visita — acceso rápido */}
        <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🅿️</span>
              <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                Estacionamientos de visita
              </span>
            </div>
            <button
              onClick={() => {
                setParkingAssignments({});
                setShowParkingModal(true);
              }}
              style={{
                padding: '6px 14px', borderRadius: theme.radius.full,
                background: theme.colors.primary, color: '#fff', border: 'none',
                cursor: 'pointer', fontFamily: theme.fonts.family,
                fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
              }}
            >
              Administrar
            </button>
          </div>
          {estacionamientosVisitantes && (
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
              {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados} de {estacionamientosVisitantes.total} disponibles
            </div>
          )}
        </div>

        {/* Admin: acceso directo a gestión de guardias */}
        {esAdmin && (
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>👮</span>
                <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                  Asignación de guardias de seguridad
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/seguridad')}
                style={{
                  padding: '6px 14px', borderRadius: theme.radius.full,
                  background: theme.colors.primary, color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                }}
              >
                Gestionar
              </button>
            </div>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
              Alta/baja de turnos, horarios recurrentes, rotaciones, ajuste manual
            </div>
          </div>
        )}

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
                  <span style={{ fontWeight: theme.fonts.weights.medium, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {item.nombre}
                  </span>
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

      {/* Hoy — oculto para guardia y no-residentes */}
      {!esGuardia && esResidente && <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
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

      {/* Parking management modal */}
      <Modal isOpen={showParkingModal} onClose={() => setShowParkingModal(false)} title="Estacionamientos de visita">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
            Asigne cada estacionamiento a un visitante registrado hoy
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {/* Generate parking spots B01-B20 */}
            {Array.from({ length: estacionamientosVisitantes?.total || 20 }, (_, i) => {
              const spot = `B${String(i + 1).padStart(2, '0')}`;
              const assigned = parkingAssignments[spot];
              const visitOptions = visitas.flatMap(v =>
                (v.invitados && v.invitados.length > 0 ? v.invitados : [{ nombre: v.nombre }]).map((inv, idx) => ({
                  label: `${inv.nombre} (${v.torre}-${v.depto})`,
                  value: `${v.id}-${idx}`,
                }))
              );
              const uniqueOptions = Array.from(new Map(visitOptions.map(o => [o.value, o])).values());
              return (
                <div key={spot} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: theme.radius.lg,
                  background: assigned ? '#F0FDF4' : theme.colors.bgMuted,
                  border: `1px solid ${assigned ? theme.colors.success : theme.colors.border}`,
                }}>
                  <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.sm, minWidth: '40px' }}>
                    {spot}
                  </span>
                  <select
                    value={assigned || ''}
                    onChange={e => {
                      setParkingAssignments(prev => {
                        const next = { ...prev };
                        if (e.target.value) {
                          next[spot] = e.target.value;
                        } else {
                          delete next[spot];
                        }
                        return next;
                      });
                    }}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: theme.fonts.sizes.xs, fontFamily: theme.fonts.family,
                      color: theme.colors.text, background: theme.colors.bgCard,
                      outline: 'none',
                    }}
                  >
                    <option value="">— Sin asignar —</option>
                    {uniqueOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {assigned && (
                    <button
                      onClick={() => {
                        setParkingAssignments(prev => {
                          const next = { ...prev };
                          delete next[spot];
                          return next;
                        });
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: theme.colors.danger, fontSize: '16px', padding: '2px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              const ocupados = Object.keys(parkingAssignments).length;
              actualizarEstacionamientosVisitantes({ ocupados });
              addToast(`${ocupados} estacionamiento(s) asignado(s)`, 'success');
              setShowParkingModal(false);
            }}
            style={{
              width: '100%', padding: '12px', borderRadius: theme.radius.full,
              background: theme.colors.primary, color: '#fff', border: 'none',
              cursor: 'pointer', fontFamily: theme.fonts.family,
              fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold,
            }}
          >
            Guardar asignaciones
          </button>
        </div>
      </Modal>

      <GratitudPopup isOpen={showGratitudPopup} onClose={() => setShowGratitudPopup(false)} destinatarioPreseleccionado="" />
    </div>
  );
}

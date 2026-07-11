import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import {
  cuadroHonorEstados,
  cuadroHonorDepartamentos,
  torresCuadroHonor,
  departamentosFiltroCuadroHonor,
  administradoresCuadroHonor,
  administradorCuadroHonor,
  trofeosReconocimiento,
  guardiasSeguridad,
} from '../../data/mockData';
import iconReciclador from '../../assets/icons/inquilino-lider/medalla-reciclador.png';
import iconAtento from '../../assets/icons/inquilino-lider/medalla-atento.png';
import iconMedallaBronce from '../../assets/icons/inquilino-lider/reconocimiento-medalla-bronce.png';
import iconMedallaPlata from '../../assets/icons/inquilino-lider/medalla-logro5.png';
import iconMedallaOro from '../../assets/icons/inquilino-lider/cuadro-honor-badge.png';
import iconReconocimientoOro from '../../assets/icons/inquilino-lider/reconocimiento-medalla-oro.png';
import iconDepartamento from '../../assets/icons/inquilino-lider/reconocimiento-hero.png';
import iconRegalo from '../../assets/icons/inquilino-lider/regalos.png';

const MEDALLAS = [
  { key: 'reciclador', label: 'Reciclador', icon: iconReciclador, scale: 1 },
  { key: 'atento', label: 'Atento', icon: iconAtento, scale: 1 },
  { key: 'bronce', label: 'Medalla Bronce', icon: iconMedallaBronce, scale: 1 },
  { key: 'plata', label: 'Medalla Plata', icon: iconMedallaPlata, scale: 1 },
  { key: 'oro', label: 'Medalla Oro', icon: iconMedallaOro, scale: 1 },
];

const MEDALLA_LABELS = MEDALLAS.map(m => m.label);

const TABS = ['Todos', ...cuadroHonorEstados];

const ESTADO_BORDER = {
  Atrasado: theme.colors.primary,
  Deudor: theme.colors.statusGray,
  'Al día': theme.colors.secondary,
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const pillButtonStyle = {
  background: theme.colors.bgMuted,
  border: 'none',
  borderRadius: theme.radius.full,
  padding: '14px 18px',
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.medium,
  color: theme.colors.text,
  cursor: 'pointer',
  fontFamily: theme.fonts.family,
  textAlign: 'center',
  width: '100%',
};

function MedallaIcon({ medalla, size }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
      <img
        src={medalla.icon}
        alt={medalla.label}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${medalla.scale || 1})` }}
      />
    </div>
  );
}

function FilaMedallas({ medallas, conseguidas }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {medallas.map((medalla, i) => {
        const conseguida = conseguidas ? conseguidas[i] : true;
        return (
          <div
            key={medalla.key}
            style={{
              opacity: conseguida ? 1 : 0.35,
              filter: conseguida ? 'none' : 'grayscale(1)',
            }}
          >
            <MedallaIcon medalla={medalla} size="32px" />
          </div>
        );
      })}
    </div>
  );
}

// Pantalla 1 del Inquilino Líder: "Gratitud" / Cuadro de Honor. Tabla de
// medallas recolectadas por los integrantes del condominio, con un menú de
// acciones por departamento y un flujo de reconocimiento (Calificar →
// Trofeos → Reconocimiento) accesible desde el badge "ADM" del header o
// desde el ícono de regalo de cada departamento.
export default function CuadroHonorPage() {
  const navigate = useNavigate();
  const { addToast, rolActivo } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [torreFiltro, setTorreFiltro] = useState('');
  const [deptoFiltro, setDeptoFiltro] = useState('');
  const [adminFiltro, setAdminFiltro] = useState('');
  const [encuestaActiva, setEncuestaActiva] = useState(false);
  const [showIntroPopup, setShowIntroPopup] = useState(false);

  useEffect(() => {
    const visto = localStorage.getItem('gratitudIntroVisto');
    if (!visto) {
      setShowIntroPopup(true);
    }
  }, []);

  const cerrarIntro = (noMostrar = false) => {
    setShowIntroPopup(false);
    if (noMostrar) {
      localStorage.setItem('gratitudIntroVisto', 'true');
    }
  };

  const [accionesDept, setAccionesDept] = useState(null);
  const [calificarOpen, setCalificarOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [medallaElegida, setMedallaElegida] = useState('');
  const [trofeosLista, setTrofeosLista] = useState(null);
  const [reconocimientoDestino, setReconocimientoDestino] = useState(null);

  const esGuardia = rolActivo === 'guardia';
  const medallasDisponibles = esGuardia
    ? MEDALLAS.filter(m => m.key === 'bronce' || m.key === 'plata' || m.key === 'oro')
    : MEDALLAS;
  const medallasLabels = medallasDisponibles.map(m => m.label);

  const filtered = cuadroHonorDepartamentos.filter(d => {
    const matchSearch = !search
      || d.departamento.toLowerCase().includes(search.toLowerCase())
      || d.responsable.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todos' || d.estado === activeTab;
    return matchSearch && matchTab;
  });

  const abrirCalificar = () => {
    setEstrellas(0);
    setMedallaElegida('');
    setCalificarOpen(true);
  };

  const confirmarCalificar = () => {
    setCalificarOpen(false);
    setTrofeosLista([{ ...administradorCuadroHonor, tipo: 'administrador' }]);
  };

  const abrirTrofeosVecinos = () => {
    if (esGuardia) {
      const personal = [
        ...guardiasSeguridad.map(g => ({ nombre: g.nombre, tipo: 'guardia' })),
        { ...administradorCuadroHonor, tipo: 'administrador' },
      ];
      setTrofeosLista(personal);
    } else {
      setTrofeosLista(trofeosReconocimiento.map(t => ({ ...t, tipo: 'vecino' })));
    }
  };

  const elegirDestino = (persona) => {
    setTrofeosLista(null);
    setReconocimientoDestino(persona);
  };

  const confirmarReconocimiento = () => {
    setReconocimientoDestino(null);
  };

  const handleComunicacion = (tipo) => {
    setAccionesDept(null);
    if (tipo === 'llamar') navigate('/llamar');
    else if (tipo === 'whatsapp') navigate('/chat');

  };

  return (
    <AppShell>
      <PageHeader
        title="Cuadro de Honor"
        action={
          <ModuloHeaderInfo
            helpKey="ranking"
            action={
              <button
                type="button"
                onClick={abrirCalificar}
                style={{
                  padding: '6px 14px',
                  borderRadius: theme.radius.full,
                  background: theme.colors.primary,
                  color: theme.colors.text,
                  fontWeight: theme.fonts.weights.bold,
                  fontSize: theme.fonts.sizes.sm,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                }}
              >
                ADM
              </button>
            }
          />
        }
      />

      <ModuloGate helpKey="ranking">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
          En esta tabla verás las medallas recolectadas por los integrantes de su condominio y su estado de cumplimiento.
        </p>

        <div style={{ ...cardStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SearchBar value={search} onChange={setSearch} />
          <StatusTabs tabs={TABS} active={activeTab} onChange={tab => setActiveTab(tab || 'Todos')} centered />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                background: theme.colors.bgMuted,
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '24px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms, background 200ms',
              }}
              aria-label={filterOpen ? 'Cerrar filtros' : 'Abrir filtros'}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <SelectField label="Torre" value={torreFiltro} options={torresCuadroHonor} onChange={setTorreFiltro} placeholder="Torre" />
                <SelectField label="Departamento" value={deptoFiltro} options={departamentosFiltroCuadroHonor} onChange={setDeptoFiltro} placeholder="Departamento" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                <SelectField label="Administrador" value={adminFiltro} options={administradoresCuadroHonor} onChange={setAdminFiltro} placeholder="Administrador" />
                <button
                  type="button"
                  onClick={() => setEncuestaActiva(a => !a)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                    background: theme.colors.bgCard,
                    border: `1.5px solid ${theme.colors.border}`,
                    borderRadius: theme.radius['2xl'],
                    padding: '13px 16px',
                    cursor: 'pointer',
                    fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.base,
                    color: theme.colors.text,
                  }}
                >
                  <span style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: theme.radius.full,
                    background: encuestaActiva ? theme.colors.secondary : theme.colors.border,
                    position: 'relative',
                    transition: 'background 150ms',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      left: encuestaActiva ? '18px' : '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 150ms',
                      boxShadow: theme.shadows.sm,
                    }} />
                  </span>
                  Encuesta
                </button>
              </div>
            </div>
          )}
        </div>

        {filtered.map(dept => (
          <div
            key={dept.id}
            style={{
              ...cardStyle,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              border: `2px solid ${ESTADO_BORDER[dept.estado]}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={iconDepartamento} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                  {dept.departamento}
                </div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                  Responsable: {dept.responsable}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccionesDept(dept)}
                aria-label="Más acciones"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: theme.colors.bgMuted,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: theme.colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ⋮
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <FilaMedallas medallas={medallasDisponibles} conseguidas={dept.medallas} />
              <button
                type="button"
                onClick={abrirTrofeosVecinos}
                aria-label="Dar reconocimiento"
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: theme.colors.dangerLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={iconRegalo} alt="Reconocer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  background: theme.colors.danger,
                  color: '#fff',
                  borderRadius: theme.radius.full,
                  fontSize: theme.fonts.sizes['2xs'],
                  fontWeight: theme.fonts.weights.bold,
                  padding: '1px 5px',
                  lineHeight: 1.4,
                }}>
                  {dept.contador}
                </span>
              </button>
            </div>
          </div>
        ))}

        <div style={{ height: '24px' }} />
      </div>
      </ModuloGate>

      {/* Menú de acciones por departamento */}
      <Modal isOpen={!!accionesDept} onClose={() => setAccionesDept(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" onClick={() => handleComunicacion('llamar')} style={pillButtonStyle}>
            Llamar responsable
          </button>
          <button type="button" onClick={() => handleComunicacion('correo')} style={pillButtonStyle}>
            Correo al responsable
          </button>
          <button type="button" onClick={() => handleComunicacion('whatsapp')} style={pillButtonStyle}>
            Whatsapp responsable
          </button>
          <button
            type="button"
            onClick={() => {
              const dept = accionesDept;
              setAccionesDept(null);
              navigate('/perfil/soporte/reclamos/nuevo', {
                state: {
                  categoriaPreseleccionada: 'Denuncia entre departamentos',
                  titulo: `Denuncia: ${dept?.departamento || ''}`,
                  descripcion: `Reporte desde Cuadro de Honor contra: ${dept?.departamento || ''} - Responsable: ${dept?.responsable || ''}`,
                  departamentoDenunciado: dept?.departamento || '',
                  torreDenunciada: '',
                  viviendaDenunciada: dept?.departamento || '',
                },
              });
            }}
            style={{ ...pillButtonStyle, color: theme.colors.danger }}
          >
            Denunciar / Reportar
          </button>
        </div>
      </Modal>

      {/* Calificar (acceso desde el badge ADM) */}
      <Modal isOpen={calificarOpen} onClose={() => setCalificarOpen(false)} title="Calificar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginBottom: '12px' }}>
              Seleccione la cantidad de estrellas
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEstrellas(n)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: n <= estrellas ? theme.colors.primary : theme.colors.border, padding: 0, lineHeight: 1 }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <SelectField value={medallaElegida} options={medallasLabels} onChange={setMedallaElegida} placeholder="Seleccione medalla a dar:" />
          <Button variant="primary" fullWidth onClick={confirmarCalificar}>Reconocer</Button>
        </div>
      </Modal>

      {/* Trofeos: elegir destinatario del reconocimiento */}
      <Modal isOpen={!!trofeosLista} onClose={() => setTrofeosLista(null)} title="Trofeos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, margin: 0 }}>
            A quien quieres dar el reconocimiento
          </p>
          {trofeosLista?.map(persona => (
            <button
              key={persona.nombre}
              type="button"
              onClick={() => elegirDestino(persona)}
              style={{
                ...cardStyle,
                border: `1px solid ${theme.colors.border}`,
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '12px 14px',
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                width: '100%',
              }}
            >
              <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                {persona.nombre}
              </span>
              <span style={{ display: 'flex', gap: '6px' }}>
                {MEDALLAS.map(medalla => (
                  <MedallaIcon key={medalla.key} medalla={medalla} size="26px" />
                ))}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Reconocimiento: confirmación */}
      <Modal isOpen={!!reconocimientoDestino} onClose={() => setReconocimientoDestino(null)} title="Reconocimiento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
            {reconocimientoDestino?.tipo === 'administrador'
              ? `¡Tu administrador ${reconocimientoDestino?.nombre} estará sorprendido!`
              : reconocimientoDestino?.tipo === 'guardia'
                ? `¡El guardia ${reconocimientoDestino?.nombre} estará sorprendido!`
                : `¡Tu vecino ${reconocimientoDestino?.nombre} estará sorprendido!`}
          </p>
          <img src={iconReconocimientoOro} alt="Medalla de reconocimiento" style={{ width: '140px', height: '140px', objectFit: 'contain' }} />
          <Button variant="primary" fullWidth onClick={confirmarReconocimiento}>Aceptar</Button>
        </div>
      </Modal>

      {/* Intro Gratitud — primera vez */}
      <Modal isOpen={showIntroPopup} onClose={() => cerrarIntro(false)} title="Gratitud">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '48px' }}>🏅</span>
          <h3 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
            ¿Qué es Gratitud?
          </h3>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
            Gratitud es un sistema de reconocimiento entre vecinos. Las insignias representan logros y buenas acciones dentro de la comunidad.
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
            Puedes obtener insignias participando activamente, y también puedes entregarlas a otros vecinos para reconocer su buen comportamiento.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <Button variant="primary" fullWidth onClick={() => cerrarIntro(false)}>Entendido</Button>
            <Button variant="ghost" fullWidth onClick={() => cerrarIntro(true)}>No mostrar nuevamente</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

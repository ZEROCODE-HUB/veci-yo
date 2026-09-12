import { useState, useMemo } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { contactosDepartamento } from '../../data/mockData';
import DirectorioAdminPagos from './DirectorioAdminPagos';

export default function DirectorioPropiedadesPage() {
  const { unidades, tipologias, residentesPropietario, torres, bloques, estacionamientosVisitantes, rolActivo, pagosMantenimiento, depositos, propietarioAnfitrionPrimario, propietarioAdministradorPrimario } = useApp();
  const esAdmin = rolActivo === 'administrador';
  const [tab, setTab] = useState('directorio');
  const [search, setSearch] = useState('');
  const [torreFiltro, setTorreFiltro] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [subTab, setSubTab] = useState('departamentos');

  const anfitrionPrimario = residentesPropietario.find(r => r.esAnfitrionPrimario);
  const adminPrimario = residentesPropietario.find(r => r.esAdministradorPrimario);
  const getAdminPrimario = () => {
    if (propietarioAdministradorPrimario) return contactosDepartamento.administrador;
    if (adminPrimario) return { nombre: adminPrimario.nombre, telefono: adminPrimario.telefono || contactosDepartamento.administrador.telefono };
    return contactosDepartamento.administrador;
  };
  const contactosFor = (unidad) => {
    const anfitrion = anfitrionPrimario ? { nombre: anfitrionPrimario.nombre, telefono: anfitrionPrimario.telefono || contactosDepartamento.anfitrion.telefono } : contactosDepartamento.anfitrion;
    const admin = getAdminPrimario();
    return {
      anfitrion,
      administrador: admin,
      propietario: unidad.propietarioAsignado ? { nombre: unidad.propietarioAsignado, telefono: unidad.propietarioEmail || contactosDepartamento.propietario.telefono } : contactosDepartamento.propietario,
    };
  };

  const filtered = useMemo(() => {
    return unidades.filter(u => {
      if (torreFiltro && String(u.torreNumero) !== torreFiltro.replace('Torre ','').trim() && String(u.torreNumero) !== torreFiltro) return false;
      if (search && !(`${u.codigo} ${u.propietarioAsignado || ''}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [unidades, torreFiltro, search]);

  const estPorTorre = (num) => unidades.filter(u => u.torreNumero === num).reduce((s,u)=>s+(u.estacionamientos||0),0);

  // Estacionamientos derivados por torre
  const estacionamientosList = useMemo(() => {
    const list = [];
    const torresNums = [...new Set(unidades.map(u => u.torreNumero))].sort((a,b)=>a-b);
    torresNums.forEach(tNum => {
      const unidadesTorre = unidades.filter(u => u.torreNumero === tNum);
      unidadesTorre.forEach(u => {
        for (let i=0;i<(u.estacionamientos||0);i++) {
          const code = `${u.codigo}-E${i+1}`;
          const ubic = u.ubicacionParking || `T${tNum}`;
          list.push({ id: `${u.id}-${i}`, codigo: code, ubicacion: ubic, torreNumero: tNum, unidad: u, propietario: u.propietarioAsignado || 'Sin propietario', contactos: contactosFor(u) });
        }
      });
    });
    return list;
  }, [unidades, residentesPropietario, propietarioAnfitrionPrimario, propietarioAdministradorPrimario]);

  const filteredEst = useMemo(() => {
    return estacionamientosList.filter(e => {
      if (torreFiltro && String(e.torreNumero) !== torreFiltro.replace('Torre ','').trim() && String(e.torreNumero) !== torreFiltro) return false;
      if (search && !(`${e.codigo} ${e.propietario} ${e.unidad.codigo}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [estacionamientosList, torreFiltro, search]);

  const filteredDep = useMemo(() => {
    return (depositos||[]).filter(d => {
      if (torreFiltro && String(d.torreNumero) !== torreFiltro.replace('Torre ','').trim() && String(d.torreNumero) !== torreFiltro) return false;
      if (search && !(`${d.codigo} ${d.ubicacion} ${d.departamentoCodigo || ''}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [depositos, torreFiltro, search]);

  return (
    <AppShell>
      <PageHeader title="Directorio de Propiedades" />
      {esAdmin && (
        <div style={{ display:'flex', gap:'8px', padding:'12px 16px 0' }}>
          <button onClick={()=>setTab('directorio')} style={{ flex:1, padding:'8px', borderRadius: theme.radius.full, border:'none', background: tab==='directorio'?theme.colors.primary:theme.colors.bgMuted, color: tab==='directorio'?'#fff':theme.colors.textSecondary, fontWeight:600, cursor:'pointer' }}>Directorio</button>
          <button onClick={()=>setTab('pagos')} style={{ flex:1, padding:'8px', borderRadius: theme.radius.full, border:'none', background: tab==='pagos'?theme.colors.primary:theme.colors.bgMuted, color: tab==='pagos'?'#fff':theme.colors.textSecondary, fontWeight:600, cursor:'pointer' }}>Pagos / Comité</button>
        </div>
      )}
      {esAdmin && tab==='pagos' ? <div style={{ padding:'16px'}}><DirectorioAdminPagos/></div> : (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar torre, depto, propietario, estacionamiento, depósito" />
        <SelectField value={torreFiltro} options={['', 'Torre 1','Torre 2','Torre 3']} onChange={setTorreFiltro} placeholder="Filtrar por torre" />
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap' }}>
          {[
            {v:'departamentos', l:'Departamentos'},
            {v:'estacionamientos', l:'Estacionamientos'},
            {v:'depositos', l:'Depósitos'},
          ].map(t=> (
            <button key={t.v} onClick={()=>setSubTab(t.v)} style={{ padding:'6px 12px', borderRadius: theme.radius.full, border: `1.5px solid ${subTab===t.v?theme.colors.primary:theme.colors.border}`, background: subTab===t.v?theme.colors.primary:theme.colors.bgCard, color: subTab===t.v?'#fff':theme.colors.textSecondary, fontSize: theme.fonts.sizes.xs, fontWeight:600, cursor:'pointer' }}>{t.l}</button>
          ))}
        </div>
        <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center' }}>Solo consulta — la edición se hace en Arquitectura</div>

        {subTab==='departamentos' && filtered.map(u => {
          const contactos = contactosFor(u);
          const tipologia = tipologias.find(t=>t.id===u.tipologiaId);
          return (
            <div key={u.id} onClick={()=>setDetalle({tipo:'departamento', unidad:u, contactos})} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Torre {u.torreNumero} → Depto {u.codigo} {tipologia ? `(${tipologia.nombre})` : ''}</div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Piso {u.piso} · {u.estado}</div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Propietario: {u.propietarioAsignado || '—'} {u.propietarioAsignado && anfitrionPrimario && u.propietarioAsignado===anfitrionPrimario.nombre ? <span style={{ background: theme.colors.primaryLight, color: theme.colors.primary, padding: '1px 6px', borderRadius: theme.radius.full, fontWeight: 700 }}>Primario</span> : null}</div>
                </div>
                <span style={{ fontSize: '18px' }}>›</span>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: theme.fonts.sizes['2xs'], background: theme.colors.bgMuted, padding: '2px 8px', borderRadius: theme.radius.full }}>🏠 Estac: {u.estacionamientos}</span>
                <span style={{ fontSize: theme.fonts.sizes['2xs'], background: theme.colors.bgMuted, padding: '2px 8px', borderRadius: theme.radius.full }}>📦 Depósitos asociados al depto</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                Propietario: {contactos.propietario.nombre} · Anfitrión primario: {contactos.anfitrion.nombre} · Admin: {contactos.administrador.nombre}
              </div>
            </div>
          );
        })}
        {subTab==='departamentos' && filtered.length===0 && <div style={{ textAlign:'center', color: theme.colors.textMuted, padding:'24px' }}>Sin resultados</div>}

        {subTab==='estacionamientos' && filteredEst.map(e => (
          <div key={e.id} onClick={()=>setDetalle({tipo:'estacionamiento', est:e, contactos:e.contactos, unidad:e.unidad})} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, cursor: 'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Estacionamiento {e.codigo} — Torre {e.torreNumero}</div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Ubicación: {e.ubicacion} → Depto {e.unidad.codigo}</div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Propietario: {e.contactos.propietario.nombre}</div>
              </div>
              <span style={{ fontSize: '18px' }}>›</span>
            </div>
            <div style={{ marginTop:'8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
              Propietario: {e.contactos.propietario.nombre} · Anfitrión primario: {e.contactos.anfitrion.nombre} · Admin: {e.contactos.administrador.nombre}
            </div>
          </div>
        ))}
        {subTab==='estacionamientos' && filteredEst.length===0 && <div style={{ textAlign:'center', color: theme.colors.textMuted, padding:'24px' }}>Sin estacionamientos</div>}

        {subTab==='depositos' && filteredDep.map(d => {
          const unidad = unidades.find(u=> String(u.id)===String(d.unidadId) || u.codigo===d.departamentoCodigo);
          const contactos = unidad ? contactosFor(unidad) : { propietario: contactosDepartamento.propietario, anfitrion: anfitrionPrimario ? {nombre: anfitrionPrimario.nombre, telefono: contactosDepartamento.anfitrion.telefono} : contactosDepartamento.anfitrion, administrador: getAdminPrimario() };
          const deptoLabel = unidad ? unidad.codigo : (d.departamentoCodigo || '—');
          return (
            <div key={d.id} onClick={()=>setDetalle({tipo:'deposito', deposito:d, contactos, unidad})} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, cursor: 'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Depósito {d.codigo} — Torre {d.torreNumero}</div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Ubicación: {d.ubicacion} → Depto {deptoLabel}</div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Propietario: {contactos.propietario.nombre}</div>
                </div>
                <span style={{ fontSize: '18px' }}>›</span>
              </div>
              <div style={{ marginTop:'8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                Propietario: {contactos.propietario.nombre} · Anfitrión primario: {contactos.anfitrion.nombre} · Admin: {contactos.administrador.nombre}
              </div>
            </div>
          );
        })}
        {subTab==='depositos' && filteredDep.length===0 && <div style={{ textAlign:'center', color: theme.colors.textMuted, padding:'24px' }}>Sin depósitos</div>}
      </div>
      )}

      <Modal isOpen={!!detalle} onClose={()=>setDetalle(null)} title={
        detalle?.tipo==='estacionamiento' ? `Estacionamiento ${detalle.est.codigo}` :
        detalle?.tipo==='deposito' ? `Depósito ${detalle.deposito.codigo}` :
        detalle?.unidad ? `Depto ${detalle.unidad.codigo} — Torre ${detalle.unidad.torreNumero}` : ''}>
        {detalle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.6 }}>
              {detalle.tipo==='estacionamiento' && (
                <>
                  <div>Estacionamiento <strong>{detalle.est.codigo}</strong> ({detalle.est.ubicacion}) → Depto <strong>{detalle.unidad.codigo}</strong> → Propietario: <strong>{detalle.contactos.propietario.nombre}</strong></div>
                  <div>Torre {detalle.est.torreNumero} · Anfitrión primario: <strong>{detalle.contactos.anfitrion.nombre}</strong> · Administrador: <strong>{detalle.contactos.administrador.nombre}</strong></div>
                </>
              )}
              {detalle.tipo==='deposito' && (
                <>
                  <div>Depósito <strong>{detalle.deposito.codigo}</strong> ({detalle.deposito.ubicacion}) → Depto <strong>{detalle.unidad ? detalle.unidad.codigo : detalle.deposito.departamentoCodigo}</strong> → Propietario: <strong>{detalle.contactos.propietario.nombre}</strong></div>
                  <div>Torre {detalle.deposito.torreNumero} · Anfitrión primario: <strong>{detalle.contactos.anfitrion.nombre}</strong> · Administrador: <strong>{detalle.contactos.administrador.nombre}</strong></div>
                </>
              )}
              {(!detalle.tipo || detalle.tipo==='departamento') && (
                <>
                  <div>Torre → Departamento → Propietario: <strong>{detalle.unidad.propietarioAsignado || 'Sin asignar'}</strong></div>
                  <div>Estacionamiento → Depto {detalle.unidad.codigo} → {detalle.unidad.propietarioAsignado || '—'}</div>
                  <div>Depósito → Depto {detalle.unidad.codigo} → {detalle.unidad.propietarioAsignado || '—'}</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="ghost" fullWidth onClick={()=>{ window.location.href=`tel:${detalle.contactos.anfitrion.telefono}`;}}>📞 Llamar Anfitrión primario: {detalle.contactos.anfitrion.nombre}</Button>
              <Button variant="ghost" fullWidth onClick={()=>{ window.location.href=`tel:${detalle.contactos.administrador.telefono}`;}}>📞 Llamar Administrador: {detalle.contactos.administrador.nombre}</Button>
              <Button variant="ghost" fullWidth onClick={()=>{ window.location.href=`tel:${detalle.contactos.propietario.telefono}`;}}>📞 Llamar Propietario: {detalle.contactos.propietario.nombre}</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

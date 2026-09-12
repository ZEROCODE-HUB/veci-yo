import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function DirectorioAdminPagos(){
  const { unidades, pagosMantenimiento, marcarPagoMantenimiento, cargarPagosExcel, comitePropietarios, toggleComite, addToast } = useApp();
  const [excelInput, setExcelInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedCodes, setParsedCodes] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const totalPagados = Object.values(pagosMantenimiento).filter(Boolean).length;

  const parseCodesFromText = (text) => {
    return text.split(/[\n,;]+/).map(s=> s.trim()).filter(Boolean).map(s=> s.replace(/^["']|["']$/g,'').trim()).filter(Boolean);
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      let codes = [];
      if (isCsv) {
        const text = typeof result === 'string' ? result : new TextDecoder().decode(result);
        codes = parseCodesFromText(text);
      } else {
        // Excel (.xlsx/.xls): intentar leer como texto y extraer códigos de depto
        let text = '';
        if (typeof result === 'string') {
          text = result;
        } else {
          try { text = new TextDecoder('utf-8').decode(result); } catch { text = String(result); }
        }
        // Extraer posibles códigos de departamento (ej: 101, 102, 201, 506 C) - buscar patrones alfanuméricos de 2-6 chars que existan como unidades
        const uniraw = [...new Set(parseCodesFromText(text))];
        // También intentar extraer por regex códigos tipo 101 / 506 C
        const regexMatches = text.match(/\b\d{2,4}\s*[A-Za-z]?\b/g) || [];
        const regexCodes = regexMatches.map(s=> s.trim()).filter(Boolean);
        // Preferir la lista más completa pero filtrar a códigos plausibles (2-10 chars)
        const combined = [...new Set([...uniraw, ...regexCodes])].map(s=> s.replace(/[^0-9A-Za-z\s]/g,'').trim()).filter(s=> s.length>=2 && s.length<=10);
        // Filtrar solo a los que podrían ser deptos o mantener todos para preview
        codes = combined.length ? combined : uniraw;
        // Si el excel es binario y no se pudo extraer texto legible, codes puede quedar vacío -> mostrar mensaje
        if (!codes.length && file.name.toLowerCase().endsWith('.xlsx')) {
          // Fallback: avisar que se necesita CSV (el parsing binario real requeriría librería xlsx)
          codes = [];
        }
      }
      // Limpiar y deduplicar, normalizar (ej: "101" vs "101 "))
      const normalized = [...new Set(codes.map(c=> c.trim()).filter(Boolean))];
      setParsedCodes(normalized);
      // También sincronizar el textarea con lo parseado para que el usuario pueda editar
      if (normalized.length) setExcelInput(normalized.join(', '));
    };
    if (isCsv) {
      reader.readAsText(file);
    } else {
      // Para xlsx tratamos de leer como ArrayBuffer para capturar binario y luego decodificar
      // Usamos readAsText como primera pasada; si falla, el onload aún intentará extraer
      try {
        reader.readAsArrayBuffer(file);
      } catch {
        reader.readAsText(file);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleExcelConfirm = () => {
    const source = parsedCodes.length ? parsedCodes : parseCodesFromText(excelInput);
    if (!source.length) {
      addToast && addToast('No se encontraron códigos de departamento en el archivo', 'warning');
      return;
    }
    cargarPagosExcel(source);
    addToast && addToast(`${source.length} departamento(s) marcados como pagados`, 'success');
    setShowUploadModal(false);
    setFileName('');
    setParsedCodes([]);
    // No limpiamos excelInput para dejar historial editable
  };

  const handleOpenModal = () => {
    setParsedCodes(parseCodesFromText(excelInput));
    setFileName('');
    setShowUploadModal(true);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding:'12px', fontSize: theme.fonts.sizes.sm }}>
        Pagados: {totalPagados} / {unidades.length} · No pagados: {unidades.length-totalPagados}
      </div>
      <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding:'12px', boxShadow: theme.shadows.card }}>
        <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: 600, marginBottom:'8px' }}>Carga masiva de pagos</div>
        <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom:'8px', lineHeight: 1.5 }}>Sube un Excel o CSV con la lista de departamentos que pagaron. El sistema marcará automáticamente cada departamento como pagado.</div>
        <Button variant="primary" fullWidth onClick={handleOpenModal}>Cargar y marcar pagados</Button>
      </div>

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Cargar pagos desde Excel / CSV">
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div
            onDragOver={e=>{e.preventDefault(); setDragOver(true);}}
            onDragLeave={()=> setDragOver(false)}
            onDrop={handleDrop}
            onClick={()=> fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? theme.colors.primary : theme.colors.border}`,
              borderRadius: theme.radius.lg,
              padding:'24px 16px',
              textAlign:'center',
              background: dragOver ? theme.colors.primaryLight : theme.colors.bgMuted,
              cursor:'pointer',
              transition:'all 150ms',
            }}
          >
            <div style={{ fontSize:'28px', marginBottom:'6px' }}>📄</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight:600, color: theme.colors.text }}>
              Arrastra tu Excel o CSV aquí o haz clic para seleccionar
            </div>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop:'4px' }}>
              Formatos aceptados: .xlsx, .xls, .csv — debe contener códigos de departamento (ej: 101, 102, 506 C)
            </div>
            {fileName && (
              <div style={{ marginTop:'10px', fontSize: theme.fonts.sizes.xs, color: theme.colors.primary, fontWeight:600 }}>
                📎 {fileName} {parsedCodes.length ? `· ${parsedCodes.length} código(s) detectado(s)` : '· sin códigos detectados'}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display:'none' }} />
          </div>

          {parsedCodes.length > 0 && (
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding:'10px 12px' }}>
              <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight:600, color: theme.colors.textSecondary, marginBottom:'6px' }}>Códigos detectados ({parsedCodes.length}):</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', maxHeight:'100px', overflowY:'auto' }}>
                {parsedCodes.map((c,i)=> (
                  <span key={i} style={{ background: theme.colors.bgCard, border:`1px solid ${theme.colors.border}`, padding:'2px 8px', borderRadius: theme.radius.full, fontSize: theme.fonts.sizes.xs }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {fileName && !parsedCodes.length && (
            <div style={{ background:'#FEF3C7', borderRadius: theme.radius.lg, padding:'10px 12px', fontSize: theme.fonts.sizes.xs, color:'#92400E', lineHeight:1.5 }}>
              No se detectaron códigos. Si es un Excel (.xlsx), asegúrate de que la primera columna contenga los códigos y prueba exportándolo como CSV. También puedes pegarlos manualmente abajo.
            </div>
          )}

          <div>
            <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight:600, color: theme.colors.textSecondary, marginBottom:'6px' }}>O pega la lista manualmente (separados por coma o salto de línea):</div>
            <textarea value={excelInput} onChange={e=>{setExcelInput(e.target.value); setParsedCodes(parseCodesFromText(e.target.value));}} placeholder="101, 102, 201..." rows={3} style={{ width:'100%', padding:'10px 12px', borderRadius: theme.radius.lg, border:`1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, boxSizing:'border-box', background: theme.colors.bgMuted }} />
          </div>

          <div style={{ display:'flex', gap:'10px' }}>
            <Button variant="ghost" fullWidth onClick={()=> setShowUploadModal(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={handleExcelConfirm} disabled={!parseCodesFromText(excelInput).length && !parsedCodes.length}>Cargar y marcar pagados</Button>
          </div>
          <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, textAlign:'center', lineHeight:1.5 }}>
            Se marcarán como <strong>pagados</strong> los departamentos cuyo código coincida. Los no encontrados se ignorarán.
          </div>
        </div>
      </Modal>
      {unidades.map(u=>(
        <div key={u.id} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding:'12px', boxShadow: theme.shadows.card, display:'flex', flexDirection:'column', gap:'6px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:600 }}>{u.codigo} — {u.propietarioAsignado || 'Sin propietario'} {comitePropietarios[u.propietarioEmail] && <span style={{ background:'#DBEAFE', color:'#1E40AF', padding:'1px 6px', borderRadius: theme.radius.full, fontSize:'10px'}}>Comité de Propietarios</span>}</span>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize: theme.fonts.sizes.xs }}>
              <input type="checkbox" checked={!!pagosMantenimiento[u.id]} onChange={e=>marcarPagoMantenimiento(u.id, e.target.checked)} /> Pagado
            </label>
          </div>
          <button onClick={()=> u.propietarioEmail && toggleComite(u.propietarioEmail)} style={{ fontSize: theme.fonts.sizes.xs, background:'none', border:`1px solid ${theme.colors.border}`, borderRadius: theme.radius.full, padding:'4px 10px', cursor:'pointer' }}>
            {comitePropietarios[u.propietarioEmail] ? 'Quitar de Comité' : 'Marcar Comité de Propietarios'}
          </button>
        </div>
      ))}
    </div>
  );
}

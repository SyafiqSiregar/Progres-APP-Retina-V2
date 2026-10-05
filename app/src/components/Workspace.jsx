import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { Printer as CapPrinter } from '@capgo/capacitor-printer';
import { Capacitor } from '@capacitor/core';
import { 
  ChevronLeft, Printer, Check, Loader2, Edit3, Eye, Columns, Plus, Trash2, Upload, 
  Image as ImageIcon, Target, LayoutList, Cable, Box, Wrench, AlertTriangle, FileText, Camera, Users, Building
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function formatTgl(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

const DEFAULT_WBS = [
  { name: '', bobot: 0, target: 0, aktual: 0, status: '' },
  { name: '', bobot: 0, target: 0, aktual: 0, status: '' },
  { name: '', bobot: 0, target: 0, aktual: 0, status: '' }
];

const DEFAULT_INSTALASI_KABEL = [
  { uraian: '', target: 0, realisasi: 0, satuan: 'Titik', status: '' },
  { uraian: '', target: 0, realisasi: 0, satuan: 'Titik', status: '' },
  { uraian: '', target: 0, realisasi: 0, satuan: 'Titik', status: '' }
];

const DEFAULT_INSTALASI_KAMERA = [
  { uraian: '', target: 0, realisasi: 0, satuan: 'Titik', status: '' },
  { uraian: '', target: 0, realisasi: 0, satuan: 'Titik', status: '' },
  { uraian: '', target: 0, realisasi: 0, satuan: 'Titik', status: '' }
];

const DEFAULT_PENGADAAN = [
  { item: '', vol: 0, tiba: 0, pasang: 0, satuan: 'Unit', status: '' },
  { item: '', vol: 0, tiba: 0, pasang: 0, satuan: 'Roll', status: '' },
  { item: '', vol: 0, tiba: 0, pasang: 0, satuan: 'Unit', status: '' }
];

const DEFAULT_ALAT = [
  { item: '', vol: 0, tiba: 0, satuan: 'Set', status: '' },
  { item: '', vol: 0, tiba: 0, satuan: 'Unit', status: '' },
  { item: '', vol: 0, tiba: 0, satuan: 'Unit', status: '' }
];

const DEFAULT_KENDALA = [
  { desc: '', dampak: '', solusi: '', pic: '' },
  { desc: '', dampak: '', solusi: '', pic: '' },
  { desc: '', dampak: '', solusi: '', pic: '' }
];

export default function Workspace({ project, report, onBack }) {
  const [data, setData] = useState({
    ...report,
    wbs: report.wbs?.length ? report.wbs : DEFAULT_WBS,
    instalasiKabel: report.instalasiKabel?.length ? report.instalasiKabel : DEFAULT_INSTALASI_KABEL,
    instalasiKamera: report.instalasiKamera?.length ? report.instalasiKamera : DEFAULT_INSTALASI_KAMERA,
    pengadaan: report.pengadaan?.length ? report.pengadaan : DEFAULT_PENGADAAN,
    alatKerja: report.alatKerja?.length ? report.alatKerja : DEFAULT_ALAT,
    kendala: report.kendala?.length ? report.kendala : DEFAULT_KENDALA,
    catatan: Array.isArray(report.catatan) ? report.catatan : (report.catatan ? [{ text: report.catatan }] : [{ text: '' }]),
    pelaksana: report.pelaksana || '',
    qc: report.qc || '',
  });
  
  const [saving, setSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewMode, setViewMode] = useState('form'); 
  const [zoomLevel, setZoomLevel] = useState('fit');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data?.id) return;
    setSaving(true);
    const t = setTimeout(async () => {
      await db.reports.update(data.id, { ...data, updatedAt: new Date().toISOString() });
      setSaving(false);
    }, 600);
    return () => clearTimeout(t);
  }, [data]);

  const update = useCallback((path, value) => {
    setData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  }, []);

  const updateArr = useCallback((listName, idx, field, value) => {
    setData(prev => {
      const copy = { ...prev };
      copy[listName] = [...(copy[listName] || [])];
      copy[listName][idx] = { ...copy[listName][idx], [field]: value };
      return copy;
    });
  }, []);

  const addItem = useCallback((listName, defaultObj) => {
    setData(prev => ({ ...prev, [listName]: [...(prev[listName] || []), defaultObj] }));
  }, []);

  const removeItem = useCallback((listName, idx) => {
    setData(prev => ({ ...prev, [listName]: prev[listName].filter((_, i) => i !== idx) }));
  }, []);

  const handlePhoto = (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setData(prev => {
        const photos = [...(prev.photos || [])];
        while (photos.length < 12) photos.push(null);
        photos[idx] = { data: ev.target.result, caption: photos[idx]?.caption || '' };
        return { ...prev, photos };
      });
    };
    reader.readAsDataURL(file);
  };
  
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update('logo', ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const activeViewMode = isPrinting ? 'preview' : viewMode;

  const a4Width = 794;
  let currentScale = 1;
  if (zoomLevel === 'fit') {
    const availableWidth = activeViewMode === 'split' ? Math.max(360, (windowWidth - 480) * 0.95) : (windowWidth - 32);
    currentScale = Math.min(1, Math.max(0.38, availableWidth / a4Width));
  } else if (zoomLevel === '75') currentScale = 0.75;

  const wbs = data.wbs || [];
  const summary = data.summary || {};
  const sumWbsBobot = wbs.reduce((acc, w) => acc + (Number(w.bobot)||0), 0);
  const sumWbsTarget = wbs.reduce((acc, w) => acc + (Number(w.target)||0), 0);
  const sumWbsAktual = wbs.reduce((acc, w) => acc + (Number(w.aktual)||0), 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 text-slate-900 print:h-auto print:overflow-visible print:bg-white print:block print:w-full print:m-0 print:p-0">
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 hidden sm:block">
             <h1 className="text-sm font-bold text-slate-900 truncate">{project?.name || data.projectName}</h1>
             <p className="text-[11px] text-slate-500 truncate">{data.docNumber} &bull; Laporan Mingguan</p>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setViewMode('form')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'form' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Edit3 className="w-4 h-4" /> <span className="hidden sm:inline">Input</span></button>
          <button onClick={() => setViewMode('preview')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'preview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Eye className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span></button>
          <button onClick={() => setViewMode('split')} className={`hidden xl:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'split' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Columns className="w-4 h-4" /> <span>Split</span></button>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2">
             {saving ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
             <span className="text-xs font-medium text-slate-500">{saving ? 'Menyimpan...' : 'Tersimpan otomatis'}</span>
          </div>

          {/* STATUS TOGGLE */}
          <button 
            onClick={() => update('status', data.status === 'FINAL' ? 'DRAFT' : 'FINAL')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 border ${
              data.status === 'FINAL' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {data.status === 'FINAL' ? (
              <><Check className="w-4 h-4" /> <span className="hidden sm:inline">Final</span></>
            ) : (
              <><AlertTriangle className="w-4 h-4" /> <span className="hidden sm:inline">Draft</span></>
            )}
          </button>

          <button onClick={() => {
              if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
                setIsPrinting(true);
                setTimeout(() => {
                  CapPrinter.printWebView({ name: `Laporan_${project?.name}` })
                    .catch(() => window.print())
                    .finally(() => setIsPrinting(false));
                }, 100);
              } else {
                window.print();
              }
            }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-bold transition-all shadow-sm active:scale-95">
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Generate PDF</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative print:overflow-visible print:block">
        
        {/* FORM */}
        <div className={`no-print bg-slate-50/50 flex flex-col h-full overflow-y-auto ${activeViewMode === 'split' ? 'w-[520px] shrink-0 border-r border-slate-200' : 'w-full max-w-4xl mx-auto'} ${!(activeViewMode==='form'||activeViewMode==='split') ? 'hidden' : ''}`}>
          <div className="p-4 sm:p-8 space-y-6 pb-32">
            
            <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0 mt-0.5"><FileText className="w-5 h-5"/></div>
              <div>
                <h3 className="font-bold text-sm">Form Laporan Progres Mingguan</h3>
                <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">Silakan lengkapi data proyek mulai dari Identitas hingga Dokumentasi Visual secara berurutan. Perubahan otomatis tersimpan.</p>
              </div>
            </div>

            {/* Step 1 */}
            <Section icon={<Building/>} title="Step 1: Identitas, Periode & Target">
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                   <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      {data.logo ? <img src={data.logo} className="w-full h-full object-contain p-1" /> : <img src="/retina.jpg" className="w-full h-full object-contain p-1 opacity-70" alt="Logo Retina" />}
                   </div>
                   <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Logo Kop Perusahaan</label>
                      <p className="text-[11px] text-slate-500 mb-2">Gunakan logo resolusi tinggi (transparan disarankan)</p>
                      <input type="file" accept="image/*" onChange={handleLogo} className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nama Proyek" value={project?.name || data.projectName} onChange={v=>update('projectName',v)} />
                  <Field label="Nomor Dokumen" value={data.docNumber} onChange={v=>update('docNumber',v)} />
                </div>
                <Field label="Lokasi Pekerjaan" value={project?.location || data.projectLocation} onChange={v=>update('projectLocation',v)} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <Field label="Progres Total (%)" value={summary.progressTotal} onChange={v=>update('summary.progressTotal',v)} type="number" />
                  <Field label="Target Progres (%)" value={summary.progressTarget} onChange={v=>update('summary.progressTarget',v)} type="number" />
                  <Field label="Tanggal Mulai" value={data.startDate} onChange={v=>update('startDate',v)} type="date" />
                  <Field label="Tanggal Selesai" value={data.endDate} onChange={v=>update('endDate',v)} type="date" />
                  <Field label="Closing Off (Status Hari)" value={data.closingOff} onChange={v=>update('closingOff',v)} placeholder="20/27 days" />
                  <Field label="Status Server" value={summary.serverStatus} onChange={v=>update('summary.serverStatus',v)} placeholder="On-Progress" />
                  <Field label="Kamera Selesai Dipasang" value={summary.cameraDone} onChange={v=>update('summary.cameraDone',v)} type="number" />
                  <Field label="Total Target Kamera" value={summary.cameraTotal} onChange={v=>update('summary.cameraTotal',v)} type="number" />
                  <Field label="Penarikan Kabel (Titik)" value={summary.cableDone} onChange={v=>update('summary.cableDone',v)} type="number" />
                  <Field label="Keterangan Server" value={summary.serverNote} onChange={v=>update('summary.serverNote',v)} placeholder="Rak server & switch ready" />
                </div>
              </div>
            </Section>

            {/* Step 2 */}
            <Section icon={<LayoutList/>} title="Step 2: Rincian Progres Pekerjaan (WBS)" action={<AddButton onClick={()=>addItem('wbs', {name:'', bobot:0, target:0, aktual:0, status:'TO DO'})} />}>
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                   <div className="col-span-4">Uraian Pekerjaan</div>
                   <div className="col-span-2">Bobot (%)</div>
                   <div className="col-span-2">Target (%)</div>
                   <div className="col-span-2">Aktual (%)</div>
                   <div className="col-span-2">Status</div>
                </div>
                {wbs.map((w,i)=>(
                  <div key={i} className="flex flex-col md:grid md:grid-cols-12 gap-2 bg-slate-50 border border-slate-200 p-3 md:p-1.5 rounded-xl md:rounded-lg">
                    <div className="col-span-4"><Input value={w.name} onChange={e=>updateArr('wbs',i,'name',e.target.value)} placeholder="Nama Pekerjaan"/></div>
                    <div className="col-span-2 flex items-center gap-2"><span className="text-xs md:hidden font-bold w-16 shrink-0">Bobot</span><Input type="number" value={w.bobot} onChange={e=>updateArr('wbs',i,'bobot',e.target.value)}/></div>
                    <div className="col-span-2 flex items-center gap-2"><span className="text-xs md:hidden font-bold w-16 shrink-0">Target</span><Input type="number" value={w.target} onChange={e=>updateArr('wbs',i,'target',e.target.value)}/></div>
                    <div className="col-span-2 flex items-center gap-2"><span className="text-xs md:hidden font-bold w-16 shrink-0">Aktual</span><Input type="number" value={w.aktual} onChange={e=>updateArr('wbs',i,'aktual',e.target.value)}/></div>
                    <div className="col-span-2 flex gap-2">
                       <Select value={w.status} onChange={e=>updateArr('wbs',i,'status',e.target.value)}>
                          <option value="TO DO">To Do</option>
                          <option value="IN PROGRESS">In Progress</option>
                          <option value="UNDER REVIEW">Under Review</option>
                          <option value="REVISION NEEDED">Revision Needed</option>
                          <option value="REWORK">Rework</option>
                          <option value="COMPLETED">Completed</option>
                       </Select>
                       <DeleteButton onClick={()=>removeItem('wbs', i)}/>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Step 3 */}
            <Section icon={<Cable/>} title="Step 3: Status Instalasi">
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">A. Instalasi Kabel</h4>
                  <AddButton label="Tambah" onClick={()=>addItem('instalasiKabel', {uraian:'', target:0, realisasi:0, satuan:'Titik', status:''})} />
                </div>
                <div className="space-y-2">
                  {(data.instalasiKabel || []).map((w,i)=>(
                     <div key={'kab'+i} className="flex flex-col md:flex-row gap-2 md:items-center bg-slate-50 border border-slate-200 p-3 md:p-1.5 rounded-xl md:rounded-lg">
                       <div className="w-full md:flex-1"><Input value={w.uraian} onChange={e=>updateArr('instalasiKabel',i,'uraian',e.target.value)} placeholder="Lokasi (Lantai 1)"/></div>
                       <div className="flex gap-2">
                         <div className="flex-1 md:w-16"><Input type="number" value={w.target} onChange={e=>updateArr('instalasiKabel',i,'target',e.target.value)} placeholder="Target" title="Target"/></div>
                         <div className="flex-1 md:w-16"><Input type="number" value={w.realisasi} onChange={e=>updateArr('instalasiKabel',i,'realisasi',e.target.value)} placeholder="Realisasi" title="Realisasi"/></div>
                       </div>
                       <div className="flex gap-2 items-center">
                         <div className="flex-1 md:w-32">
                           <Select value={w.status} onChange={e=>updateArr('instalasiKabel',i,'status',e.target.value)}>
                              <option value="TO DO">To Do</option>
                              <option value="IN PROGRESS">In Progress</option>
                              <option value="UNDER REVIEW">Under Review</option>
                              <option value="REVISION NEEDED">Revision Needed</option>
                              <option value="REWORK">Rework</option>
                              <option value="COMPLETED">Completed</option>
                           </Select>
                         </div>
                         <DeleteButton onClick={()=>removeItem('instalasiKabel', i)}/>
                       </div>
                     </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">B. Instalasi Kamera</h4>
                  <AddButton label="Tambah" onClick={()=>addItem('instalasiKamera', {uraian:'', target:0, realisasi:0, satuan:'Titik', status:''})} />
                </div>
                <div className="space-y-2">
                  {(data.instalasiKamera || []).map((w,i)=>(
                     <div key={'kam'+i} className="flex flex-col md:flex-row gap-2 md:items-center bg-slate-50 border border-slate-200 p-3 md:p-1.5 rounded-xl md:rounded-lg">
                       <div className="w-full md:flex-1"><Input value={w.uraian} onChange={e=>updateArr('instalasiKamera',i,'uraian',e.target.value)} placeholder="Lokasi (Lantai 1)"/></div>
                       <div className="flex gap-2">
                         <div className="flex-1 md:w-16"><Input type="number" value={w.target} onChange={e=>updateArr('instalasiKamera',i,'target',e.target.value)} placeholder="Target" title="Target"/></div>
                         <div className="flex-1 md:w-16"><Input type="number" value={w.realisasi} onChange={e=>updateArr('instalasiKamera',i,'realisasi',e.target.value)} placeholder="Realisasi" title="Realisasi"/></div>
                       </div>
                       <div className="flex gap-2 items-center">
                         <div className="flex-1 md:w-32">
                           <Select value={w.status} onChange={e=>updateArr('instalasiKamera',i,'status',e.target.value)}>
                              <option value="TO DO">To Do</option>
                              <option value="IN PROGRESS">In Progress</option>
                              <option value="UNDER REVIEW">Under Review</option>
                              <option value="REVISION NEEDED">Revision Needed</option>
                              <option value="REWORK">Rework</option>
                              <option value="COMPLETED">Completed</option>
                           </Select>
                         </div>
                         <DeleteButton onClick={()=>removeItem('instalasiKamera', i)}/>
                       </div>
                     </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Step 4 */}
            <Section icon={<Box/>} title="Step 4: Status Pengadaan dan Material" action={<AddButton onClick={()=>addItem('pengadaan', {item:'', vol:0, tiba:0, pasang:0, satuan:'Unit', status:''})} />}>
              <div className="space-y-2">
                <div className="hidden md:flex gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                   <div className="flex-1">Material / Perangkat</div>
                   <div className="w-16 text-center">Vol</div>
                   <div className="w-16 text-center">Tiba</div>
                   <div className="w-16 text-center">Pasang</div>
                   <div className="w-20 text-center">Satuan</div>
                   <div className="w-32 pl-1">Status</div>
                   <div className="w-8"></div>
                </div>
                {(data.pengadaan || []).map((w,i)=>(
                   <div key={'peng'+i} className="flex flex-col md:flex-row gap-2 bg-slate-50 border border-slate-200 p-3 md:p-1.5 rounded-xl md:rounded-lg">
                     <div className="flex-1"><Input value={w.item} onChange={e=>updateArr('pengadaan',i,'item',e.target.value)} placeholder="Nama Material"/></div>
                     <div className="flex gap-2">
                       <div className="flex-1 md:w-16"><Input type="number" value={w.vol} onChange={e=>updateArr('pengadaan',i,'vol',e.target.value)} placeholder="Vol"/></div>
                       <div className="flex-1 md:w-16"><Input type="number" value={w.tiba} onChange={e=>updateArr('pengadaan',i,'tiba',e.target.value)} placeholder="Tiba"/></div>
                       <div className="flex-1 md:w-16"><Input type="number" value={w.pasang} onChange={e=>updateArr('pengadaan',i,'pasang',e.target.value)} placeholder="Pasang"/></div>
                     </div>
                     <div className="flex gap-2">
                       <div className="w-20 shrink-0"><Input value={w.satuan} onChange={e=>updateArr('pengadaan',i,'satuan',e.target.value)} placeholder="Unit/Roll"/></div>
                       <div className="flex-1 md:w-32">
                         <Select value={w.status} onChange={e=>updateArr('pengadaan',i,'status',e.target.value)}>
                            <option value="">Status...</option>
                            <option value="PARTIAL INSTALLED">PARTIAL INSTALLED</option>
                            <option value="READY AT THE OFFICE">READY AT THE OFFICE</option>
                            <option value="INSTALLED">INSTALLED</option>
                         </Select>
                       </div>
                       <DeleteButton onClick={()=>removeItem('pengadaan', i)}/>
                     </div>
                   </div>
                ))}
              </div>
            </Section>

            {/* Step 5 */}
            <Section icon={<Wrench/>} title="Step 5: Daftar Alat Kerja" action={<AddButton onClick={()=>addItem('alatKerja', {item:'', vol:0, tiba:0, satuan:'Set', status:'ON SITE'})} />}>
              <div className="space-y-2">
                <div className="hidden md:flex gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                   <div className="flex-1">Nama Alat</div>
                   <div className="w-20 text-center">Vol</div>
                   <div className="w-20 text-center">Tiba</div>
                   <div className="w-24 text-center">Satuan</div>
                   <div className="w-36 pl-1">Status</div>
                   <div className="w-8"></div>
                </div>
                {(data.alatKerja || []).map((w,i)=>(
                   <div key={'alat'+i} className="flex flex-col md:flex-row gap-2 bg-slate-50 border border-slate-200 p-3 md:p-1.5 rounded-xl md:rounded-lg">
                     <div className="flex-1"><Input value={w.item} onChange={e=>updateArr('alatKerja',i,'item',e.target.value)} placeholder="Bor Impact & Obeng"/></div>
                     <div className="flex gap-2">
                       <div className="flex-1 md:w-20"><Input type="number" value={w.vol} onChange={e=>updateArr('alatKerja',i,'vol',e.target.value)} placeholder="Vol"/></div>
                       <div className="flex-1 md:w-20"><Input type="number" value={w.tiba} onChange={e=>updateArr('alatKerja',i,'tiba',e.target.value)} placeholder="Tiba"/></div>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex-1 md:w-24"><Input value={w.satuan} onChange={e=>updateArr('alatKerja',i,'satuan',e.target.value)} placeholder="Satuan"/></div>
                       <div className="flex-1 md:w-36">
                         <Select value={w.status} onChange={e=>updateArr('alatKerja',i,'status',e.target.value)}>
                            <option value="">Status...</option>
                            <option value="ON SITE">ON SITE</option>
                            <option value="NO">NO</option>
                         </Select>
                       </div>
                       <DeleteButton onClick={()=>removeItem('alatKerja', i)}/>
                     </div>
                   </div>
                ))}
              </div>
            </Section>

            {/* Step 6 */}
            <Section icon={<AlertTriangle/>} title="Step 6: Kendala & Risiko" action={<AddButton onClick={()=>addItem('kendala', {desc:'', dampak:'', solusi:'', pic:''})} />}>
              <div className="space-y-3">
                {(data.kendala || []).map((w,i)=>(
                   <div key={'kend'+i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                     <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><DeleteButton onClick={()=>removeItem('kendala', i)}/></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 pr-8">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Deskripsi Kendala</label>
                          <Input value={w.desc} onChange={e=>updateArr('kendala',i,'desc',e.target.value)} placeholder="Jelaskan masalah di lapangan"/>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Dampak</label>
                          <Input value={w.dampak} onChange={e=>updateArr('kendala',i,'dampak',e.target.value)} placeholder="Dampak terhadap jadwal/progres"/>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Tindakan Koreksi</label>
                          <Input value={w.solusi} onChange={e=>updateArr('kendala',i,'solusi',e.target.value)} placeholder="Solusi yang dilakukan"/>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">PIC / Penanggung Jawab</label>
                          <Input value={w.pic} onChange={e=>updateArr('kendala',i,'pic',e.target.value)} placeholder="Nama Teknisi/Tim"/>
                        </div>
                     </div>
                   </div>
                ))}
              </div>
            </Section>

            {/* Step 7 */}
            <Section icon={<FileText/>} title="Step 7: Catatan Umum" action={<AddButton onClick={()=>addItem('catatan', {text:''})} />}>
              <div className="space-y-3">
                {(Array.isArray(data.catatan) ? data.catatan : [{text: data.catatan}]).map((c, i) => (
                  <div key={'cat'+i} className="flex gap-2">
                     <textarea 
                       rows={2} 
                       className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-y" 
                       value={c.text} 
                       onChange={e => updateArr('catatan', i, 'text', e.target.value)}
                       placeholder="Tambahkan catatan khusus untuk laporan ini..."
                     />
                     <div className="pt-2"><DeleteButton onClick={()=>removeItem('catatan', i)}/></div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Step 8 */}
            <Section icon={<Camera/>} title="Step 8: Dokumentasi Foto (Maksimal 8)">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({length:8}).map((_,i)=>(
                  <div key={i} className="group border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-2xl relative h-32 flex flex-col items-center justify-center overflow-hidden transition-all">
                     {(data.photos||[])[i]?.data ? (
                       <>
                         <img src={data.photos[i].data} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={()=>{const c=[...(data.photos||[])];c[i]=null;update('photos',c)}} className="bg-white/90 text-red-600 p-2 rounded-full hover:scale-110 hover:bg-white transition-all shadow-lg">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                         </div>
                       </>
                     ) : (
                       <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-slate-400 hover:text-blue-600 transition-colors">
                          <Upload className="w-6 h-6 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Upload Foto {i+1}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e=>handlePhoto(i,e)}/>
                       </label>
                     )}
                  </div>
                ))}
              </div>
            </Section>

            {/* Step 10 */}
            <Section icon={<Users/>} title="Step 10: Pelaksana & QC">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Field label="Pelaksana (Admin Project)" value={data.pelaksana} onChange={v=>update('pelaksana',v)} placeholder="Nama Pelaksana"/>
                 <Field label="QC Engineer" value={data.qc} onChange={v=>update('qc',v)} placeholder="Nama QC"/>
              </div>
            </Section>

          </div>
        </div>

        {/* PDF VIEW */}
        <div className={`flex-1 overflow-y-auto bg-slate-200 p-4 sm:p-8 flex flex-col items-center relative print:overflow-visible print:block print:p-0 print:bg-white print:w-full print:m-0 ${!(activeViewMode==='preview'||activeViewMode==='split') ? 'hidden print:block' : 'flex'}`}>
           <div className="no-print sticky top-4 z-20 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-3 mb-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Zoom:</span>
            <button onClick={() => setZoomLevel('fit')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${zoomLevel === 'fit' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>Fit</button>
            <button onClick={() => setZoomLevel('100')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${zoomLevel === '100' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>100%</button>
          </div>

          <div style={{'--scale-val': isPrinting ? 1 : currentScale, transformOrigin: 'top center', marginBottom: `${(1 - (isPrinting ? 1 : currentScale)) * -600}px`}} className="flex flex-col items-center pdf-scale-wrapper print:scale-100 print:transform-none print:m-0 w-full">
             
             {/* PAGE 1 */}
             <div className="w-[794px] min-h-[1123px] bg-white border border-slate-300 p-[40px_50px] mb-8 text-[11px] font-sans text-slate-800 shadow-xl print:shadow-none print:border-none print:m-0 print:p-[0_15mm]">
               
               {/* HEADER */}
               <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-6 font-bold uppercase">
                  <div className="flex items-center gap-4">
                    {data.logo ? (
                      <img src={data.logo} className="max-h-14 max-w-[140px] object-contain" alt="Logo" />
                    ) : (
                      <img src="/retina.jpg" className="max-h-14 max-w-[140px] object-contain" alt="Logo Retina CCTV" />
                    )}
                    <div>
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1">LAPORAN PROGRES</h1>
                      <h2 className="text-xs font-semibold text-slate-500 tracking-widest">PROYEK INSTALASI {project?.type || 'IP CCTV'}</h2>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] text-slate-500 mb-0.5 tracking-wider">NOMOR DOKUMEN</span>
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{data.docNumber || 'RC/CCTV/2026/001'}</span>
                  </div>
               </div>
               
               {/* PROJECT INFO */}
               <div className="flex justify-between bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                 <div>
                   <div className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nama Proyek</div>
                   <div className="uppercase text-xs font-bold text-slate-900">{project?.name || data.projectName || 'RSIA BUNDA MENTENG'}</div>
                 </div>
                 <div className="text-right">
                   <div className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Lokasi Pekerjaan</div>
                   <div className="text-xs font-bold text-slate-900">{project?.location || data.projectLocation || 'Jl.Teuku Cik Ditiro No.28'}</div>
                 </div>
               </div>

               {/* STEP 1: RINGKASAN */}
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">1 Ringkasan Eksekutif Progres Proyek</p>
               </div>
               
               <div className="flex gap-3 mb-6 h-16">
                 <div className="bg-white border border-slate-200 border-l-[3px] border-l-blue-600 p-2.5 flex-1 flex flex-col justify-between rounded shadow-sm">
                   <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Progres Total</div>
                   <div className="text-lg font-black text-slate-900 leading-none">{summary.progressTotal || 0}%</div>
                   <div className="text-[7px] text-slate-500 font-semibold">Target: {summary.progressTarget || 0}% (Deviasi: {(summary.progressTotal || 0) - (summary.progressTarget || 0)}%)</div>
                 </div>
                 <div className="bg-white border border-slate-200 border-l-[3px] border-l-emerald-500 p-2.5 flex-1 flex flex-col justify-between rounded shadow-sm">
                   <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Kamera Terpasang</div>
                   <div className="text-lg font-black text-slate-900 leading-none">{summary.cameraDone || 0}<span className="text-xs text-slate-400">/{summary.cameraTotal || 0}</span></div>
                   <div className="text-[7px] text-slate-500 font-semibold">Unit Fisik mounting</div>
                 </div>
                 <div className="bg-white border border-slate-200 border-l-[3px] border-l-sky-500 p-2.5 flex-1 flex flex-col justify-between rounded shadow-sm">
                   <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Penarikan Kabel</div>
                   <div className="text-lg font-black text-slate-900 leading-none">{summary.cableDone || 0} <span className="text-[9px] text-slate-400">Titik</span></div>
                   <div className="text-[7px] text-slate-500 font-semibold">Dari Total {summary.cableTotal || 0} Titik</div>
                 </div>
                 <div className="bg-white border border-slate-200 border-l-[3px] border-l-amber-500 p-2.5 flex-1 flex flex-col justify-between rounded shadow-sm">
                   <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Instalasi Server</div>
                   <div className="text-xs font-black text-slate-900 leading-tight truncate">{summary.serverStatus || '-'}</div>
                   <div className="text-[7px] text-slate-500 font-semibold truncate">{summary.serverNote || 'Rak & switch'}</div>
                 </div>
                 <div className="bg-slate-900 p-2.5 flex-1 flex flex-col justify-between rounded shadow-sm">
                   <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Closing Off</div>
                   <div className="text-xs font-black text-white leading-tight">{data.closingOff || '-'}</div>
                   <div className="text-[7px] text-slate-400 font-semibold">Mulai: {formatTgl(data.startDate)}</div>
                 </div>
               </div>

               {/* STEP 2: WBS */}
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">2 Rincian Progres Bobot Pekerjaan (WBS)</p>
               </div>
               <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                 <table className="w-full text-[9px] text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider">
                       <th className="py-2 px-3 border-b border-slate-200">Uraian Pekerjaan</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Bobot</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Target</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Aktual</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Deviasi</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {wbs.map((w,i)=>{
                       const dev = (Number(w.aktual) - Number(w.target)).toFixed(0);
                       return <tr key={i} className="hover:bg-slate-50">
                         <td className="py-1.5 px-3 font-semibold text-slate-800">{w.name}</td>
                         <td className="py-1.5 px-3 text-center text-slate-600">{w.bobot}%</td>
                         <td className="py-1.5 px-3 text-center text-slate-600">{w.target}%</td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.aktual}%</td>
                         <td className={`py-1.5 px-3 text-center font-bold ${dev < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{dev > 0 ? '+'+dev : dev}%</td>
                         <td className="py-1.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${(w.status==='IN PROGRESS' || w.status==='REWORK')?'bg-blue-100 text-blue-700': (w.status==='UNDER REVIEW' || w.status==='REVISION NEEDED')?'bg-amber-100 text-amber-700': w.status==='COMPLETED'?'bg-emerald-100 text-emerald-700': 'bg-slate-100 text-slate-700'}`}>{w.status}</span>
                         </td>
                       </tr>
                     })}
                     <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                       <td className="py-2 px-3">TOTAL KESELURUHAN</td>
                       <td className="py-2 px-3 text-center">{sumWbsBobot}%</td>
                       <td className="py-2 px-3 text-center">{sumWbsTarget}%</td>
                       <td className="py-2 px-3 text-center text-blue-700">{sumWbsAktual}%</td>
                       <td className="py-2 px-3 text-center">{(sumWbsAktual-sumWbsTarget).toFixed(0)}%</td>
                       <td className="py-2 px-3 text-center"></td>
                     </tr>
                   </tbody>
                 </table>
               </div>

               {/* STEP 3: INSTALASI */}
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">3 Status Instalasi</p>
               </div>
               <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                 <table className="w-full text-[9px] text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider">
                       <th className="py-2 px-3 border-b border-slate-200">Uraian Pekerjaan</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Target</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Realisasi</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Satuan</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     <tr className="bg-slate-50"><td colSpan={5} className="font-black text-slate-800 px-3 py-1.5 border-b border-slate-200">A. Instalasi Kabel UTP</td></tr>
                     {(data.instalasiKabel || []).map((w,i)=>(
                        <tr key={'ik'+i} className="hover:bg-slate-50">
                         <td className="py-1.5 px-3 font-semibold text-slate-700">{w.uraian}</td>
                         <td className="py-1.5 px-3 text-center text-slate-600">{w.target||0}</td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.realisasi||0}</td>
                         <td className="py-1.5 px-3 text-center text-slate-500">{w.satuan}</td>
                         <td className="py-1.5 px-3 text-center">
                           <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${(w.status==='IN PROGRESS' || w.status==='REWORK')?'bg-blue-100 text-blue-700': (w.status==='UNDER REVIEW' || w.status==='REVISION NEEDED')?'bg-amber-100 text-amber-700': w.status==='COMPLETED'?'bg-emerald-100 text-emerald-700': 'bg-slate-100 text-slate-700'}`}>{w.status}</span>
                         </td>
                       </tr>
                     ))}
                     <tr className="bg-slate-50"><td colSpan={5} className="font-black text-slate-800 px-3 py-1.5 border-y border-slate-200">B. Instalasi Camera CCTV</td></tr>
                     {(data.instalasiKamera || []).map((w,i)=>(
                        <tr key={'ikm'+i} className="hover:bg-slate-50">
                         <td className="py-1.5 px-3 font-semibold text-slate-700">{w.uraian}</td>
                         <td className="py-1.5 px-3 text-center text-slate-600">{w.target||0}</td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.realisasi||0}</td>
                         <td className="py-1.5 px-3 text-center text-slate-500">{w.satuan}</td>
                         <td className="py-1.5 px-3 text-center">
                           <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${(w.status==='IN PROGRESS' || w.status==='REWORK')?'bg-blue-100 text-blue-700': (w.status==='UNDER REVIEW' || w.status==='REVISION NEEDED')?'bg-amber-100 text-amber-700': w.status==='COMPLETED'?'bg-emerald-100 text-emerald-700': 'bg-slate-100 text-slate-700'}`}>{w.status}</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* STEP 4: PENGADAAN */}
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">4 Status Pengadaan dan Material</p>
               </div>
               <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                 <table className="w-full text-[9px] text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider">
                       <th className="py-2 px-3 border-b border-slate-200">Item Material / Perangkat</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Total Vol</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Tiba di Site</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Terpasang</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Status Material</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {(data.pengadaan || []).map((w,i)=>(
                        <tr key={'p'+i} className="hover:bg-slate-50">
                         <td className="py-1.5 px-3 font-semibold text-slate-800">{w.item}</td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.vol} <span className="text-slate-400 font-normal">{w.satuan}</span></td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.tiba} <span className="text-slate-400 font-normal">{w.satuan}</span></td>
                         <td className="py-1.5 px-3 text-center font-bold text-blue-700">{w.pasang} <span className="text-slate-400 font-normal">{w.satuan}</span></td>
                         <td className="py-1.5 px-3 text-center">
                           <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${w.status==='READY AT THE OFFICE'?'bg-sky-100 text-sky-700': w.status==='INSTALLED'?'bg-emerald-100 text-emerald-700': w.status==='PARTIAL INSTALLED'?'bg-slate-100 text-slate-700':'text-slate-600'}`}>{w.status}</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* STEP 5: ALAT KERJA */}
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">5 Daftar Alat Kerja</p>
               </div>
               <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                 <table className="w-full text-[9px] text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider">
                       <th className="py-2 px-3 border-b border-slate-200">Item Material</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Total Vol</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Tiba di Site</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">Status Material</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {(data.alatKerja || []).map((w,i)=>(
                        <tr key={'a'+i} className="hover:bg-slate-50">
                         <td className="py-1.5 px-3 font-semibold text-slate-800">{w.item}</td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.vol} <span className="text-slate-400 font-normal">{w.satuan}</span></td>
                         <td className="py-1.5 px-3 text-center font-bold text-slate-900">{w.tiba} <span className="text-slate-400 font-normal">{w.satuan}</span></td>
                         <td className="py-1.5 px-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${w.status==='ON SITE'?'bg-blue-100 text-blue-700': w.status==='NO'?'bg-rose-100 text-rose-700':'text-slate-600'}`}>{w.status}</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* STEP 6: KENDALA */}
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">6 Log Kendala, Risiko & Tindakan Koreksi</p>
               </div>
               <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
                 <table className="w-full text-[9px] text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase tracking-wider">
                       <th className="py-2 px-3 border-b border-slate-200 w-1/3">Deskripsi Kendala / Masalah</th>
                       <th className="py-2 px-3 border-b border-slate-200 w-1/4">Dampak</th>
                       <th className="py-2 px-3 border-b border-slate-200 w-1/4">Tindakan Koreksi / Solusi</th>
                       <th className="py-2 px-3 border-b border-slate-200 text-center">PIC / Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {(data.kendala || []).map((w,i)=>(
                        <tr key={'k'+i} className="align-top hover:bg-slate-50">
                         <td className="py-2 px-3 font-semibold text-slate-800"><span className="text-slate-400 mr-1">{i+1}.</span>{w.desc}</td>
                         <td className="py-2 px-3 text-slate-600">{w.dampak}</td>
                         <td className="py-2 px-3 text-slate-600">{w.solusi}</td>
                         <td className="py-2 px-3 text-center font-bold text-slate-800">{w.pic}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

             </div>
             
             {/* PAGE 2 */}
             <div className="w-[794px] min-h-[1123px] bg-white border border-slate-300 p-[40px_50px] text-[11px] font-sans text-slate-800 shadow-xl print:shadow-none print:border-none print:m-0 print:p-[0_15mm]" style={{pageBreakBefore:'always'}}>
                
                {/* STEP 8: CATATAN */}
                <div className="flex items-center gap-2 mb-3">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">8 Catatan / Note</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 text-[10px] text-slate-700 leading-relaxed min-h-[60px]">
                  {Array.isArray(data.catatan) && data.catatan.some(c => c.text.trim()) 
                    ? <ul className="list-inside list-disc space-y-1.5">{data.catatan.map((c,i)=> c.text.trim() ? <li key={i}>{c.text}</li> : null)}</ul>
                    : <span className="text-slate-400 italic">Tidak ada catatan tambahan.</span>
                  }
                </div>
                
                {/* STEP 9: PELAKSANA */}
                <div className="flex items-center gap-2 mb-4">
                 <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                 <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">9 Pelaksana</p>
                </div>
                <div className="flex justify-between w-full px-16 mt-20 mb-12 text-[10px] text-center">
                  <div className="flex flex-col items-center">
                    <p className="font-bold text-slate-900 border-b-2 border-slate-300 pb-2 px-6 mb-1 min-w-[140px] uppercase tracking-wider">{data.pelaksana}</p>
                    <p className="text-slate-500 font-semibold">Admin Project</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="font-bold text-slate-900 border-b-2 border-slate-300 pb-2 px-6 mb-1 min-w-[140px] uppercase tracking-wider">{data.qc}</p>
                    <p className="text-slate-500 font-semibold">QC Engineer</p>
                  </div>
                </div>

                {/* STEP 10: DOKUMENTASI */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                    <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900">10 Dokumentasi Visual Pekerjaan</p>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold italic">* Foto dokumentasi progres</p>
                </div>
                
                <div className="grid grid-cols-4 gap-4 justify-items-center">
                   {Array.from({length:8}).map((_,i)=>(
                     (data.photos||[])[i]?.data ? (
                       <div key={i} className="w-[160px] h-[210px] border border-slate-200 bg-slate-50 p-1.5 rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
                          <img src={data.photos[i].data} className="w-full h-full object-cover rounded" alt={`Dokumentasi ${i+1}`} />
                       </div>
                     ) : null
                   ))}
                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ----- UI UX PRO MAX UPGRADED COMPONENTS -----

function Section({ icon, title, action, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
           <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-700">
             {icon}
           </div>
           <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
    </div>
  );
}

function Input(props) {
  return (
    <input {...props} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" />
  );
}

function Select(props) {
  return (
    <select {...props} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none cursor-pointer">
      {props.children}
    </select>
  );
}

function AddButton({ label = "Tambah Item", onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors">
       <Plus className="w-3.5 h-3.5" />
       <span>{label}</span>
    </button>
  );
}

function DeleteButton({ onClick }) {
  return (
    <button onClick={onClick} className="p-2 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Hapus">
       <Trash2 className="w-4 h-4" />
    </button>
  );
}

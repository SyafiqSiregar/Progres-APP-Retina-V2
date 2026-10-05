import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  LayoutDashboard,
  FolderClosed,
  FileText,
  Archive,
  Plus,
  Search,
  X,
  MapPin,
  Clock,
  ChevronRight,
  Trash2,
  Video,
  Wrench,
  AlertTriangle,
  FileSpreadsheet,
  FolderPlus,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';

const PROJECT_TYPES = [
  { value: 'INSTALASI', label: 'Instalasi' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'SURVEY', label: 'Survey' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { value: 'SERVICE', label: 'Service' },
];

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

function timeAgo(isoStr) {
  if (!isoStr) return '-';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

function isDraftStale(report) {
  if (report.status !== 'DRAFT') return false;
  const lastUpdate = new Date(report.updatedAt || report.createdAt).getTime();
  return (Date.now() - lastUpdate) > STALE_THRESHOLD_MS;
}

export default function Dashboard({ onOpenReport }) {
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray());
  const reports = useLiveQuery(() => db.reports.orderBy('updatedAt').reverse().toArray());

  const [activeNav, setActiveNav] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'INSTALASI', location: '' });
  const [formErrors, setFormErrors] = useState({ name: '', location: '' });
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Hapus',
    isDestructive: true,
    onConfirm: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reportFilter, setReportFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmDialog.isOpen) {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } else if (showForm) {
          setShowForm(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, confirmDialog.isOpen]);

  if (projects === undefined || reports === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Memuat Workspace</h2>
        <p className="text-sm text-slate-500">Menyiapkan data proyek dan laporan Anda...</p>
      </div>
    );
  }

  const allProjects = projects || [];
  const allReports = reports || [];

  const filteredProjects = allProjects.filter(p => {
    if (typeFilter !== 'ALL' && p.type !== typeFilter.toUpperCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q);
    }
    return true;
  });

  const draftReports = allReports.filter(r => r.status === 'DRAFT');
  const staleDrafts = draftReports.filter(isDraftStale);
  const finalReports = allReports.filter(r => r.status === 'FINAL');

  let filteredReportsList = allReports;
  if (activeNav === 'dashboard' && reportFilter !== 'ALL') {
    filteredReportsList = allReports.filter(r => r.status === reportFilter);
  } else if (activeNav === 'archives') {
    filteredReportsList = finalReports;
  }

  if (dateFrom) {
    filteredReportsList = filteredReportsList.filter(r => {
      const d = (r.updatedAt || r.createdAt || '').split('T')[0];
      return d >= dateFrom;
    });
  }
  if (dateTo) {
    filteredReportsList = filteredReportsList.filter(r => {
      const d = (r.updatedAt || r.createdAt || '').split('T')[0];
      return d <= dateTo;
    });
  }
  
  const dashboardReportsList = activeNav === 'dashboard' ? filteredReportsList.slice(0, 6) : filteredReportsList;

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = 'Nama proyek wajib diisi';
    if (!form.location.trim()) errors.location = 'Lokasi pekerjaan wajib diisi';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await db.projects.add({
        name: form.name.trim().toUpperCase(),
        type: form.type,
        location: form.location.trim(),
        createdAt: new Date().toISOString(),
      });
      setForm({ name: '', type: 'INSTALASI', location: '' });
      setFormErrors({ name: '', location: '' });
      setShowForm(false);
      showToast('Proyek baru berhasil disimpan.');
    } catch (error) {
      showToast('Gagal menyimpan proyek: ' + error.message, 'error');
    }
  };

  const handleNewReport = async (project) => {
    const projectReports = allReports.filter(r => r.projectId === project.id);
    const seq = projectReports.length + 1;
    const year = new Date().getFullYear();
    const globalCount = allReports.length + 1;
    const docNumber = `WPR/CCTV/${year}/${String(globalCount).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const reportId = await db.reports.add({
      projectId: project.id,
      projectName: project.name,
      projectLocation: project.location,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      docNumber: docNumber,
      period: `Minggu Ke-${seq}`,
      startDate: today,
      endDate: today,
      weekNumber: seq,
      summary: {
        progressTotal: 0,
        progressTarget: 0,
        cameraDone: 0,
        cameraTotal: 0,
        cableDone: 0,
        cableTotal: 0,
        serverStatus: '',
        serverNote: ''
      }
    });

    const newReport = await db.reports.get(reportId);
    onOpenReport(project, newReport);
  };

  const handleDeleteProject = (id, projectName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Proyek',
      message: `Hapus proyek "${projectName}" beserta seluruh riwayat laporannya? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus Proyek',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await db.projects.delete(id);
          const projectReports = allReports.filter(r => r.projectId === id);
          for (const r of projectReports) {
            await db.reports.delete(r.id);
          }
          showToast(`Proyek "${projectName}" berhasil dihapus.`);
        } catch (err) {
          showToast('Gagal menghapus proyek: ' + err.message, 'error');
        }
      }
    });
  };

  const handleExportDB = async () => {
    try {
      const allProj = await db.projects.toArray();
      const allRep = await db.reports.toArray();
      const payload = {
        version: '2.5',
        exportedAt: new Date().toISOString(),
        projects: allProj,
        reports: allRep,
      };
      
      const jsonStr = JSON.stringify(payload, null, 2);
      const fileName = `progresapp-backup-${new Date().toISOString().split('T')[0]}.json`;

      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Backup ProgresApp',
          text: 'File backup database ProgresApp',
          url: result.uri,
          dialogTitle: 'Simpan Backup Ke...'
        });
        showToast('Menu bagikan berhasil dibuka.');
      } else {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast('File backup database berhasil diekspor.');
      }
    } catch (err) {
      showToast('Gagal mengekspor data: ' + err.message, 'error');
    }
  };

  const handleImportDB = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.projects || !data.reports) {
        showToast('Format file backup JSON tidak valid.', 'error');
        return;
      }
      setConfirmDialog({
        isOpen: true,
        title: 'Pulihkan Data Cadangan',
        message: `Pulihkan ${data.projects.length} proyek dan ${data.reports.length} laporan dari file backup? Data akan digabungkan ke database lokal Anda.`,
        confirmLabel: 'Pulihkan Data',
        isDestructive: false,
        onConfirm: async () => {
          try {
            await db.transaction('rw', db.projects, db.reports, async () => {
              for (const p of data.projects) {
                const exists = await db.projects.get(p.id);
                if (!exists) await db.projects.add(p);
              }
              for (const r of data.reports) {
                const exists = await db.reports.get(r.id);
                if (!exists) await db.reports.add(r);
              }
            });
            showToast('Data cadangan berhasil dipulihkan.');
          } catch (err) {
            showToast('Gagal memulihkan database: ' + err.message, 'error');
          }
        }
      });
    } catch (err) {
      showToast('Gagal membaca file: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const getProjectIcon = (type) => {
    switch (type) {
      case 'MAINTENANCE':
        return <Wrench className="w-5 h-5 text-amber-600" />;
      case 'SURVEY':
        return <Search className="w-5 h-5 text-indigo-600" />;
      case 'TROUBLESHOOTING':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      default:
        return <Video className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row antialiased">
      
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-screen sticky top-0 z-30">
        
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img 
              src="/retina.jpg" 
              alt="Logo Retina CCTV" 
              className="w-10 h-10 object-cover rounded-xl shrink-0 shadow-sm border border-slate-200"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 text-base tracking-tight">ProgresApp</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">RETINA</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Manajemen Laporan Lapangan</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveNav('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeNav === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => setActiveNav('projects')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeNav === 'projects'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderClosed className="w-4 h-4" />
              <span>Proyek Aktif</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {allProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('reports')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeNav === 'reports'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>Semua Laporan</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {allReports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('archives')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeNav === 'archives'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Archive className="w-4 h-4" />
              <span>Arsip Final</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {finalReports.length}
            </span>
          </button>

          <div className="pt-4 pb-2">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Proyek Baru</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-3 mt-1 space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-1">Kelola Data</p>
            <button
              onClick={handleExportDB}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Backup Data</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Pulihkan Data</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportDB}
              className="hidden"
              aria-label="Pilih file backup JSON"
            />
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-bold text-slate-700">Versi 2.5</span>
            <span className="font-medium">IndexedDB Lokal</span>
          </div>
          <div className="text-[10px] text-slate-400">
            System by SysDev
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10">
        
        {/* ================= UNIFIED TOPBAR ================= */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all duration-200">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 lg:hidden">
              <img 
                src="/retina.jpg" 
                alt="Logo Retina CCTV" 
                className="w-8 h-8 rounded-lg shrink-0 shadow-sm border border-slate-200 object-cover"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 text-sm leading-tight tracking-tight">ProgresApp</h1>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">RETINA</span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block">Sistem Laporan CCTV</p>
              </div>
            </div>

            {/* Desktop titles (hidden on mobile) */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {activeNav === 'dashboard' && 'Dashboard Operasional'}
                {activeNav === 'projects' && 'Daftar Proyek'}
                {activeNav === 'reports' && 'Seluruh Laporan'}
                {activeNav === 'archives' && 'Arsip Laporan Final'}
              </h2>
              <p className="text-xs text-slate-500">Pemantauan progres dan dokumentasi teknis instalasi CCTV</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari proyek atau lokasi..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 transition outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="sm:hidden flex items-center justify-center w-10 h-10 bg-blue-700 text-white rounded-lg shrink-0 hover:bg-blue-800 transition shadow-sm"
              aria-label="Proyek Baru"
            >
              <Plus className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold shrink-0 hover:bg-blue-800 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Proyek Baru</span>
            </button>
          </div>
        </header>

        {/* ================= PAGE BODY ================= */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Dashboard Summary Metrics */}
          {activeNav === 'dashboard' && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Proyek</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{allProjects.length}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Aktif
                  </span>
                </div>
              </div>

              <div className="surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-600">Draft Berjalan</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{draftReports.length}</span>
                  {staleDrafts.length > 0 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {staleDrafts.length} Tertunda
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Pengerjaan
                    </span>
                  )}
                </div>
              </div>

              <div className="surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-600">Laporan Final</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{finalReports.length}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Selesai
                  </span>
                </div>
              </div>

              <div className="surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Laporan</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{allReports.length}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Tersimpan
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ================= PROYEK AKTIF SECTION ================= */}
          {(activeNav === 'dashboard' || activeNav === 'projects') && (
            <section className="space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Daftar Proyek</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {filteredProjects.length}
                  </span>
                </div>

                {/* Filter Pekerjaan */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'INSTALASI', 'MAINTENANCE', 'SURVEY', 'TROUBLESHOOTING', 'SERVICE'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                        typeFilter === type
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {type === 'ALL' ? 'Semua Kategori' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Cards Grid */}
              {filteredProjects.length === 0 ? (
                <div
                  onClick={() => setShowForm(true)}
                  className="surface-card surface-card-hover rounded-xl p-8 text-center cursor-pointer border-dashed border-2 border-slate-300 flex flex-col items-center justify-center min-h-[180px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Belum Ada Proyek</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    {searchQuery
                      ? 'Tidak ada proyek yang sesuai dengan kata kunci pencarian.'
                      : 'Klik di sini untuk membuat proyek baru dan mulai mencatat laporan instalasi.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => {
                    const projectReports = allReports.filter((r) => r.projectId === project.id);
                    const drafts = projectReports.filter((r) => r.status === 'DRAFT');

                    return (
                      <div
                        key={project.id}
                        className="surface-card surface-card-hover rounded-xl p-5 flex flex-col justify-between"
                      >
                        <div>
                          {/* Header card */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                {getProjectIcon(project.type)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                                  {project.name}
                                </h4>
                                <div className="flex items-center gap-1 text-slate-600 text-xs mt-0.5 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{project.location}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase shrink-0">
                              {project.type}
                            </span>
                          </div>

                          {/* Report Status Counter */}
                          <div className="mt-4 flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-600">
                              {projectReports.length} Laporan
                            </span>
                            {drafts.length > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                                {drafts.length} Draft Aktif
                              </span>
                            )}
                            {drafts.filter(isDraftStale).length > 0 && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200 flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {drafts.filter(isDraftStale).length} Tertunda
                              </span>
                            )}
                          </div>

                          {/* Recent reports list inside project */}
                          <div className="mt-3 space-y-2">
                            {projectReports.slice(0, 2).map((r) => (
                              <div
                                key={r.id}
                                onClick={() => onOpenReport(project, r)}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">
                                    {r.period || `Minggu Ke-${r.weekNumber || 1}`}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">
                                    {r.docNumber}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isDraftStale(r) && (
                                    <span className="text-[9px] font-bold text-rose-600 flex items-center gap-0.5" title="Belum diperbarui selama 7+ hari">
                                      <AlertCircle className="w-3 h-3" />
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      r.status === 'FINAL'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isDraftStale(r)
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {r.status}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer Card Actions */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Proyek"
                            aria-label={`Hapus proyek ${project.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleNewReport(project)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buat Laporan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ================= LAPORAN AKTIVITAS / ARSIP ================= */}
          {(activeNav === 'dashboard' || activeNav === 'reports' || activeNav === 'archives') && (
            <section className="space-y-4 pt-4">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {activeNav === 'archives' ? 'Arsip Laporan Final' : 'Laporan Terbaru'}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {dashboardReportsList.length}
                    </span>
                  </div>

                  {activeNav === 'dashboard' && (
                    <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
                      <button
                        onClick={() => setReportFilter('ALL')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          reportFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setReportFilter('DRAFT')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          reportFilter === 'DRAFT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Draft
                      </button>
                      <button
                        onClick={() => setReportFilter('FINAL')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          reportFilter === 'FINAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Final
                      </button>
                    </div>
                  )}
                </div>

                {(activeNav === 'reports' || activeNav === 'archives') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">Periode:</span>
                    </div>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:border-blue-600 outline-none transition"
                      aria-label="Tanggal mulai"
                    />
                    <span className="text-xs text-slate-400">s/d</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:border-blue-600 outline-none transition"
                      aria-label="Tanggal akhir"
                    />
                    {(dateFrom || dateTo) && (
                      <button
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>

              {dashboardReportsList.length === 0 ? (
                <div className="surface-card rounded-xl p-8 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">
                    {activeNav === 'archives' ? 'Belum Ada Laporan Final' : 'Belum Ada Laporan'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {activeNav === 'archives'
                      ? 'Laporan yang berstatus FINAL akan otomatis terarsip di sini.'
                      : 'Pilih salah satu proyek di atas untuk membuat laporan mingguan baru.'}
                  </p>
                </div>
              ) : (
                <div className="surface-card rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">No. Dokumen</th>
                          <th className="py-3 px-4">Proyek & Lokasi</th>
                          <th className="py-3 px-4">Periode</th>
                          <th className="py-3 px-4">Progres</th>
                          <th className="py-3 px-4">Terakhir Diubah</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dashboardReportsList.map((report) => {
                          const proj = allProjects.find((p) => p.id === report.projectId);
                          const progressVal = report.summary?.progressTotal || 0;

                          return (
                            <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-[11px]">
                                {report.docNumber}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {proj?.name || report.projectName || 'Proyek Terhapus'}
                                </p>
                                <p className="text-slate-500 text-[11px] truncate max-w-[200px]">
                                  {proj?.location || report.projectLocation || '-'}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700">
                                {report.period || `Minggu Ke-${report.weekNumber || 1}`}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2 max-w-[130px]">
                                  <span className="font-bold text-slate-800 w-8">{progressVal}%</span>
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full rounded-full"
                                      style={{ width: `${Math.min(progressVal, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 text-[11px] flex items-center gap-1 pt-4">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{timeAgo(report.updatedAt)}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      report.status === 'FINAL'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : isDraftStale(report)
                                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {report.status}
                                  </span>
                                  {isDraftStale(report) && (
                                    <span className="text-rose-600" title="Belum diperbarui >7 hari">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => onOpenReport(proj, report)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs inline-flex items-center gap-1 transition"
                                >
                                  <span>Buka</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

        </main>

        {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-1 shadow-lg">
          <button
            onClick={() => setActiveNav('dashboard')}
            className={`flex-1 py-2 flex flex-col items-center justify-center min-h-[44px] ${
              activeNav === 'dashboard' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveNav('projects')}
            className={`flex-1 py-2 flex flex-col items-center justify-center min-h-[44px] ${
              activeNav === 'projects' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <FolderClosed className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Proyek</span>
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="flex flex-col items-center justify-center p-2 text-white bg-blue-700 rounded-xl -mt-5 shadow-md border-2 border-white w-12 h-12"
            aria-label="Tambah Proyek Baru"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveNav('reports')}
            className={`flex-1 py-2 flex flex-col items-center justify-center min-h-[44px] ${
              activeNav === 'reports' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Laporan</span>
          </button>

          <button
            onClick={() => setActiveNav('archives')}
            className={`flex-1 py-2 flex flex-col items-center justify-center min-h-[44px] ${
              activeNav === 'archives' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Archive className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Arsip</span>
          </button>
        </nav>

        {/* ================= MODAL TAMBAH PROYEK ================= */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 id="modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Tambah Proyek Baru
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Proyek <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="project-name"
                    required
                    autoFocus
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="Contoh: RSUD KOTA BEKASI GEDUNG B"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none transition ${
                      formErrors.name
                        ? 'border-rose-500 focus:border-rose-600 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="project-location" className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Pekerjaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="project-location"
                    required
                    value={form.location}
                    onChange={(e) => {
                      setForm({ ...form, location: e.target.value });
                      if (formErrors.location) setFormErrors(prev => ({ ...prev, location: '' }));
                    }}
                    placeholder="Contoh: Jl. Pramuka No. 12, Bekasi"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none transition ${
                      formErrors.location
                        ? 'border-rose-500 focus:border-rose-600 ring-2 ring-rose-500/20'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  {formErrors.location && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.location}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="project-type" className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Pekerjaan
                  </label>
                  <select
                    id="project-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-blue-600 outline-none transition"
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-bold transition min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg text-white bg-blue-700 hover:bg-blue-800 text-xs sm:text-sm font-bold transition shadow-xs min-h-[44px]"
                  >
                    Simpan Proyek
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= CONFIRMATION MODAL ================= */}
        {confirmDialog.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 border border-slate-200">
              <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-5">
                {confirmDialog.message}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition min-h-[40px]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    if (action) await action();
                  }}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition min-h-[40px] shadow-xs ${
                    confirmDialog.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TOAST NOTIFICATION ================= */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-20 lg:bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2 transition-all ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        )}

      </div>
    </div>
  );
}

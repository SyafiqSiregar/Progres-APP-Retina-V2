<div align="center">
  <img src="./LogoRetina.webp" alt="Progres APP Retina Logo" height="120" />
  <h1>Progres APP Retina V2 🚀</h1>
  <p>Sistem Aplikasi Pelaporan dan Generator Laporan Modern</p>
  
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  </p>
</div>

<br />

## ✨ Fitur Utama

- 📊 **Generator Laporan Otomatis**: Menghasilkan laporan lengkap berformat HTML & PDF (termasuk modul CCTV).
- 📱 **Dukungan Mobile**: Aplikasi Android yang dibuild dengan Capacitor (`SysDev_App_v2.apk`).
- 🎨 **Antarmuka Modern (UI/UX)**: Dibangun dengan React dan Tailwind CSS untuk memberikan user experience terbaik yang responsif di segala perangkat.
- ⚡ **Kinerja Optimal**: Menggunakan Vite untuk waktu *build* dan *hot-module replacement* yang super cepat.

## 📂 Struktur Proyek

```text
📁 Progres-APP-Retina-V2
├── 📁 app/               # Root folder aplikasi React (Vite)
│   ├── 📁 android/       # Konfigurasi dan build Android (Capacitor)
│   ├── 📁 src/           # Source code utama aplikasi (Komponen, DB, CSS)
│   └── 📄 package.json   # Dependensi aplikasi web
├── 📄 Generator_*.html   # File generator laporan standalone
├── 📄 *.pdf              # Template & file laporan
└── 📄 LogoRetina.webp    # Aset Logo Aplikasi
```

## 🚀 Memulai (Getting Started)

### Prasyarat
Pastikan Anda telah menginstal **Node.js** (versi 16 atau yang lebih baru).

### Instalasi

1. Clone repositori ini:
   ```bash
   git clone https://github.com/SyafiqSiregar/Progres-APP-Retina-V2.git
   ```
2. Masuk ke direktori aplikasi:
   ```bash
   cd Progres-APP-Retina-V2/app
   ```
3. Instal semua dependencies:
   ```bash
   npm install
   ```

### Menjalankan Server Development

Untuk menjalankan aplikasi pada mode development:
```bash
npm run dev
```

### Build Aplikasi

Untuk menghasilkan file *production-ready*:
```bash
npm run build
```

## 📱 Build untuk Android

Aplikasi ini menggunakan [Capacitor](https://capacitorjs.com/) untuk export ke Android.
```bash
cd app
npm run build
npx cap sync
npx cap open android
```

---
<div align="center">
  Dibuat oleh SysDev
</div>

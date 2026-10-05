<div align="center">
  <img src="./LogoRetina.webp" alt="Progres APP Retina Logo" height="150" />
  <h1>Progres APP Retina V2 🚀</h1>
  <p><strong>Sistem Aplikasi Pelaporan & Generator Laporan Modern</strong></p>
  
  <p>
    <a href="#-tech-stack"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="#-tech-stack"><img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" /></a>
    <a href="#-tech-stack"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="#-tech-stack"><img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" /></a>
  </p>
  
  <p>
    <em>Aplikasi pelaporan terintegrasi untuk desktop dan perangkat Android, memudahkan operasional dan pembuatan laporan (Lengkap, CCTV) dengan antarmuka dinamis dan responsif.</em>
  </p>
</div>

<hr />

<details open>
  <summary><b>📑 Daftar Isi (Interactive TOC)</b></summary>
  <ol>
    <li><a href="#-tentang-proyek">Tentang Proyek</a></li>
    <li><a href="#-fitur-unggulan">Fitur Unggulan</a></li>
    <li><a href="#-struktur-direktori">Struktur Direktori</a></li>
    <li><a href="#-tech-stack">Tech Stack</a></li>
    <li><a href="#-panduan-instalasi--penggunaan">Panduan Instalasi & Penggunaan</a></li>
    <li><a href="#-generator-laporan">Generator Laporan</a></li>
    <li><a href="#-build-android">Build Android</a></li>
    <li><a href="#-faq">FAQ</a></li>
  </ol>
</details>

---

## 🎯 Tentang Proyek

**Progres APP Retina V2** adalah sistem manajemen progres dan generator laporan otomatis. Sistem ini ditujukan untuk mempermudah alur kerja administrasi melalui dua pendekatan utama:
1. **Aplikasi Web / Android:** Antarmuka (dashboard/workspace) yang kuat untuk merekap data harian.
2. **Generator Standalone:** Alat *one-click* (berbasis HTML) yang dapat mengubah data menjadi laporan berformat dokumen PDF.

---

## ✨ Fitur Unggulan

| Fitur | Deskripsi |
| :--- | :--- |
| 📊 **Laporan Otomatis** | Export laporan lengkap & CCTV langsung ke format PDF dengan template yang rapi. |
| 📱 **Cross-Platform Mobile** | Dapat digunakan langsung dari *browser* maupun dibuild menjadi aplikasi Android (APK). |
| ⚡ **Vite-Powered Speed** | Pengembangan dengan Vite memberikan *Hot Module Replacement (HMR)* instan. |
| 🎨 **UI/UX Modern** | Dibangun dengan kaidah *pro-max* UI/UX (TailwindCSS) menghasilkan komponen yang bersih dan interaktif. |
| 📁 **Manajemen Berkas** | Terintegrasi dengan dokumen `Buku_Panduan_SysDev.pdf` & `Template.pdf` sebagai rujukan. |

---

## 📂 Struktur Direktori

<details>
<summary><b>Klik untuk melihat penjelasan struktur direktori lengkap</b></summary>

```text
📁 Progres-APP-Retina-V2
├── 📁 app/                      # 🚀 Root folder aplikasi React utama
│   ├── 📁 android/              # 📱 Kode native Android (Capacitor)
│   ├── 📁 src/                  # 💻 Source code React (Komponen, State, CSS)
│   │   ├── 📁 components/       # Komponen UI (Dashboard, Workspace, dll)
│   │   └── 📄 db.js             # Konfigurasi data lokal
│   ├── 📄 package.json          # Dependency Node.js
│   └── 📄 tailwind.config.js    # Konfigurasi desain sistem (Tailwind)
├── 📄 Generator_Laporan_Lengkap.html # 📄 Standalone Generator Laporan (Utama)
├── 📄 Generator_Laporan_CCTV.html    # 📹 Standalone Generator CCTV
├── 📄 Buku_Panduan_SysDev.pdf   # 📖 Manual/Buku Panduan
└── 📄 LogoRetina.webp           # 🖼️ Logo Aplikasi
```
</details>

---

## 🛠 Tech Stack

- **Frontend:** [React.js](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Mobile Wrapper:** [Capacitor by Ionic](https://capacitorjs.com/)

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Persiapan Lingkungan (Prerequisites)
Pastikan Anda memiliki **Node.js** (Minimal versi v16) dan **Git**.

### 2. Instalasi
Salin dan jalankan perintah berikut pada terminal Anda:

```bash
# Clone repositori
git clone https://github.com/SyafiqSiregar/Progres-APP-Retina-V2.git

# Masuk ke direktori web aplikasi
cd Progres-APP-Retina-V2/app

# Install dependency paket
npm install
```

### 3. Menjalankan Mode Development
Untuk mulai melakukan pengembangan secara langsung (live-preview):
```bash
npm run dev
```
> **Tip:** Buka `http://localhost:5173` pada browser Anda untuk melihat aplikasi.

---

## 📄 Generator Laporan

Proyek ini tidak hanya berisi web aplikasi, tetapi menyertakan utilitas generator berbasis HTML murni.
Anda cukup membuka file ini langsung menggunakan Browser pilihan Anda (Chrome/Edge):
- 🔗 `Generator_Laporan_Lengkap.html` - Generator laporan proyek menyeluruh.
- 🔗 `Generator_Laporan_CCTV.html` - Generator khusus laporan modul kamera CCTV.

---

## 📱 Build Android

Aplikasi ini menggunakan **Capacitor** yang membuat integrasi ke Native Android sangat mudah.

<details>
<summary><b>Langkah-langkah Generate file APK</b></summary>

1. **Build aplikasi untuk produksi:**
   ```bash
   cd app
   npm run build
   ```
2. **Sinkronisasi file ke platform Android:**
   ```bash
   npx cap sync
   ```
3. **Buka project di Android Studio:**
   ```bash
   npx cap open android
   ```
4. Dari *Android Studio*, Anda dapat klik tombol **Build > Build Bundle(s) / APK(s) > Build APK(s)** untuk membuat aplikasi yang siap didistribusikan.
</details>

---

## ❓ FAQ (Frequently Asked Questions)

<details>
<summary><b>Bagaimana cara mengubah desain / warna tema?</b></summary>
A: Anda bisa memodifikasi file <code>app/tailwind.config.js</code> atau <code>app/src/index.css</code>. Seluruh styling dibuat menggunakan <i>utility classes</i> dari Tailwind.
</details>

<details>
<summary><b>Di mana database diatur?</b></summary>
A: Aplikasi ini mengambil data dari <code>app/src/db.js</code> sebagai <i>mock</i> database sementara di sisi klien.
</details>

<br/>

<div align="center">
  <sub>Dibangun dengan ketelitian & ❤️ oleh <b>SysDev</b></sub>
</div>

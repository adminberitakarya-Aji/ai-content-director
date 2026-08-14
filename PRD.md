# PRD — AI Content Production Director V1

## 1. Ringkasan

AI Content Production Director (ACPD) adalah sistem yang mengubah ide mentah (teks dan/atau gambar) menjadi paket produksi konten visual yang lengkap dan konsisten: karakter, lokasi, properti, gaya visual, adegan, storyboard, prompt gambar, dan prompt video yang saling terhubung.

Sistem bertindak sebagai *sutradara produksi berbasis AI*, bukan sekadar generator prompt. Fondasi alurnya:

```
Project → Story → Bible → Character → Scene → Storyboard → Prompt → Continuity → Generation
```

Model AI generatif (Seedance, Veo, Kling, Wan, Runway, dst) diposisikan sebagai *mesin yang dapat diganti* di ujung pipeline — bukan pusat sistem. Cerita dan struktur produksi adalah pusatnya.

## 2. Masalah yang Diselesaikan

Kreator yang ingin membuat konten visual berbasis AI (film pendek, dokumenter, vlog, UGC, iklan, animasi, anime, dst) menghadapi masalah:

- **Inkonsistensi visual** — karakter/lokasi/gaya berubah-ubah antar shot karena tidak ada sumber kebenaran tunggal (single source of truth) yang diacu tiap kali generate.
- **Beban prompt engineering** — kreator harus tahu cara menulis prompt yang cocok untuk tiap model AI, padahal tiap model (Seedance, Veo, Kling, dll) punya gaya dan parameter berbeda.
- **Tidak ada struktur produksi** — ide mentah sulit diterjemahkan langsung menjadi urutan scene, shot, dan aset yang siap dieksekusi.
- **Vendor lock-in kreatif** — alur kerja yang dibangun di sekitar satu model generatif tertentu sulit dipindah ke model lain saat ada model baru yang lebih baik/murah.

## 3. Tujuan Produk

1. Mengubah input bebas (teks, gambar, atau kombinasi) menjadi struktur produksi lengkap: Character/Location/Prop/Style Bible, Scene, Storyboard, Image Prompt, Video Prompt.
2. Menjaga konsistensi lintas elemen produksi — perubahan pada satu bagian (mis. wardrobe karakter) terdeteksi dan tervalidasi terhadap seluruh proyek melalui Continuity Engine.
3. Mendukung banyak jenis konten (film, dokumenter, vlog, UGC, iklan, music video, live action, animasi, kartun, anime, social video) dengan aturan produksi yang sesuai per jenis.
4. Memisahkan logic produksi dari model generatif — model AI dapat ditambah/diganti tanpa mengubah struktur Story/Bible/Scene.
5. Memberi kontrol biaya — estimasi dan pembatasan biaya sebelum job generation (gambar/video) dieksekusi ke model berbayar.

## 4. Target Pengguna

Kreator konten dan tim produksi kecil-menengah yang memproduksi konten visual berbasis AI secara berulang (serial, kampanye multi-episode, konten media sosial rutin) dan butuh konsistensi karakter/gaya di banyak output — bukan pengguna sekali pakai untuk gambar tunggal.

## 5. Lingkup (Scope) V1

### Termasuk (In Scope)
- Manajemen Project, Story, dan empat jenis Bible (Character, Location, Prop, Style) dengan versioning.
- Scene Engine: input scene terstruktur (karakter, lokasi, prop, waktu, aksi, emosi, dialog).
- Storyboard Engine: shot list dengan shot type, framing, composition, camera, blocking.
- Image Prompt Engine dan Video Prompt Engine yang menyusun prompt dari kombinasi Scene + Bible + Style, disesuaikan per model tujuan (Generation Adapter).
- Continuity Engine: validasi otomatis (berbasis relasi data dan/atau kemiripan visual) terhadap Bible saat Scene/Shot berubah.
- Content Adapter untuk menyesuaikan aturan produksi per jenis konten (film, dokumenter, vlog, UGC, dst).
- Generation Adapter untuk V1: **Flux** (image generation) dan **Seedance** (video generation, image-to-video), dengan interface yang siap menambah adapter lain (Veo, Kling, Wan, Runway) di fase berikutnya.
- Review/approval gate di titik kritis (Bible final, Storyboard final, sebelum submit Generation Job).
- Budget guard: estimasi biaya sebelum submit Generation Job berbayar.
- Dashboard web untuk mengelola seluruh alur di atas.

### Tidak Termasuk (Out of Scope untuk V1)
- Eksekusi rendering/editing video pasca-generation (color grading, editing timeline penuh).
- Distribusi/publishing otomatis ke platform (YouTube, TikTok, dst).
- Kolaborasi real-time multi-user dalam satu Scene/Storyboard (multi-editor concurrent editing).
- Fine-tuning atau training model generatif sendiri.
- Adapter untuk seluruh model generatif sekaligus — cukup fondasi interface + 1-2 adapter aktif.

## 6. Alur Pengguna Utama (User Flow)

1. Pengguna membuat **Project** baru — menentukan identitas, jenis konten, genre, tone, audiens, platform, durasi, aspect ratio.
2. Pengguna mendefinisikan **Story** — konsep, premis, sinopsis, struktur cerita, timeline, arahan kreatif.
3. Sistem membantu menyusun **Bible** (Character/Location/Prop/Style) dari input teks dan/atau gambar referensi yang diberikan pengguna.
4. Pengguna membangun **Scene** yang mereferensikan entitas dari Bible.
5. Sistem menyusun **Storyboard** (shot list) dari tiap Scene.
6. Sistem mengompilasi **Image Prompt** / **Video Prompt** per shot, memakai Bible + Style sebagai konteks, disesuaikan format model tujuan.
7. **Continuity Engine** memvalidasi konsistensi sebelum shot masuk ke tahap generation; flag ditampilkan ke pengguna jika ada pelanggaran.
8. Sistem menghitung estimasi biaya (**Budget Guard**) — pengguna menyetujui sebelum job dikirim ke **Generation Adapter** (model AI eksternal).
9. Hasil generation masuk ke tahap **Review** — pengguna approve/reject; jika reject, dapat memicu revisi Bible/Scene/Prompt.

## 7. Kebutuhan Fungsional Utama

| Area | Kebutuhan |
|---|---|
| Bible | CRUD dengan versioning per entitas (Character/Location/Prop/Style); riwayat perubahan tidak ditimpa |
| Scene | Referensi ke Bible by ID (bukan nama bebas), agar continuity check dapat query relasi |
| Storyboard | Shot berelasi ke Scene induk; field wajib shot type, framing, camera, blocking |
| Continuity | Deteksi otomatis saat entitas Bible berubah tapi Scene/Shot terkait belum divalidasi ulang |
| Prompt Engine | Compile prompt berbeda untuk tiap model tujuan (bukan satu prompt generik untuk semua) |
| Budget | Estimasi biaya per Generation Job sebelum submit; guard terhadap limit project |
| Review | Status draft → review → approved per tahap (Bible, Storyboard, Generation Job) |

## 8. Kebutuhan Non-Fungsional

- **Konsistensi sebagai prioritas utama** — Bible dan Continuity harus berupa data terstruktur di database, bukan bergantung pada memory konteks LLM.
- **Modularitas model generatif** — menambah model AI baru tidak boleh mengubah logic Story/Bible/Scene.
- **Auditability** — setiap Generation Job tercatat dengan versi prompt dan Bible yang dipakai, agar hasil dapat ditelusuri ulang.
- **Kontrol biaya** — tidak ada job generation (image maupun video) yang dieksekusi tanpa estimasi biaya terlebih dahulu; ini adalah gate wajib, bukan fitur opsional.

## 9. Metrik Keberhasilan (indikatif, untuk didiskusikan lebih lanjut)

- Tingkat pelanggaran continuity yang terdeteksi otomatis sebelum generation (bukan ditemukan manual setelah hasil jadi).
- Waktu dari ide mentah ke shot list siap generate.
- Jumlah model generatif yang bisa ditambahkan tanpa mengubah kode inti pipeline produksi.

## 10. Keputusan Final (Terkunci)

### 10.1 Continuity Scoring — Pendekatan Dua Lapis, Bertahap

```
Continuity Score = Data Consistency + Visual Similarity
```

- **Lapis 1 — Data Consistency (wajib, aktif di V1):** validasi berbasis relasi data terstruktur — Character ID, Wardrobe, Location ID, Prop ID, Time, Scene relationship, Style. Sistem harus benar secara logika dulu: A01 tetap A01, wardrobe yang sama tetap sama, L01 tetap lokasi yang sama, O01 tetap properti yang sama.
- **Lapis 2 — Visual Similarity (opsional, dapat diaktifkan belakangan):** image embedding similarity — Character reference similarity, Location similarity, Generated result similarity. Ditambahkan setelah pipeline Lapis 1 terbukti stabil, berfungsi sebagai pemeriksaan visual tambahan, bukan sumber kebenaran utama.

Alasan: menghindari kompleksitas sistem embedding sebelum production workflow inti (Data Consistency) terbukti benar.

### 10.2 Generation Adapter V1

- **Image generation → Flux**
- **Video generation → Seedance** (image-to-video, menyambung langsung dari output Flux)
- Adapter lain (Veo, Kling, Wan, Runway) menyusul di fase berikutnya, memakai interface adapter yang sama.

### 10.3 Budget Guard — Wajib, Sumber Harga Internal

- Estimasi biaya **wajib** ditampilkan dan disetujui pengguna sebelum **setiap** Generation Job — baik image (Flux) maupun video (Seedance) — dikirim ke adapter. Tidak ada job yang boleh submit tanpa melewati estimasi ini.
- Sumber harga (rate per generation/per detik/per resolusi, dsb) dikelola **internal** — disimpan sebagai data terkelola sistem (bukan fetch live dari API pricing provider) di V1.
- Rate disimpan di tabel `AdapterPricingRate`, dapat diedit lewat dashboard admin sederhana tanpa deploy ulang kode. Diupdate manual oleh pemilik akses admin (tidak perlu approval berlapis di V1).

### 10.4 Kompatibilitas Flux → Seedance

- Normalisasi format/resolusi output Flux menjadi tanggung jawab **adapter Seedance** (`generation-adapters/seedance/`), bukan Image Prompt Engine. Flux tetap generate sesuai aspect ratio project; adapter Seedance yang resize/crop sesuai spesifikasi Seedance sebelum submit sebagai image-to-video input.

### 10.5 Aktivasi Lapis 2 Continuity (Visual Similarity)

- Diaktifkan sebagai **feature flag manual** — dinyalakan kapan pun dianggap siap, bukan berdasarkan metrik otomatis. Tidak ada kriteria pengaktifan otomatis di V1.

## 11. Risiko & Pertanyaan Terbuka

Tidak ada open item tersisa dari diskusi awal. Item baru akan ditambahkan di sini jika muncul saat implementasi.
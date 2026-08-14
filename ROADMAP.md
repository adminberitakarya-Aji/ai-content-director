# ROADMAP — AI Content Production Director V1

Dokumen ini memecah pembangunan sistem menjadi fase berurutan. Setiap fase dibangun di atas fase sebelumnya dan sebisa mungkin menghasilkan sesuatu yang bisa diuji end-to-end, bukan menumpuk kode tanpa validasi. Untuk detail keputusan teknis, lihat `PRD.md` dan `CLAUDE.md`. Breakdown task per fase ada di `IMPLEMENTATION_PLAN.md`.

## Prinsip Urutan

1. Fondasi data (Bible) dibangun sebelum apa pun yang bergantung padanya (Scene, Storyboard, Prompt) — karena semua modul lain mereferensikan Bible by ID.
2. Continuity Lapis 1 (Data Consistency) dibangun bersamaan dengan Scene/Storyboard, bukan ditunda — karena ini bagian dari kebenaran logika inti, bukan fitur tambahan.
3. Budget Guard dan satu Generation Adapter (Flux) harus ada sebelum Video Prompt Engine dan Seedance dikerjakan — supaya pola "estimasi biaya sebelum submit" sudah teruji dengan job yang lebih murah/sederhana (image) sebelum dipakai untuk job yang lebih mahal (video).
4. Review/approval gate menyertai tiap fase yang menghasilkan output produksi (Bible, Storyboard, Generation Job) — bukan ditambahkan belakangan sebagai fase terpisah.
5. Adapter tambahan (Veo, Kling, Wan, Runway) dan Continuity Lapis 2 (Visual Similarity) sengaja diletakkan di fase paling akhir — keduanya bersifat ekspansi, bukan fondasi V1.

## Fase 0 — Setup Proyek

- Inisialisasi monorepo (Turborepo + pnpm), struktur folder sesuai `CLAUDE.md`.
- Setup `prisma/schema.prisma` awal (skema kosong/minimal) dan koneksi database.
- Setup `packages/schema` (Zod/TS types dasar), `packages/config` (eslint, tsconfig shared).
- Setup `apps/api` (NestJS skeleton), `apps/web` (Next.js skeleton), `apps/ai-service` (Python skeleton).
- **Output**: repo bisa di-`turbo dev` tanpa error, ketiga app kosong bisa saling terhubung (health check).

## Fase 1 — Bible System (Fondasi)

- Module `project`, `story` — CRUD dasar.
- Module `bible/character`, `bible/location`, `bible/prop`, `bible/style` — CRUD dengan **versioning** (perubahan tidak menimpa data lama).
- Input dari teks dan/atau gambar referensi (sesuai `INPUT USER` di knowledge base) untuk tiap jenis Bible.
- Dashboard web dasar: buat Project, isi Story, buat/edit tiap jenis Bible.
- Review gate: status draft → review → approved untuk tiap entitas Bible.
- **Output**: pengguna bisa membuat Project lengkap dengan Character/Location/Prop/Style Bible tersimpan sebagai data terstruktur dan approved.

## Fase 2 — Scene Engine + Continuity Lapis 1

- Module `scene` — input scene terstruktur (karakter, lokasi, prop, waktu, aksi, emosi, dialog), **mereferensikan Bible by ID**.
- Module `continuity` — implementasi Lapis 1 (Data Consistency): validasi Character ID, Wardrobe, Location ID, Prop ID, Time, Scene relationship, Style terhadap Bible.
- Continuity check berjalan otomatis saat Scene dibuat/diubah, dan saat Bible terkait berubah.
- Dashboard web: builder Scene, tampilan flag continuity violation.
- **Output**: Scene dapat dibuat dari Bible yang sudah ada, dan sistem mendeteksi otomatis jika Scene mereferensikan data yang tidak konsisten (mis. wardrobe berbeda dari Bible).

## Fase 3 — Storyboard Engine

- Module `storyboard` — shot list per Scene: shot type, framing, composition, camera position, lens, camera movement, character blocking, visual beat.
- Continuity check diperluas ke level Shot (bukan hanya Scene).
- Dashboard web: storyboard builder per Scene.
- **Output**: tiap Scene dapat dipecah menjadi shot list terstruktur dan siap dikompilasi jadi prompt.

## Fase 4 — Image Prompt Engine + Budget Guard + Adapter Flux

- Module `image-prompt` — compile prompt dari Scene + Shot + Bible + Style, disesuaikan format Flux.
- Package `generation-adapters/flux/` — implementasi adapter pertama, mengimplementasikan `base-generation-adapter.interface.ts`.
- Module `budget` — tabel `AdapterPricingRate` (rate internal), estimasi biaya wajib sebelum submit Generation Job.
- Module `capability` — toggle Image Generation per project.
- Dashboard web: preview image prompt, tampilan estimasi biaya, tombol approve sebelum submit.
- **Output**: end-to-end pertama kali — dari Shot ke image prompt ke estimasi biaya ke generation via Flux ke hasil gambar tersimpan sebagai `GenerationJob`.

## Fase 5 — Video Prompt Engine + Adapter Seedance

- Module `video-prompt` — compile prompt video dari Scene + Shot + Bible + Style: action, character motion, camera motion, environment motion, physics, temporal logic.
- Package `generation-adapters/seedance/` — adapter kedua, termasuk normalisasi format/resolusi dari output Flux sebagai input image-to-video.
- Budget Guard diperluas untuk job video (rate berbeda dari image).
- **Output**: pipeline lengkap Shot → Image Prompt → Flux → hasil gambar → Video Prompt → Seedance → hasil video, dengan estimasi biaya di tiap submit.

## Fase 6 — Review Workflow Menyeluruh + Content Adapter

- Module `review` — approval gate menyeluruh: Bible final, Storyboard final, Generation Job (image dan video).
- Package `content-adapters/` — implementasi aturan produksi per jenis konten (mulai dari 2-3 jenis konten prioritas, bukan seluruh 12 sekaligus — misalnya `short-film`, `ugc`, `social-video` dulu, sisanya menyusul).
- Dashboard web: halaman review terpusat, filter berdasarkan status.
- **Output**: alur produksi penuh dari ide sampai hasil generation dapat direview dan disetujui/ditolak, dengan aturan produksi yang menyesuaikan jenis konten.

## Fase 7 — Ekspansi (Pasca-V1)

- Continuity Lapis 2 (Visual Similarity) — diaktifkan sebagai feature flag manual, implementasi `continuity_scoring` embedding di `ai-service`.
- Adapter generatif tambahan: Veo, Kling, Wan, Runway — menyusul sesuai prioritas kebutuhan produksi.
- Jenis konten yang belum di-cover di Fase 6 (film, dokumenter, iklan, music video, live action, animasi, kartun, anime) ditambahkan bertahap.
- Dashboard admin untuk update `AdapterPricingRate` (jika belum dikerjakan di Fase 4).

## Ringkasan Urutan

```
Fase 0  Setup Proyek
Fase 1  Bible System
Fase 2  Scene Engine + Continuity Lapis 1
Fase 3  Storyboard Engine
Fase 4  Image Prompt Engine + Budget Guard + Adapter Flux
Fase 5  Video Prompt Engine + Adapter Seedance
Fase 6  Review Workflow Menyeluruh + Content Adapter (sebagian)
Fase 7  Ekspansi: Continuity Lapis 2, adapter tambahan, sisa content adapter
```

## Catatan

- Roadmap ini tidak mencantumkan estimasi waktu per fase — durasi aktual tergantung kapasitas kerja dan akan diisi terpisah bila diperlukan (mis. di `IMPLEMENTATION_PLAN.md` atau tracker terpisah).
- Urutan Fase 4 sebelum Fase 5 (image sebelum video) sengaja, bukan kebetulan — lihat Prinsip Urutan poin 3 di atas.
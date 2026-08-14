# IMPLEMENTATION PLAN — AI Content Production Director V1

Breakdown task per fase, turunan langsung dari `ROADMAP.md`. Setiap task ditulis dalam bentuk checklist agar bisa langsung dipakai sebagai acuan kerja. Rujuk `PRD.md` untuk alasan keputusan, `CLAUDE.md` untuk konvensi kode dan struktur folder.

Penomoran task: `[Fase].[Urutan]`.

---

## Fase 0 — Setup Proyek

- [x] 0.1 Jalankan `scaffold.sh` untuk membuat struktur folder final (`ai-content-director/`).
- [x] 0.2 `git init`, commit awal struktur folder + `.gitkeep`.
- [x] 0.3 Setup `pnpm-workspace.yaml` dan `turbo.json` (pipeline `dev`, `build`, `lint`, `test`).
- [x] 0.4 Isi `packages/config/` — shared `tsconfig.base.json`, `eslint` config, (tailwind config kalau `apps/web` pakai Tailwind).
- [x] 0.5 Inisialisasi `apps/api` — NestJS project, hubungkan ke `packages/config`.
- [x] 0.6 Inisialisasi `apps/web` — Next.js project, hubungkan ke `packages/config`.
- [x] 0.7 Inisialisasi `apps/ai-service` — Python project (virtualenv/poetry), struktur folder sesuai `CLAUDE.md`.
- [x] 0.8 Setup `prisma/schema.prisma` kosong + koneksi database (provider, `DATABASE_URL` di `.env`).
- [x] 0.9 Setup `packages/schema` — install Zod, buat file schema kosong (sudah ada sebagai placeholder dari scaffold).
- [x] 0.10 Verifikasi: `turbo dev` menjalankan `api`, `web`, `ai-service` bersamaan tanpa error; masing-masing punya health check endpoint (`GET /health` untuk api & ai-service, halaman default untuk web).

**Definition of Done Fase 0**: repo bisa di-clone, `pnpm install && turbo dev` jalan tanpa error manual config tambahan.

---

## Fase 1 — Bible System (Fondasi)

- [x] 1.1 Prisma: definisikan model `Project`, `Story`.
- [x] 1.2 Prisma: definisikan model `CharacterBible`, `LocationBible`, `PropBible`, `StyleBible` — **dengan versioning** (field `version`, relasi `previousVersionId` → `nextVersion`).
- [x] 1.3 `packages/schema`: Zod schema untuk `Project`, `Story`, dan keempat jenis Bible, dipakai bersama api & web.
- [x] 1.4 `modules/project`: controller + service CRUD, DTO create/update.
- [x] 1.5 `modules/story`: controller + service CRUD, DTO create/update.
- [x] 1.6 `modules/bible/character`: CRUD + endpoint versioning (create new version, get version history).
- [x] 1.7 `modules/bible/location`: sama pola dengan character.
- [x] 1.8 `modules/bible/prop`: sama pola dengan character.
- [x] 1.9 `modules/bible/style`: sama pola dengan character.
- [x] 1.10 `modules/review`: status field/endpoint dasar (draft → review → approved) yang dipakai keempat jenis Bible.
- [ ] 1.11 Dukungan input gambar referensi (upload/attach) untuk Character/Location/Prop Bible — tentukan storage (lokal/objek storage) sesuai kapasitas VPS.
- [ ] 1.12 `apps/web`: halaman buat Project → isi Story → CRUD tiap jenis Bible, dengan indikator status review.
- [ ] 1.13 Test: unit test service CRUD + versioning tiap Bible; test bahwa update tidak menimpa versi lama.

**Definition of Done Fase 1**: pengguna bisa membuat Project lengkap dengan keempat jenis Bible tersimpan berversi dan berstatus approved, dapat diverifikasi lewat dashboard.

---

## Fase 2 — Scene Engine + Continuity Lapis 1

- [ ] 2.1 Prisma: model `Scene` dengan foreign key ke `Character`, `Location`, `Prop` (bukan field string bebas).
- [ ] 2.2 Prisma: model `ContinuityFlag` (relasi ke Scene, jenis pelanggaran, status resolved/unresolved).
- [ ] 2.3 `packages/schema`: Zod schema `Scene`.
- [ ] 2.4 `modules/scene`: controller + service CRUD, DTO yang mewajibkan referensi ID Bible (validasi FK ada & berstatus approved).
- [ ] 2.5 `modules/continuity`: service Lapis 1 — bandingkan data Scene terhadap versi Bible aktif untuk tiap field kontinuitas (Character ID, Wardrobe, Location ID, Prop ID, Time, Style).
- [ ] 2.6 Trigger continuity check otomatis: saat Scene dibuat/diubah, dan saat Bible terkait mendapat versi baru (cek semua Scene yang mereferensikannya).
- [ ] 2.7 `apps/web`: Scene builder form (pilih Character/Location/Prop dari Bible yang sudah approved), tampilan badge continuity flag.
- [ ] 2.8 Test: continuity flag muncul saat Scene mereferensikan versi Bible yang sudah usang; tidak muncul saat semua field konsisten.

**Definition of Done Fase 2**: Scene dapat dibuat dari Bible yang ada; perubahan Bible memicu re-validasi otomatis terhadap Scene terkait.

---

## Fase 3 — Storyboard Engine

- [ ] 3.1 Prisma: model `Shot` (child dari `Scene`) — shot type, framing, composition, camera position, lens, camera movement, blocking, visual beat.
- [ ] 3.2 `packages/schema`: Zod schema `Shot`.
- [ ] 3.3 `modules/storyboard`: controller + service CRUD Shot per Scene, urutan shot (ordering).
- [ ] 3.4 Perluas `modules/continuity` untuk validasi di level Shot (mis. blocking konsisten dengan posisi karakter di Shot sebelumnya dalam Scene yang sama).
- [ ] 3.5 `apps/web`: storyboard builder — tambah/urutkan/edit Shot per Scene.
- [ ] 3.6 Test: continuity check di level Shot terpicu benar; ordering Shot tersimpan dan terbaca sesuai urutan.

**Definition of Done Fase 3**: tiap Scene dapat dipecah jadi shot list terstruktur, siap dikompilasi jadi prompt.

---

## Fase 4 — Image Prompt Engine + Budget Guard + Adapter Flux

- [ ] 4.1 Prisma: model `GenerationJob` (relasi ke Shot, adapter target, status, versi prompt, versi Bible dipakai, cost estimate, cost actual, output asset URL).
- [ ] 4.2 Prisma: model `AdapterPricingRate` (adapter name, rate structure, effective date).
- [ ] 4.3 `apps/ai-service/src/prompt_compiler`: fungsi compile Image Prompt dari Shot + Bible + Style, baca `docs/instructions/07_prompt_rules.md` + `docs/knowledge/08_image_prompt_system.md`.
- [ ] 4.4 `packages/generation-adapters/flux/`: implementasi `base-generation-adapter.interface.ts` — `buildPrompt`, `validateConstraints`, `estimateCost`, `submit`.
- [ ] 4.5 `modules/image-prompt`: controller + service — trigger compile via ai-service, simpan hasil prompt.
- [ ] 4.6 `modules/budget`: service estimasi biaya berdasarkan `AdapterPricingRate`, endpoint approve sebelum submit.
- [ ] 4.7 `modules/capability`: toggle Image Generation per Project (on/off).
- [ ] 4.8 Wiring: `image-prompt` → `budget` (wajib lolos estimasi) → `generation-adapters/flux` (submit) → simpan `GenerationJob` dengan hasil.
- [ ] 4.9 `apps/web`: preview image prompt per Shot, tampilan estimasi biaya, tombol approve & submit, tampilan hasil gambar.
- [ ] 4.10 Test: submit job tanpa lolos budget check harus ditolak (test negatif wajib); job yang lolos tersimpan dengan versi prompt & Bible tercatat.

**Definition of Done Fase 4**: end-to-end pertama — Shot → Image Prompt → estimasi biaya → approve → Flux → hasil gambar tersimpan sebagai `GenerationJob`.

---

## Fase 5 — Video Prompt Engine + Adapter Seedance

- [ ] 5.1 `apps/ai-service/src/prompt_compiler`: fungsi compile Video Prompt — action, character motion, camera motion, environment motion, physics, temporal logic — baca `docs/knowledge/09_video_prompt_system.md`.
- [ ] 5.2 `packages/generation-adapters/seedance/`: implementasi interface adapter, **termasuk normalisasi format/resolusi** dari output Flux sebagai input image-to-video (tanggung jawab adapter ini, bukan `image-prompt`/`video-prompt` module).
- [ ] 5.3 `modules/video-prompt`: controller + service, pola sama seperti `image-prompt`.
- [ ] 5.4 `modules/budget`: tambahkan rate Seedance ke `AdapterPricingRate`, sesuaikan estimasi untuk job video (kemungkinan struktur harga beda dari image, mis. per detik).
- [ ] 5.5 Wiring: `video-prompt` → `budget` → `generation-adapters/seedance` → simpan `GenerationJob`.
- [ ] 5.6 `apps/web`: preview video prompt, estimasi biaya video, tombol approve & submit, player hasil video.
- [ ] 5.7 Test: normalisasi Flux→Seedance menghasilkan format yang diterima Seedance tanpa error; budget guard aktif untuk job video juga.

**Definition of Done Fase 5**: pipeline lengkap Shot → Image Prompt → Flux → gambar → Video Prompt → Seedance → video, dengan estimasi biaya di tiap submit.

---

## Fase 6 — Review Workflow Menyeluruh + Content Adapter (Sebagian)

- [ ] 6.1 `modules/review`: perluas jadi approval gate menyeluruh — Bible, Storyboard, GenerationJob (image & video) dalam satu module terpusat (bukan status ad-hoc di masing-masing module).
- [ ] 6.2 `apps/web`: halaman Review terpusat, filter berdasarkan status dan jenis entitas.
- [ ] 6.3 `packages/content-adapters/short-film/`: implementasi aturan produksi (dipilih sebagai prioritas pertama).
- [ ] 6.4 `packages/content-adapters/ugc/`: implementasi.
- [ ] 6.5 `packages/content-adapters/social-video/`: implementasi.
- [ ] 6.6 Wiring: `modules/project` menyimpan Content Type pilihan, Scene/Storyboard Engine membaca aturan dari content adapter terkait saat validasi/compile.
- [ ] 6.7 Test: reject di tahap Review memicu status kembali ke draft/revisi pada entitas terkait (bukan cuma flag tanpa efek).

**Definition of Done Fase 6**: alur produksi penuh dapat direview/disetujui/ditolak secara terpusat; minimal 3 jenis konten punya aturan produksi aktif.

---

## Fase 7 — Ekspansi (Pasca-V1)

- [ ] 7.1 `ai-service/src/continuity_scoring/`: implementasi embedding similarity (character reference, location, generated result).
- [ ] 7.2 `modules/continuity`: tambahkan feature flag manual untuk mengaktifkan Lapis 2 per Project.
- [ ] 7.3 `packages/generation-adapters/veo/`, `kling/`, `wan/`, `runway/`: implementasi bertahap sesuai prioritas kebutuhan produksi (urutan menyusul, belum ditentukan).
- [ ] 7.4 `packages/content-adapters/`: sisa jenis konten (film, documentary, advertisement, music-video, live-action, animation, cartoon, anime).
- [ ] 7.5 Dashboard admin untuk update `AdapterPricingRate` (jika belum selesai di Fase 4).

**Definition of Done Fase 7**: item-item ini dikerjakan bertahap sesuai kebutuhan aktual pasca-V1, tidak ada target selesai serentak.

---

## Catatan Penggunaan Dokumen Ini

- Checklist ini turunan dari `ROADMAP.md` — kalau ada perubahan urutan fase atau keputusan teknis, revisi `PRD.md`/`CLAUDE.md`/`ROADMAP.md` dulu, baru sinkronkan ke sini.
- Task tidak diberi estimasi waktu — durasi aktual tergantung kapasitas kerja.
- "Definition of Done" tiap fase adalah syarat minimum untuk lanjut ke fase berikutnya, bukan checklist kualitas menyeluruh.
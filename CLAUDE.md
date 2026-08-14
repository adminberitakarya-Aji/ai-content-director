# CLAUDE.md — AI Content Production Director V1

Dokumen ini adalah konteks kerja untuk AI assistant (Claude) saat membantu development project ini. Baca ini di awal setiap sesi kerja sebelum menulis atau mengubah kode. Untuk latar belakang produk lengkap, lihat `PRD.md`.

## Apa Project Ini

Sistem yang mengubah ide (teks/gambar) menjadi paket produksi konten visual terstruktur: Character/Location/Prop/Style Bible → Scene → Storyboard → Image/Video Prompt → Generation, dengan Continuity Engine menjaga konsistensi lintas elemen dan Budget Guard mengontrol biaya sebelum generation berbayar dieksekusi.

Prinsip inti yang **tidak boleh dilanggar** saat coding:
- Cerita dan struktur produksi (Story, Bible, Scene) adalah pusat sistem. Model generatif (Flux, Seedance, dst) adalah mesin di ujung pipeline yang bisa diganti — jangan pernah membuat logic inti bergantung pada spesifik satu model.
- Bible dan Continuity harus berupa **data terstruktur di database**, bukan bergantung pada memory/konteks LLM. LLM membaca/menulis data ini lewat tool call/service call, bukan mengandalkan histori percakapan sebagai sumber kebenaran.
- Tidak ada Generation Job (image maupun video) yang boleh submit ke adapter tanpa melewati Budget Guard.

## Stack Teknis (Terkunci)

- **Monorepo**: Turborepo + pnpm
- **Backend**: NestJS (`apps/api`)
- **Frontend**: Next.js (`apps/web`)
- **AI service**: Python (`apps/ai-service`) — prompt compilation, continuity scoring
- **Database**: Prisma (`prisma/schema.prisma` sebagai single source of truth data model)
- **Deployment**: mengikuti pola VPS + PM2 + Cloudflare tunnel yang sudah biasa dipakai (detail deployment menyusul di ROADMAP.md / saat fase deployment)

## Struktur Folder (Final — Jangan Diubah Tanpa Instruksi Eksplisit)

```
ai-content-director/
│
├── apps/
│   │
│   ├── api/                              # NestJS — orkestrasi utama
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── project/              # RUNTIME 01. PROJECT
│   │       │   ├── story/                # RUNTIME 02. STORY
│   │       │   ├── bible/                # RUNTIME 03. BIBLE
│   │       │   │   ├── character/
│   │       │   │   ├── location/
│   │       │   │   ├── prop/
│   │       │   │   └── style/
│   │       │   ├── character-generation/ # RUNTIME 04. CHARACTER GENERATION
│   │       │   ├── scene/                # RUNTIME 05. SCENE ENGINE
│   │       │   ├── storyboard/           # RUNTIME 06. STORYBOARD ENGINE
│   │       │   ├── image-prompt/         # RUNTIME 07. IMAGE PROMPT ENGINE
│   │       │   ├── video-prompt/         # RUNTIME 08. VIDEO PROMPT ENGINE
│   │       │   ├── continuity/           # RUNTIME 09. CONTINUITY ENGINE
│   │       │   ├── capability/           # CAPABILITIES (Image Understanding/Gen, Web Search — toggle per project)
│   │       │   ├── budget/               # kontrol biaya generation (tambahan saya)
│   │       │   └── review/               # approval gate per tahap (tambahan saya)
│   │       ├── common/                   # guards, interceptors, pipes
│   │       └── main.ts
│   │
│   ├── web/                              # Next.js — dashboard produksi
│   │   └── src/
│   │       ├── app/
│   │       │   ├── projects/[id]/story/
│   │       │   ├── projects/[id]/bible/
│   │       │   ├── projects/[id]/scenes/
│   │       │   ├── projects/[id]/storyboard/
│   │       │   └── projects/[id]/review/
│   │       ├── components/
│   │       └── templates/                # CONVERSATION STARTERS:
│   │                                      # Create Character Bible, Create New Project,
│   │                                      # Build Scene, Create Storyboard,
│   │                                      # Create Image Prompt, Create Video Prompt
│   │
│   └── ai-service/                       # Python — compile prompt & scoring
│       └── src/
│           ├── prompt_compiler/          # baca docs/instructions + docs/knowledge saat compile
│           ├── continuity_scoring/       # embedding/similarity check untuk RUNTIME 09
│           └── adapters/                 # eksekutor pemanggilan ke model gen (internal)
│
├── packages/
│   ├── schema/                           # Zod/TS types, dipakai bersama api & web
│   │   ├── project.schema.ts
│   │   ├── story.schema.ts
│   │   ├── bible.schema.ts
│   │   ├── scene.schema.ts
│   │   ├── shot.schema.ts
│   │   └── generation-job.schema.ts
│   │
│   ├── content-adapters/                 # RUNTIME 10. CONTENT ADAPTER
│   │   ├── film/
│   │   ├── short-film/
│   │   ├── documentary/
│   │   ├── vlog/
│   │   ├── ugc/
│   │   ├── advertisement/
│   │   ├── music-video/
│   │   ├── live-action/
│   │   ├── animation/
│   │   ├── cartoon/
│   │   ├── anime/
│   │   ├── social-video/
│   │   └── base-content-adapter.interface.ts
│   │
│   ├── generation-adapters/              # RUNTIME 11. GENERATION ADAPTER
│   │   ├── flux/
│   │   ├── seedance/
│   │   ├── veo/
│   │   ├── kling/
│   │   ├── wan/
│   │   ├── runway/
│   │   └── base-generation-adapter.interface.ts
│   │
│   └── config/                           # eslint, tsconfig, tailwind shared
│
├── prisma/
│   └── schema.prisma                     # single source of truth data model
│
├── docs/
│   ├── instructions/                     # INSTRUCTIONS — aturan perilaku sistem
│   │   ├── 00_core_role.md
│   │   ├── 01_production_workflow.md
│   │   ├── 02_decision_rules.md
│   │   ├── 03_continuity_rules.md
│   │   ├── 04_bible_rules.md
│   │   ├── 05_scene_rules.md
│   │   ├── 06_storyboard_rules.md
│   │   ├── 07_prompt_rules.md
│   │   └── 08_output_rules.md
│   │
│   └── knowledge/                        # KNOWLEDGE — referensi domain
│       ├── 01_content_types.md
│       ├── 02_character_bible.md
│       ├── 03_location_bible.md
│       ├── 04_prop_bible.md
│       ├── 05_style_bible.md
│       ├── 06_scene_system.md
│       ├── 07_storyboard_system.md
│       ├── 08_image_prompt_system.md
│       ├── 09_video_prompt_system.md
│       ├── 10_continuity_system.md
│       └── 11_generation_adapters.md
│
├── PRD.md
├── CLAUDE.md
├── ROADMAP.md
├── IMPLEMENTATION_PLAN.md
└── turbo.json
```

Catatan: adapter yang **diimplementasikan** untuk V1 hanya Flux (image) dan Seedance (video) — lihat "Keputusan Teknis" di bawah. Folder `veo/`, `kling/`, `wan/`, `runway/` sudah tersedia di struktur final tapi isinya menyusul di fase berikutnya.

Setiap folder `modules/*` di atas isinya kode (controller/service/dto), bukan dokumentasi. `docs/instructions/` dan `docs/knowledge/` isinya `.md`, dibaca oleh `apps/ai-service/src/prompt_compiler/` untuk menyusun system prompt — bukan dieksekusi langsung sebagai kode.

## Keputusan Teknis yang Sudah Final (Jangan Ditanyakan Ulang)

### Generation Adapter V1
- **Image → Flux**
- **Video → Seedance** (image-to-video)
- Adapter lain (Veo, Kling, Wan, Runway) belum dikerjakan di V1 — tapi interface adapter (`base-generation-adapter.interface.ts`) harus didesain agar penambahan adapter baru tidak mengubah kode `modules/image-prompt`, `modules/video-prompt`, atau module lain di luar `packages/generation-adapters`.
- Normalisasi format/resolusi (Flux output → Seedance input) adalah tanggung jawab **adapter Seedance itu sendiri**, bukan `image-prompt` module.

### Continuity Scoring — Dua Lapis, Bertahap
```
Continuity Score = Data Consistency + Visual Similarity
```
- **Lapis 1 (Data Consistency)** — wajib, aktif sejak awal. Validasi relasi data: Character ID, Wardrobe, Location ID, Prop ID, Time, Scene relationship, Style. Implementasi di `modules/continuity` (backend) + query relasi Prisma, bukan LLM-based reasoning.
- **Lapis 2 (Visual Similarity)** — opsional, **feature flag manual**. Image embedding similarity (character reference, location, generated result). Diimplementasikan di `ai-service/src/continuity_scoring/`, tapi tidak aktif secara default — jangan hardcode sebagai wajib jalan.

### Budget Guard
- **Wajib** untuk setiap Generation Job (image dan video), tanpa terkecuali. Jangan pernah buat jalur submit ke adapter yang melewati budget check.
- Rate harga disimpan di tabel `AdapterPricingRate` (Prisma), bukan hardcoded di kode, bukan fetch live dari API provider di V1.
- Rate diupdate manual lewat dashboard admin sederhana oleh pemilik akses — tidak perlu alur approval berlapis di V1.

## Konvensi Kode

- Scene, Shot, dan entitas produksi lain **selalu mereferensikan Bible by ID** (foreign key), tidak pernah by nama string bebas — ini prasyarat agar Continuity Engine bisa query relasi.
- Setiap perubahan pada entitas Bible **tidak menimpa data lama** — simpan sebagai versi baru (versioning), bukan update in-place, agar riwayat produksi bisa ditelusuri.
- Setiap `GenerationJob` mencatat versi prompt dan versi Bible yang dipakai saat submit, untuk auditability.
- Module baru di `apps/api/src/modules/` mengikuti pola NestJS standar: `*.controller.ts`, `*.service.ts`, `dto/`, `*.module.ts`.
- Adapter baru (content atau generation) mengimplementasikan interface base yang ada di package terkait — jangan bikin one-off logic di luar pola adapter.

## Yang Belum Diputuskan / Menyusul

- Detail breakdown fase pembangunan → lihat `ROADMAP.md` (belum dibuat saat dokumen ini ditulis).
- Skema Prisma lengkap → belum dibuat, menyusul setelah CLAUDE.md dan ROADMAP.md disetujui.
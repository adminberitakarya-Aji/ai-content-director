# Production Workflow

Dokumen ini merangkum alur kerja end-to-end yang menghubungkan seluruh instructions dan knowledge lain. Detail tiap tahap ada di dokumen masing-masing — di sini fokus pada urutan dan syarat perpindahan antar tahap.

## Alur Utama

```
Project → Story → Bible → Character Generation → Scene → Storyboard
  → Image Prompt → Video Prompt → Continuity → Generation → Review
```

## Syarat Perpindahan Antar Tahap

| Dari | Ke | Syarat |
|---|---|---|
| Project + Story | Bible | Project dan Story terisi field wajib (Content Type, Genre, Tone, Platform; Concept, Premise, Synopsis) |
| Bible | Scene | Character/Location/Prop/Style Bible yang dibutuhkan berstatus approved (lihat `04_bible_rules.md`) |
| Scene | Storyboard | Scene memenuhi kriteria "siap untuk Storyboard" (lihat `05_scene_rules.md`) |
| Storyboard | Prompt Engine | Shot memenuhi kriteria "siap untuk Prompt Engine" (lihat `06_storyboard_rules.md`) |
| Image Prompt | Video Prompt | Image Prompt sudah dikompilasi untuk Shot yang sama (Video Prompt dibangun di atasnya, lihat `07_prompt_rules.md`) |
| Prompt Engine | Generation | Tidak ada `ContinuityFlag` unresolved terkait Shot (lihat `03_continuity_rules.md`), dan estimasi biaya sudah disetujui (Budget Guard, lihat `02_decision_rules.md`) |
| Generation | Review | Generation Job selesai (berhasil atau gagal) — hasil masuk antrean review, bukan otomatis dianggap final |

## Continuity Bukan Tahap Terpisah

Continuity Engine tidak berdiri sebagai satu tahap linear tunggal dalam alur di atas — ia berjalan **melintasi** beberapa tahap (Scene, Storyboard, sebelum Generation) sebagai lapisan validasi yang aktif di banyak titik, bukan satu langkah yang dilewati sekali. Lihat `03_continuity_rules.md` untuk daftar lengkap titik pemicunya.

## Siklus Revisi

Alur di atas tidak selalu satu arah. Skenario umum siklus mundur:
- Review menolak Generation Job → kembali ke Prompt Engine (revisi prompt) atau ke Storyboard (revisi Shot) tergantung akar masalah.
- Bible mendapat versi baru setelah Scene sudah dibuat → Scene terkait ditandai untuk re-check, bukan otomatis batal (lihat `04_bible_rules.md`).
- Continuity Flag baru muncul di tengah proses → tahap yang sedang berjalan ditahan sampai flag diselesaikan (lihat `03_continuity_rules.md`).

Jangan memperlakukan alur ini sebagai pipeline sekali jalan tanpa kemungkinan mundur — revisi adalah bagian normal dari proses produksi, bukan kegagalan sistem.

## Peran Content Adapter dalam Alur

Content Adapter (lihat `01_content_types.md`) tidak menjadi tahap terpisah, tapi mempengaruhi bagaimana tahap Scene, Storyboard, dan Continuity diterapkan — jenis konten yang dipilih di Project menentukan aturan spesifik yang berlaku di tahap-tahap tersebut.
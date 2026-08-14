# Content Types

Referensi jenis konten yang didukung sistem, dipetakan ke `packages/content-adapters/`. Tiap jenis konten mempengaruhi bagaimana Scene, Storyboard, dan toleransi Continuity diterapkan (lihat `docs/instructions/03_continuity_rules.md` untuk interaksi dengan Continuity, `05_scene_rules.md` dan `06_storyboard_rules.md` untuk interaksi dengan Scene/Storyboard).

## Status Implementasi di V1

Content Adapter diimplementasikan bertahap (lihat ROADMAP.md Fase 6-7). Prioritas awal: **Short Film, UGC, Social Video**. Sisanya (Film, Documentary, Advertisement, Music Video, Live Action, Animation, Cartoon, Anime, Vlog) menyusul di Fase 7.

## Short Film *(prioritas V1)*

- Struktur naratif jelas dengan awal-tengah-akhir, kontrol shot dan continuity ketat (mendekati standar produksi film konvensional).

## UGC — User Generated Content *(prioritas V1)*

- Gaya visual kasual, sering handheld/personal, toleransi continuity lebih tinggi (variasi kecil antar-shot dianggap wajar, bukan pelanggaran).

## Social Video *(prioritas V1)*

- Format pendek, dioptimalkan untuk platform media sosial (vertical/square aspect ratio umum), pacing cepat, shot list cenderung lebih sedikit dan padat dibanding Short Film.

## Documentary *(menyusul)*

- Kontrol visual lebih longgar untuk elemen dokumenter/wawancara, tapi Character/Location Bible tetap penting untuk subjek berulang (mis. narasumber yang muncul di banyak segmen).

## Vlog *(menyusul)*

- Mirip UGC dalam toleransi visual, tapi dengan struktur naratif personal (satu narator utama, Character Bible untuk presenter menjadi krusial).

## Advertisement *(menyusul)*

- Kontrol visual dan branding ketat, Style Bible menjadi elemen paling dominan dan konsisten dibanding jenis konten lain.

## Music Video *(menyusul)*

- Continuity naratif lebih longgar (tidak selalu linear), tapi Style Bible dan Visual Beat per Shot menjadi sangat penting untuk sinkronisasi dengan ritme.

## Live Action *(menyusul)*

- Standar realisme visual tinggi, Physics di Video Prompt Engine wajib taat hukum fisika nyata kecuali dinyatakan lain.

## Animation *(menyusul)*

- Toleransi terhadap Physics non-realistis lebih tinggi (tergantung Style Bible), kontrol continuity tetap ketat karena karakter animasi biasanya lebih mudah terdeteksi penyimpangannya secara visual.

## Cartoon *(menyusul)*

- Mirip Animation, dengan Visual Style yang lebih stilasi/simplified; Motion Style di Style Bible cenderung lebih ekspresif/hyperbolic.

## Anime *(menyusul)*

- Visual Style dan Motion Style mengikuti konvensi genre anime (ekspresi wajah stilasi, gerakan tertentu yang khas); Character Bible perlu detail lebih tinggi di bagian Face untuk menangkap gaya khas ini secara konsisten.

## Prinsip Umum Saat Content Adapter Belum Diimplementasikan

Untuk jenis konten yang adapternya belum aktif (lihat status di atas), sistem tetap dapat memproses Project menggunakan aturan default (tanpa penyesuaian khusus jenis konten) — tapi tandai ke pengguna bahwa aturan spesifik jenis konten ini belum diterapkan, supaya ekspektasi tetap jelas.
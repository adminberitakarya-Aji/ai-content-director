# Continuity System

Referensi mekanisme dan struktur data untuk Continuity Engine. Aturan perilaku (kapan dijalankan, bagaimana menyikapi pelanggaran) ada di `docs/instructions/03_continuity_rules.md` — dokumen ini fokus ke *apa* yang diperiksa dan *bagaimana* skornya dihitung secara konseptual.

## Formula

```
Continuity Score = Data Consistency + Visual Similarity
```

- **Data Consistency (Lapis 1)** — wajib, aktif sejak V1. Berbasis perbandingan relasi data terstruktur.
- **Visual Similarity (Lapis 2)** — opsional, feature flag manual per Project. Berbasis image embedding similarity. Ditambahkan sebagai pemeriksaan visual tambahan setelah Lapis 1 terbukti stabil — bukan sumber kebenaran utama.

## Lapis 1 — Data Consistency (Aktif di V1)

Elemen yang diperiksa, dibandingkan antara nilai yang dipakai di Scene/Shot terhadap versi Bible yang sedang aktif:

- **Character ID** — karakter yang direferensikan memang ada dan berstatus approved.
- **Wardrobe** — pakaian yang disebut/dipakai di Scene sesuai dengan Wardrobe default atau varian yang terdaftar di Character Bible, bukan deskripsi baru yang tidak terdaftar.
- **Location ID** — lokasi yang direferensikan ada dan approved.
- **Prop ID** — prop yang direferensikan ada, approved, dan kondisinya (lihat Continuity di Prop Bible) sesuai dengan titik waktu Scene ini dalam timeline cerita.
- **Time** — waktu Scene selaras dengan kondisi Lighting yang terdefinisi di Location Bible untuk waktu tersebut.
- **Scene relationship** — konsistensi antar-Scene yang berurutan (mis. posisi/kondisi karakter di akhir Scene sebelumnya selaras dengan awal Scene berikutnya, jika keduanya memang berurutan langsung dalam waktu cerita).
- **Style** — Scene/Shot tidak menyimpang dari Style Bible Project tanpa override eksplisit.

Setiap elemen di atas menghasilkan status: konsisten, atau `ContinuityFlag` dengan detail field yang menyimpang dan nilai yang dibandingkan.

## Lapis 2 — Visual Similarity (Opsional, Feature Flag)

Diaktifkan manual per Project. Saat aktif, memeriksa:

- **Character reference similarity** — kemiripan visual hasil generate terhadap reference image di Character Bible.
- **Location similarity** — kemiripan visual hasil generate terhadap reference image di Location Bible.
- **Generated result similarity** — kemiripan antar hasil generate untuk entitas yang sama di Shot berbeda (mendeteksi drift visual bertahap yang mungkin tidak tertangkap oleh pembanding data saja).

Lapis 2 tidak menggantikan Lapis 1 — keduanya berjalan bersamaan saat aktif, dan skor akhir mempertimbangkan keduanya.

## Status ContinuityFlag

- **Unresolved** — pelanggaran terdeteksi, belum ada keputusan dari pengguna. Memblokir Shot terkait untuk lanjut ke Prompt Engine (lihat Continuity Rules).
- **Resolved (fixed)** — Scene/Shot diperbaiki agar sesuai Bible.
- **Resolved (accepted)** — pengguna menyatakan penyimpangan ini disengaja; dicatat dengan alasan, tidak memblokir proses selanjutnya.

## Kapan Lapis 2 Sebaiknya Diaktifkan

Tidak ada kriteria otomatis di V1 (lihat keputusan di PRD.md) — murni keputusan manual pengguna, biasanya setelah pengguna menilai sendiri bahwa Lapis 1 sudah berjalan dengan baik dan ingin lapisan pemeriksaan visual tambahan.
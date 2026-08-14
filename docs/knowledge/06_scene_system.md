# Scene System

Referensi struktur data untuk entitas Scene. Aturan perilaku penyusunannya ada di `docs/instructions/05_scene_rules.md` — dokumen ini fokus ke field apa saja yang ada dan bentuknya.

## Episode *(wajib untuk konten berseri)*

- Scene berada di bawah Episode tertentu untuk konten yang punya struktur episodik (serial, film dengan babak). Untuk konten non-episodik (iklan, video tunggal), field ini bisa merujuk ke Project langsung.

## Scene *(identifier + urutan)*

- Nomor urut Scene dalam Episode/Project, dan judul singkat opsional untuk memudahkan navigasi (mis. "Scene 3 — Konfrontasi di Dapur").

## Characters *(referensi by ID, wajib minimal satu)*

- Daftar Character ID yang terlibat di Scene ini. Setiap Character harus sudah approved di Bible (lihat Scene Rules).

## Location *(referensi by ID, wajib)*

- Location ID tempat Scene berlangsung. Satu Scene = satu Location (lihat Scene Rules — perpindahan lokasi berarti Scene baru).

## Props *(referensi by ID, opsional)*

- Daftar Prop ID yang relevan dan signifikan di Scene ini (hanya prop yang terdaftar di Prop Bible — objek generik tidak perlu didaftarkan di sini).

## Time *(wajib)*

- Waktu dalam konteks timeline cerita (lihat Scene Rules untuk detail relasi dengan Story timeline dan Location Lighting).

## Action *(wajib)*

- Urutan kejadian konkret dalam Scene, ditulis sebagai langkah-langkah naratif yang jelas — ini jadi bahan utama untuk Storyboard Engine memecah Scene menjadi Shot.

## Emotion *(wajib)*

- State emosi tiap Character yang terlibat di Scene ini (bisa berbeda-beda per karakter dalam Scene yang sama).

## Dialogue *(opsional — hanya jika Scene memang punya dialog)*

- Daftar baris dialog dengan Character ID pembicara, dalam urutan kemunculan.

## Continuity Check *(dihasilkan sistem, bukan diisi manual)*

- Field ini bukan input pengguna — diisi otomatis oleh Continuity Engine berdasarkan hasil validasi terhadap Bible (lihat `10_continuity_system.md`). Tercantum di sini karena menjadi bagian dari representasi lengkap sebuah Scene saat ditampilkan atau dibaca ulang oleh sistem lain (mis. Storyboard Engine, Prompt Compiler).

## Field Wajib Minimum agar Scene Bisa Lanjut ke Storyboard Engine

Characters (minimal satu), Location, Time, Action, Emotion — lihat kriteria lengkap "siap untuk Storyboard" di `05_scene_rules.md`.
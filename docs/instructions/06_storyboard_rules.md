# Storyboard Rules

Aturan ini mengatur bagaimana sebuah Scene dipecah menjadi Shot list. Struktur field Shot ada di `docs/knowledge/07_storyboard_system.md`.

## Memecah Scene Menjadi Shot

- Setiap Shot berasal dari satu Scene induk dan mewakili satu potongan visual berkelanjutan (tanpa perubahan kamera/framing di dalamnya).
- Sumber utama pemecahan adalah field **Action** di Scene (lihat `05_scene_rules.md`) — setiap langkah aksi yang membutuhkan sudut pandang/framing berbeda umumnya menjadi Shot terpisah. Jangan memaksa satu Scene menjadi satu Shot tunggal jika Action-nya memuat beberapa beat visual yang berbeda.
- Sebaliknya, jangan memecah berlebihan — dialog singkat antara dua karakter tidak selalu butuh Shot terpisah untuk tiap baris jika tidak ada perubahan visual yang berarti.

## Urutan dan Ketergantungan

- Shot memiliki urutan eksplisit dalam Scene-nya (Shot 1, Shot 2, dst). Urutan ini menentukan alur naratif visual dan menjadi dasar validasi Continuity di level Shot (lihat `03_continuity_rules.md` — Scene relationship).
- Blocking (posisi karakter) di sebuah Shot harus konsisten dengan Shot sebelumnya dalam Scene yang sama, kecuali ada pergerakan eksplisit yang dicatat di Camera Movement atau Action.

## Shot Type dan Framing

- Pilih shot type (extreme wide, wide, medium, close-up, extreme close-up, dst) berdasarkan kebutuhan naratif Scene — bukan variasi acak untuk keragaman visual. Shot type yang dipilih harus punya alasan naratif (menonjolkan ekspresi → close-up; menonjolkan konteks lokasi → wide).
- Framing dan Composition mengikuti Cinematography default di Style Bible (lihat `05_style_bible.md`) kecuali Shot tertentu butuh pengecualian yang dinyatakan eksplisit.

## Camera dan Lens

- Camera Position, Lens, dan Camera Movement dicatat secara konkret dan dapat dieksekusi — hindari istilah ambigu. "Kamera bergerak mendekat perlahan" lebih baik dari "kamera dinamis".
- Camera Movement harus selaras dengan Motion Style di Style Bible untuk Project yang melibatkan video.

## Character Blocking

- Posisi dan orientasi tiap Character yang muncul di Shot dicatat eksplisit (siapa di mana, menghadap ke mana) — ini penting untuk menjaga konsistensi spasial antar-Shot dan menjadi input penting untuk Video Prompt Engine (Spatial Continuity).

## Visual Beat

- Satu kalimat inti yang menjelaskan apa yang secara visual paling penting terjadi di Shot ini. Ini membantu Prompt Engine memprioritaskan elemen mana yang harus paling ditonjolkan dalam prompt yang dihasilkan.

## Kapan Shot Dianggap Siap untuk Prompt Engine

Shot boleh lanjut ke Image/Video Prompt Engine jika: shot type, framing, camera, dan blocking sudah terisi, dan tidak ada `ContinuityFlag` berstatus unresolved yang terkait Shot ini (lihat `03_continuity_rules.md`).
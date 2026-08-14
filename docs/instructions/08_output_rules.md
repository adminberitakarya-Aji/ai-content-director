# Output Rules

Dokumen ini mengatur bagaimana output dari tiap tahap (Bible, Scene, Storyboard, Prompt, hasil Continuity check) disajikan — memastikan konsistensi format lintas tahap agar mudah dibaca manusia maupun diproses sistem lain (mis. `prompt_compiler` yang membaca output tahap sebelumnya sebagai input tahap berikutnya).

## Prinsip Umum

- Output selalu dalam bentuk data terstruktur (field-field yang jelas), bukan paragraf naratif bebas yang sulit di-parse ulang oleh tahap berikutnya — kecuali untuk field yang memang naratif secara alami (mis. Action di Scene, Synopsis di Story).
- Setiap output menyertakan referensi eksplisit ke sumbernya (Bible mana, versi berapa, Scene/Shot mana) — bukan hanya berdiri sendiri tanpa jejak asal, agar auditability terjaga (lihat prinsip di `CLAUDE.md`).

## Bahasa dan Nada

- Output yang ditujukan untuk dibaca pengguna (ringkasan, penjelasan flag, catatan revisi) ditulis jelas dan langsung — tidak berbunga-bunga, tidak defensif berlebihan saat menjelaskan masalah/kekurangan.
- Output yang menjadi input untuk sistem lain (prompt konseptual, payload adapter) mengikuti format teknis yang ditentukan di knowledge base masing-masing, bukan gaya bahasa naratif.

## Menyajikan Masalah/Kekurangan

- Saat menandai kekurangan (field kosong, ContinuityFlag, konflik data), sebutkan secara spesifik: field/elemen mana, nilai yang dibandingkan (jika relevan), dan apa yang perlu dilakukan pengguna — bukan pesan generik.
- Jangan menyajikan asumsi sebagai fakta. Jika sistem mengisi sesuatu berdasarkan default/inferensi (mis. Framing default dari Style Bible karena Shot tidak menentukan sendiri), tandai bahwa ini adalah nilai default, bukan input eksplisit pengguna — supaya pengguna tahu ini bisa diubah.

## Output Prompt Final

- Prompt final (setelah melalui Generation Adapter) disajikan lengkap dengan: prompt konseptual asal, adapter tujuan, dan constraint yang diterapkan — bukan hanya string prompt akhir tanpa konteks, supaya jika hasil generate tidak sesuai, penelusuran akar masalah (di tahap Shot, Bible, atau di adapter) tetap mudah dilakukan.

## Konsistensi Terminologi

- Gunakan istilah yang sama persis dengan yang didefinisikan di knowledge base (mis. selalu "ContinuityFlag", bukan kadang "continuity issue" atau "inconsistency warning") — konsistensi istilah penting karena dokumen-dokumen ini saling merujuk dan dibaca ulang oleh sistem (`prompt_compiler`) di banyak titik.
# Location / World Bible

Referensi struktur data untuk entitas Location. Dipakai saat membuat/memvalidasi Location Bible, dan saat mengompilasi Image/Video Prompt yang melibatkan latar tempat.

## Location ID

- Identifier unik (mis. `L01`, `L02`) untuk referensi lintas Scene tanpa ambiguitas nama, terutama penting saat ada beberapa lokasi dengan nama mirip (mis. "Rumah Karakter A" vs "Rumah Karakter B").

## Exterior *(wajib jika lokasi punya sisi luar yang relevan dengan cerita)*

- Tampilan luar bangunan/tempat: bentuk, material, warna, skala, lingkungan sekitar (perkotaan, pedesaan, alam terbuka, dst).

## Interior *(wajib jika Scene terjadi di dalam ruangan)*

- Tata ruang, elemen dekorasi tetap, furnitur signature yang muncul berulang di banyak Scene.
- Tidak perlu mendeskripsikan setiap detail interior — fokus pada elemen yang kemungkinan muncul di banyak Shot dan perlu konsisten (mis. warna dinding utama, jendela besar di sisi tertentu).

## Architecture *(opsional, disarankan untuk lokasi signature)*

- Gaya arsitektur (modern, klasik, tradisional, futuristik, dst) — relevan terutama untuk konten fiksi/fantasi/sci-fi di mana arsitektur adalah bagian dari world-building.

## Lighting *(wajib)*

- Kondisi pencahayaan default lokasi ini: sumber cahaya utama (alami/buatan), arah, warna cahaya (hangat/dingin), waktu hari yang paling umum dipakai.
- Jika lokasi dipakai di waktu berbeda (siang/malam) dengan mood pencahayaan berbeda, dicatat sebagai variasi terpisah tapi tetap terhubung ke Location ID yang sama.

## Atmosphere *(wajib)*

- Suasana/mood lokasi ini — tenang, ramai, mencekam, hangat, dst. Ini mempengaruhi bagaimana Style Bible (lihat `05_style_bible.md`) diterapkan secara spesifik di lokasi ini.

## Field Wajib Minimum agar Location Bible Bisa Naik Status ke "Review"

Location ID, minimal salah satu dari Exterior/Interior (tergantung jenis lokasi), Lighting, dan Atmosphere. Architecture opsional kecuali untuk world-building yang eksplisit membutuhkannya (fantasi, sci-fi, periode sejarah tertentu).
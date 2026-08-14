# Scene Rules

Aturan ini mengatur bagaimana Scene disusun dan divalidasi. Struktur field Scene ada di `docs/knowledge/06_scene_system.md`.

## Referensi, Bukan Deskripsi Bebas

Setiap Character, Location, dan Prop yang muncul di Scene **harus direferensikan by ID** ke Bible yang sudah ada dan berstatus approved — tidak boleh dideskripsikan ulang secara bebas di dalam Scene. Jika entitas yang dibutuhkan belum ada di Bible, proses Scene ditahan dan pengguna diarahkan untuk melengkapi Bible dulu (lihat `04_bible_rules.md`).

Pengecualian: objek latar generik yang memang tidak perlu Prop Bible (lihat `04_prop_bible.md`) boleh dideskripsikan langsung di Scene tanpa referensi ID.

## Satu Scene, Satu Fokus Naratif

Sebuah Scene merepresentasikan satu unit naratif yang berkelanjutan di satu Location dan rentang waktu tertentu. Jika terjadi perpindahan lokasi atau lompatan waktu signifikan, itu adalah Scene baru, bukan diperpanjang di Scene yang sama — ini penting agar Continuity Engine dapat memvalidasi Location dan Time secara akurat per Scene.

## Penulisan Action, Emotion, Dialogue

- **Action**: deskripsikan apa yang terjadi secara konkret dan berurutan, bukan interpretasi abstrak. "Karakter A berjalan ke jendela dan menatap ke luar" lebih berguna untuk Storyboard Engine daripada "Karakter A merasa gelisah".
- **Emotion**: catat sebagai state yang jelas (tenang, marah, takut, dst), karena ini mempengaruhi ekspresi wajah yang perlu konsisten dengan Face di Character Bible.
- **Dialogue**: dialog dicatat lengkap dengan karakter yang berbicara (by Character ID) — bukan hanya isi teks, karena Video Prompt Engine mungkin butuh sinkronisasi gestur/ekspresi dengan momen dialog tertentu.

## Time

- Waktu dalam Scene dicatat relatif terhadap timeline cerita di Story (lihat Project/Story), bukan hanya "pagi/siang/malam" tanpa konteks — terutama penting untuk cerita dengan alur waktu non-linear (flashback, timeskip).
- Time di Scene harus selaras dengan Lighting yang didefinisikan di Location Bible untuk waktu tersebut (lihat `03_location_bible.md`) — jika Scene butuh kondisi pencahayaan yang belum didefinisikan di Location Bible, tandai untuk dilengkapi.

## Kapan Scene Dianggap Siap untuk Storyboard

Scene boleh lanjut ke Storyboard Engine jika: semua Character/Location/Prop yang direferensikan berstatus approved, Time dan Emotion terisi, dan tidak ada `ContinuityFlag` berstatus unresolved yang terkait Scene ini.
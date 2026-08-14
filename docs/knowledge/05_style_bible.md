# Style Bible

Referensi struktur data untuk gaya visual keseluruhan Project. Berbeda dengan Character/Location/Prop Bible yang mendeskripsikan entitas spesifik, Style Bible berlaku lintas seluruh Project (kecuali ada override eksplisit di Scene tertentu) dan menjadi lapisan konsisten yang diterapkan ke semua Image/Video Prompt.

## Visual Style *(wajib)*

- Gaya visual keseluruhan: realistis, semi-realistis, animasi 2D, animasi 3D, kartun, anime, dst. Ini adalah keputusan paling fundamental yang mempengaruhi hampir semua aspek Prompt Engine lainnya.

## Color *(wajib)*

- Palet warna dominan Project — warna-warna yang sering muncul dan jadi ciri khas visual (bukan daftar semua warna yang mungkin dipakai, tapi arah palet: hangat/dingin, saturasi tinggi/rendah, kontras tinggi/rendah).

## Lighting *(wajib)*

- Pendekatan pencahayaan umum Project (berbeda dari Lighting di Location Bible yang spesifik per lokasi) — mis. cenderung natural light, cenderung dramatic/high-contrast, cenderung soft/diffused.
- Lighting di Location Bible adalah penerapan spesifik dari arah umum ini ke lokasi tertentu; jika keduanya bertentangan, klarifikasi ke pengguna mana yang jadi prioritas.

## Texture *(opsional, disarankan untuk konten dengan tekstur visual signature)*

- Tekstur visual khas — grain film, clean/digital, hand-drawn, painterly, dst. Relevan terutama untuk konten dengan gaya visual yang kuat (film noir, anime dengan gaya khas studio tertentu, dst).

## Cinematography *(wajib)*

- Pendekatan pengambilan gambar secara umum — preferensi framing (wide vs close-up dominan), preferensi lensa, kecenderungan camera movement (statis/dinamis). Ini menjadi acuan default untuk Storyboard Engine saat menentukan shot type jika pengguna tidak menentukan secara spesifik per Shot.

## Motion Style *(wajib untuk Project yang melibatkan video)*

- Karakteristik gerakan visual — cepat/lambat, halus/patah-patah (khas animasi tertentu), realistis/stilasi. Menjadi acuan default untuk Video Prompt Engine.

## Field Wajib Minimum agar Style Bible Bisa Naik Status ke "Review"

Visual Style, Color, Lighting, dan Cinematography wajib sejak awal Project dibuat — karena field ini mempengaruhi validasi Bible lain (mis. Face/Body di Character Bible perlu selaras dengan Visual Style: realistis vs kartun punya standar deskripsi berbeda). Motion Style wajib sebelum Fase Video Prompt Engine dikerjakan, boleh menyusul setelah Style Bible dasar disetujui jika Project tahap awal baru fokus ke image.
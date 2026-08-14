# Character Bible

Referensi struktur data untuk entitas Character. Dipakai saat membuat/memvalidasi Character Bible, dan saat mengompilasi Image/Video Prompt yang melibatkan karakter.

## Character ID

- Identifier unik, format singkat (mis. `A01`, `A02`) untuk memudahkan referensi lintas Scene/Shot tanpa ambiguitas nama.
- Sekali ditetapkan, ID ini tidak berubah sepanjang umur proyek meskipun nama tampilan karakter berubah.

## Identity *(wajib)*

- Nama karakter, peran/fungsi dalam cerita, usia (atau rentang usia), gender.
- Deskripsi singkat identitas — siapa karakter ini dalam konteks cerita, bukan deskripsi fisik (itu ada di bagian Face/Body/Hair).

## Face *(wajib)*

- Bentuk wajah, warna mata, warna/tekstur kulit, fitur wajah khas (bekas luka, tahi lalat, tato wajah, dst).
- Ekspresi default/netral karakter (relevan untuk konsistensi ekspresi di berbagai Scene).

## Body *(wajib)*

- Tinggi/proporsi tubuh (relatif, mis. "tinggi rata-rata", atau spesifik jika penting untuk cerita), bentuk tubuh, postur khas.

## Hair *(wajib)*

- Warna, panjang, tekstur, model rambut default.
- Jika karakter mengalami perubahan gaya rambut di titik cerita tertentu, dicatat sebagai variasi bertanggal/bertahap (bukan menimpa deskripsi rambut utama), agar Scene sebelum dan sesudah perubahan tetap bisa merujuk versi yang benar.

## Wardrobe *(wajib — minimal satu set default)*

- Pakaian default/utama karakter: jenis pakaian, warna, aksesori tetap (jam tangan, kalung, kacamata, dst).
- Wardrobe alternatif (pakaian khusus untuk Scene tertentu) dicatat sebagai varian terpisah, tetap terhubung ke Character ID yang sama — bukan Character baru.

## Personality *(opsional, tapi disarankan)*

- Sifat, cara bicara, kebiasaan/gestur khas. Tidak wajib untuk kebutuhan visual, tapi membantu penyusunan Video Prompt yang melibatkan gestur/ekspresi/action karakter.

## Reference Images

- Foto/gambar referensi wajah, pakaian, pose khas.
- Jika ada lebih dari satu gambar referensi, tandai mana yang jadi acuan utama (primary reference) untuk conditioning saat generate — terutama penting untuk model image-to-image yang butuh satu gambar acuan dominan.

## Field Wajib Minimum agar Character Bible Bisa Naik Status ke "Review"

Character ID, Identity, Face, Body, Hair, dan minimal satu set Wardrobe default. Personality dan Reference Images boleh menyusul, tapi Reference Images sangat disarankan ada sebelum status "approved" karena mempengaruhi kualitas conditioning image generation secara signifikan.
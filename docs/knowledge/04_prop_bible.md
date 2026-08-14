# Prop / Object Bible

Referensi struktur data untuk entitas Prop. Dipakai saat membuat/memvalidasi Prop Bible, dan saat mengompilasi Image/Video Prompt yang melibatkan objek/properti penting dalam cerita.

## Kapan Sebuah Objek Perlu Jadi Prop Bible

Tidak semua objek yang muncul di Scene perlu didaftarkan sebagai Prop Bible — hanya objek yang **signifikan secara naratif atau visual berulang**: senjata milik karakter, kendaraan spesifik, benda pusaka, alat yang jadi bagian penting alur cerita. Objek latar biasa (kursi generik, cangkir generik yang tidak perlu konsisten antar Scene) tidak perlu Prop Bible tersendiri — cukup disebutkan sebagai bagian deskripsi Scene/Shot biasa.

## Prop ID

- Identifier unik (mis. `O01`, `O02`) untuk referensi lintas Scene.

## Appearance *(wajib)*

- Bentuk, ukuran, warna, material, kondisi (baru/usang/rusak), detail khas yang membedakan (ukiran, stiker, bekas pakai).

## Function *(wajib)*

- Apa fungsi prop ini dalam cerita — bukan sekadar deskripsi visual, tapi mengapa objek ini penting dan bagaimana biasanya dipakai/dipegang/berinteraksi dengan karakter. Ini membantu penyusunan Video Prompt yang melibatkan interaksi karakter-objek.

## Continuity *(wajib)*

- Kondisi objek yang bisa berubah sepanjang cerita (mis. senjata yang awalnya bersih lalu jadi kotor/rusak di titik cerita tertentu) dicatat sebagai tahapan kondisi, bertanggal/bertahap terhadap timeline cerita — bukan dianggap sebagai satu kondisi statis sepanjang produksi.
- Jika prop ini dipegang/dibawa oleh Character tertentu secara konsisten, catat keterkaitannya (opsional tapi membantu Continuity Engine mendeteksi anomali, mis. prop muncul di Scene tanpa karakter yang seharusnya membawanya).

## Field Wajib Minimum agar Prop Bible Bisa Naik Status ke "Review"

Prop ID, Appearance, dan Function. Continuity (tahapan kondisi) wajib diisi jika prop memang mengalami perubahan kondisi sepanjang cerita — jika kondisinya statis sepanjang produksi, cukup dicatat sebagai kondisi tunggal.
# Bible Rules

Aturan ini berlaku untuk keempat jenis Bible: Character, Location, Prop, Style. Struktur field masing-masing ada di `docs/knowledge/02_character_bible.md` sampai `05_style_bible.md` — dokumen ini mengatur *bagaimana* Bible dibuat dan dijaga, bukan field apa saja yang ada di dalamnya.

## Field Wajib vs Opsional

- Setiap jenis Bible punya field yang **wajib diisi** sebelum entitas boleh berstatus "review" (lihat knowledge base masing-masing untuk daftar field wajib).
- Field yang tidak diisi pengguna dan tidak wajib boleh dikosongkan — jangan diisi dengan asumsi atau generalisasi ("biasanya karakter seperti ini...").
- Jika field wajib belum diisi, entitas tetap berstatus "draft" dan tidak boleh direferensikan oleh Scene manapun.

## Referensi Gambar

- Reference image (foto karakter, referensi lokasi, dst) diperlakukan sebagai bagian dari Bible, bukan lampiran terpisah.
- Jika pengguna memberikan reference image yang bertentangan dengan deskripsi teks yang sudah ada di Bible yang sama (mis. warna rambut di teks beda dengan di foto), tandai konflik ini secara eksplisit ke pengguna — jangan diam-diam memilih salah satu sebagai yang benar.

## Versioning — Tidak Ada Overwrite

- Setiap perubahan pada Bible yang sudah berstatus "approved" **membuat versi baru**, bukan menimpa versi lama. Versi lama tetap tersimpan agar Scene yang sudah dibuat dengan versi lama dapat ditelusuri kembali dan dinilai apakah masih valid.
- Saat sebuah Bible mendapat versi baru, semua Scene yang mereferensikan Bible tersebut perlu ditandai untuk continuity re-check (lihat `03_continuity_rules.md`) — perubahan Bible tidak otomatis berarti Scene lama menjadi salah, tapi harus diverifikasi ulang.
- Perubahan minor (typo, deskripsi tambahan yang tidak mengubah identitas visual) tetap membuat versi baru, tapi bisa ditandai sebagai "minor revision" agar tidak memicu continuity flag yang tidak perlu — gunakan penilaian: apakah perubahan ini akan terlihat berbeda secara visual jika di-generate ulang?

## Konsistensi Antar Bible

- Prop yang muncul dalam konteks sebuah Location (mis. perabotan tetap di sebuah ruangan) sebaiknya dicatat keterkaitannya, bukan didefinisikan berulang secara independen di tiap Scene yang memakainya.
- Style Bible berlaku di level Project (atau bisa di-override di level Scene tertentu jika pengguna eksplisit meminta pengecualian) — jangan biarkan gaya visual berbeda diam-diam muncul di Scene berbeda tanpa alasan yang dinyatakan pengguna.

## Kapan Menolak / Menahan

Tahan proses (jangan lanjut ke tahap berikutnya seperti pembuatan Scene yang mereferensikan Bible ini) jika:
- Field wajib kosong.
- Ada konflik yang belum terselesaikan antara teks dan reference image.
- Pengguna meminta membuat Character/Location/Prop baru yang sangat mirip dengan entitas yang sudah ada di Bible tanpa penjelasan — konfirmasi dulu apakah ini varian dari entitas yang sudah ada atau memang entitas baru, untuk menghindari duplikasi identitas yang membingungkan Continuity Engine.
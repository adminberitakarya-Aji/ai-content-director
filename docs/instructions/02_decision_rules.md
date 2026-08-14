# Decision Rules

Dokumen ini mengatur keputusan-keputusan yang harus diambil sistem secara konsisten di berbagai titik alur produksi — terutama yang berkaitan dengan kontrol biaya dan wewenang persetujuan. Aturan spesifik per tahap (Bible, Scene, Storyboard, Prompt, Continuity) ada di dokumen masing-masing; dokumen ini fokus pada keputusan lintas-tahap.

## Budget Guard — Wajib, Tanpa Terkecuali

- Setiap Generation Job, baik image (Flux) maupun video (Seedance), **wajib** melalui estimasi biaya sebelum submit ke adapter. Tidak ada pengecualian berdasarkan jenis konten, urgensi, atau permintaan eksplisit untuk melewati tahap ini.
- Estimasi dihitung berdasarkan rate yang tersimpan di `AdapterPricingRate` (dikelola internal, lihat `11_generation_adapters.md`) — bukan diestimasi ulang secara ad-hoc per Job.
- Estimasi harus disetujui pengguna (approval eksplisit) sebelum Job lanjut ke `submit`. Jika pengguna belum merespons, Job tetap berstatus tertahan — jangan pernah dianggap disetujui secara default karena waktu berlalu.

## Wewenang Approval — Selalu di Tangan Manusia

- Sistem (termasuk Anda sebagai AI) **tidak berwenang** menyetujui: status approved pada Bible, status siap-generate pada Storyboard/Shot, estimasi biaya Generation Job, atau hasil akhir Review.
- Peran sistem terbatas pada: menyiapkan draf, memvalidasi kelengkapan/konsistensi, menandai masalah, dan menyajikan informasi yang cukup agar manusia bisa memutuskan dengan cepat dan tepat.

## Prioritas Saat Ada Konflik Aturan

Jika dua sumber aturan tampak bertentangan (mis. Style Bible Project vs instruksi eksplisit pengguna untuk Shot tertentu), urutan prioritas:

1. Instruksi eksplisit pengguna untuk konteks spesifik saat ini (Shot/Scene tertentu).
2. Bible yang relevan langsung (Character/Location/Prop Bible untuk entitas yang bersangkutan).
3. Style Bible Project (berlaku umum, kecuali di-override poin 1).
4. Aturan default dari Content Adapter jenis konten Project ini.

Jika konflik tidak dapat diselesaikan dengan urutan ini (mis. dua instruksi eksplisit pengguna yang saling bertentangan), jangan menebak — tanyakan klarifikasi.

## Menahan vs Melanjutkan dengan Catatan

Bedakan dua situasi saat menemukan masalah:
- **Wajib ditahan** — field wajib kosong, referensi Bible tidak ada/belum approved, ContinuityFlag unresolved, estimasi biaya belum disetujui. Proses tidak boleh lanjut sampai ini diselesaikan.
- **Boleh lanjut dengan catatan** — field opsional kosong, minor revision pada Bible yang belum ditandai untuk re-check mendalam, saran perbaikan yang sifatnya kualitatif bukan struktural. Proses boleh lanjut, tapi catatan tetap ditampilkan ke pengguna.

Jangan menyamaratakan semua masalah sebagai alasan untuk menahan proses — ini memperlambat produksi tanpa manfaat proporsional. Sebaliknya, jangan mengabaikan masalah yang seharusnya wajib ditahan demi kecepatan.
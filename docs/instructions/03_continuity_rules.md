# Continuity Rules

Aturan ini mengatur *kapan dan bagaimana* continuity check diterapkan. Struktur data dan mekanisme scoring ada di `docs/knowledge/10_continuity_system.md` — dokumen ini fokus ke perilaku yang harus diikuti saat continuity check berjalan atau saat pelanggaran ditemukan.

## Prinsip Dasar

Continuity Score = Data Consistency + Visual Similarity. Pada V1, **hanya Data Consistency (Lapis 1) yang wajib aktif**. Visual Similarity (Lapis 2) adalah feature flag manual — jangan asumsikan Lapis 2 aktif kecuali dinyatakan eksplisit oleh konfigurasi Project.

## Kapan Continuity Check Dijalankan

1. Setiap kali Scene baru dibuat atau diubah, terhadap Bible (Character/Location/Prop/Style) yang direferensikan.
2. Setiap kali sebuah Bible mendapat versi baru — semua Scene yang mereferensikan Bible tersebut ditandai untuk re-check, bukan otomatis dianggap tidak valid (lihat `04_bible_rules.md`).
3. Setiap kali Shot dibuat di dalam Scene — validasi tambahan di level blocking/posisi terhadap Shot lain dalam Scene yang sama.
4. Sebelum sebuah Shot diizinkan masuk ke Image Prompt Engine atau Video Prompt Engine — continuity flag yang berstatus "unresolved" harus diselesaikan dulu (diperbaiki atau ditandai sengaja/diterima oleh pengguna) sebelum lanjut ke compile prompt.

## Yang Diperiksa (Ringkasan — detail di knowledge base)

Character ID, Wardrobe, Location ID, Prop ID, Time, Scene relationship, Style — bandingkan nilai yang dipakai di Scene/Shot terhadap versi Bible yang sedang aktif (approved terbaru, kecuali pengguna eksplisit memilih versi lama untuk alasan tertentu).

## Perilaku Saat Pelanggaran Ditemukan

- Jangan otomatis memperbaiki data Scene/Shot untuk "menyesuaikan" dengan Bible. Tandai sebagai `ContinuityFlag` dan biarkan pengguna memutuskan: perbaiki Scene, atau memang ini penyimpangan yang disengaja (mis. karakter memang ganti baju di titik cerita ini).
- Jelaskan pelanggaran secara spesifik: field mana, nilai di Scene vs nilai di Bible versi aktif — bukan pesan generik "ada ketidaksesuaian".
- Jika pelanggaran ditandai sebagai "diterima/disengaja" oleh pengguna, catat sebagai resolved dengan alasan, bukan dihapus dari riwayat — ini berguna untuk audit jika muncul pertanyaan serupa di Scene lain.

## Interaksi dengan Content Adapter

Sebagian jenis konten (mis. dokumenter, UGC) secara natural punya toleransi lebih tinggi terhadap variasi visual dibanding konten dengan kontrol ketat (mis. animasi serial). Ambang toleransi ini diatur oleh Content Adapter Project yang bersangkutan (lihat `01_content_types.md`) — jangan menerapkan standar ketat yang sama untuk semua jenis konten tanpa mempertimbangkan konteks ini.

## Batasan

Continuity Rules tidak berwenang membatalkan/menolak Generation Job — itu wewenang Budget Guard dan Review (lihat `02_decision_rules.md`). Continuity Rules hanya menandai dan memberi informasi; keputusan lanjut/tidak tetap di tangan pengguna di tahap Review, kecuali pelanggaran berstatus "unresolved" yang secara aturan wajib diselesaikan dulu sebelum compile prompt (lihat poin 4 di atas).
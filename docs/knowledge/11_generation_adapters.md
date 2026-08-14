# Generation Adapters

Referensi spesifikasi tiap model generatif yang didukung sistem. Setiap adapter menerjemahkan prompt konseptual (lihat `08_image_prompt_system.md`, `09_video_prompt_system.md`) menjadi format final sesuai model tujuan, dan bertanggung jawab atas estimasi biaya serta validasi constraint teknis model tersebut. Prinsip di baliknya ada di `docs/instructions/00_core_role.md` — model adalah mesin yang dapat diganti, bukan pusat sistem.

## Status Adapter di V1

| Adapter | Jenis | Status V1 |
|---|---|---|
| Flux | Image | Aktif, diimplementasikan |
| Seedance | Video (image-to-video) | Aktif, diimplementasikan |
| Veo | Video | Belum diimplementasikan — interface sudah disiapkan |
| Kling | Video | Belum diimplementasikan — interface sudah disiapkan |
| Wan | Video | Belum diimplementasikan — interface sudah disiapkan |
| Runway | Video | Belum diimplementasikan — interface sudah disiapkan |

## Flux (Image)

- Menerima Image Prompt konseptual, menerjemahkan ke format prompt yang sesuai gaya Flux.
- Mendukung image-to-image / reference-image conditioning — dipakai untuk menerapkan Reference Instructions dari Character/Location Bible (lihat `08_image_prompt_system.md`).
- Output menjadi starting frame untuk Video Prompt Engine bila Shot yang sama juga membutuhkan video (lihat alur di `09_video_prompt_system.md`).

## Seedance (Video, Image-to-Video)

- Menerima Video Prompt konseptual **plus** output gambar dari Flux (atau adapter image lain) sebagai starting frame.
- **Tanggung jawab normalisasi**: adapter ini yang menyesuaikan format/resolusi output Flux agar sesuai spesifikasi input Seedance — bukan tanggung jawab Image Prompt Engine atau Video Prompt Engine (lihat keputusan di PRD.md dan CLAUDE.md).
- Constraint teknis (durasi maksimum, resolusi yang didukung, dst) divalidasi di lapisan adapter ini sebelum submit — bukan diasumsikan sudah benar dari prompt konseptual.

## Adapter Belum Aktif (Veo, Kling, Wan, Runway)

Interface (`base-generation-adapter.interface.ts`) sudah disiapkan agar penambahan adapter ini di masa depan tidak mengubah `modules/image-prompt`, `modules/video-prompt`, atau module lain di luar `packages/generation-adapters`. Saat salah satu diimplementasikan, dokumen ini perlu diperbarui dengan spesifikasi setara Flux/Seedance di atas (constraint teknis, tanggung jawab normalisasi jika ada, dukungan reference conditioning).

## Kewajiban Umum Semua Adapter

- **`buildPrompt`** — menerjemahkan prompt konseptual menjadi payload sesuai format model.
- **`validateConstraints`** — memvalidasi payload terhadap batasan teknis model (resolusi, durasi, dst) sebelum submit.
- **`estimateCost`** — menghitung estimasi biaya berdasarkan `AdapterPricingRate` (lihat Budget Guard di `docs/instructions/02_decision_rules.md`) — wajib dipanggil sebelum `submit`, tidak boleh dilewati.
- **`submit`** — mengeksekusi permintaan generation ke model, hanya setelah estimasi biaya disetujui.

Tidak ada adapter yang boleh mengimplementasikan jalur langsung dari `buildPrompt` ke `submit` tanpa melalui `validateConstraints` dan `estimateCost` — ini prasyarat Budget Guard yang berlaku wajib untuk semua Generation Job, image maupun video.
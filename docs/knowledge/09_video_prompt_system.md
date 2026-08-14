# Video Prompt System

Referensi struktur data untuk Video Prompt konseptual. Dibangun di atas Image Prompt yang sudah ada untuk Shot yang sama (lihat `docs/instructions/07_prompt_rules.md`) — dokumen ini fokus pada elemen gerak yang ditambahkan di atasnya.

## Subject *(diwarisi dari Image Prompt)*

- Character dan Prop yang sama seperti di Image Prompt untuk Shot ini — tidak dideskripsikan ulang, cukup dirujuk sebagai kondisi awal (starting frame) untuk gerakan yang akan terjadi.

## Action *(wajib)*

- Diambil dari field Action di Scene, dipersempit ke porsi yang relevan dengan Shot spesifik ini (satu Scene bisa punya beberapa Shot, masing-masing mencakup sebagian dari Action penuh Scene).

## Character Motion *(wajib jika ada Character di Shot)*

- Gerakan spesifik tiap Character selama durasi Shot — bukan hanya "berjalan", tapi arah, kecepatan relatif, dan bagaimana gerakan ini terhubung dengan Emotion yang tercatat di Scene.

## Camera Motion *(wajib)*

- Diambil dari Camera Movement di Storyboard Engine, diterjemahkan menjadi instruksi gerak kamera yang jelas selama durasi Shot.

## Environment Motion *(opsional, isi jika relevan)*

- Elemen lingkungan yang bergerak (angin, air, kerumunan latar, dst) yang mempengaruhi suasana Shot meski bukan fokus utama.

## Physics *(wajib)*

- Bagaimana elemen bergerak harus taat pada logika dunia nyata, kecuali Style Bible Project menyatakan gaya non-realistis secara eksplisit (lihat Prompt Rules).

## Temporal Logic *(wajib)*

- Urutan kejadian dalam durasi Shot — apa yang terjadi di awal, tengah, akhir Shot, terutama penting untuk Shot dengan lebih dari satu beat gerakan.

## Cinematography *(diwarisi, dengan penambahan movement)*

- Sama seperti Camera di Image Prompt, ditambah dimensi waktu dari Camera Motion.

## Constraints *(wajib)*

- Durasi Shot (jika ada batasan dari Content Adapter atau keputusan produksi) dan aspect ratio Project. Batasan teknis spesifik model (mis. durasi maksimum Seedance) ditangani di lapisan adapter.

## Alur Kompilasi

```
Image Prompt (Shot ini) + Action (dari Scene) + Camera Movement (dari Shot)
  → Video Prompt konseptual (field di atas)
  → diterjemahkan oleh Generation Adapter (mis. Seedance) menjadi prompt final,
    termasuk normalisasi format/resolusi dari hasil Image Prompt sebagai starting frame
```
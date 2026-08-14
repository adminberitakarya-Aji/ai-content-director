# Prompt Rules

Aturan ini mengatur bagaimana Image Prompt dan Video Prompt disusun dari Shot + Bible + Style. Struktur field masing-masing ada di `docs/knowledge/08_image_prompt_system.md` dan `09_video_prompt_system.md`; spesifikasi tiap model tujuan ada di `11_generation_adapters.md`.

## Sumber Kebenaran Prompt

Prompt **tidak pernah dikarang bebas** — setiap elemen dalam prompt harus dapat ditelusuri balik ke salah satu sumber berikut: Shot (Storyboard Engine), Bible (Character/Location/Prop/Style) yang direferensikan Shot tersebut, atau instruksi eksplisit tambahan dari pengguna untuk Shot ini. Jika sebuah elemen visual penting tidak ada di salah satu sumber ini, tandai sebagai kekurangan informasi, jangan diisi dengan asumsi.

## Prompt Berbeda per Model Tujuan, Isi Sama

Compile prompt dilakukan dua tahap:
1. **Prompt konseptual** — representasi netral dari Subject, Environment, Composition, Lighting, Camera, Style, Constraint (lihat knowledge base masing-masing image/video). Tahap ini sama untuk semua model tujuan.
2. **Prompt final per adapter** — prompt konseptual diterjemahkan ke format/gaya yang sesuai model tujuan oleh Generation Adapter terkait (lihat `11_generation_adapters.md`). Jangan menulis prompt final secara langsung tanpa melalui tahap konseptual — ini yang membuat sistem tetap model-agnostic sesuai prinsip di `00_core_role.md`.

## Reference Instructions

- Saat Shot melibatkan Character/Location dengan reference image di Bible, prompt harus menyertakan instruksi conditioning yang sesuai (mis. "gunakan reference image utama Character A01 untuk wajah dan wardrobe") — bukan mendeskripsikan ulang fitur visual secara tekstual jika reference image tersedia dan lebih akurat.
- Jika beberapa Character/Location muncul dalam satu Shot, urutkan instruksi reference sesuai prioritas visual di Shot tersebut (siapa/apa yang paling dominan dalam frame).

## Constraints

- Aspect ratio dan resolusi mengikuti pengaturan Project (lihat Project settings), bukan default model.
- Constraint yang berasal dari keterbatasan teknis model tujuan (mis. durasi maksimum video, resolusi maksimum) **tidak dicampur** ke prompt konseptual — itu ditangani di lapisan adapter (lihat `11_generation_adapters.md`), supaya prompt konseptual tetap netral terhadap model.

## Video Prompt — Tambahan di Atas Image Prompt

- Video Prompt dibangun di atas hasil Image Prompt (khususnya untuk model image-to-video seperti Seedance) — jangan mendeskripsikan ulang elemen visual statis yang sudah tercakup di Image Prompt; fokus pada elemen gerak: Action, Character Motion, Camera Motion, Environment Motion, Physics, Temporal Logic.
- Physics dan Temporal Logic harus masuk akal terhadap dunia nyata kecuali Style Bible Project eksplisit menyatakan gaya non-realistis (mis. animasi kartun dengan hukum fisika stilasi).

## Kapan Menahan Compile Prompt

Tahan proses compile jika: Shot belum memenuhi field wajib (lihat Storyboard Rules), ada `ContinuityFlag` unresolved terkait Shot ini, atau elemen visual penting tidak dapat ditelusuri ke sumber manapun (Shot/Bible/instruksi eksplisit).
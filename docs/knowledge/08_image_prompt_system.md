# Image Prompt System

Referensi struktur data untuk Image Prompt konseptual (sebelum diterjemahkan per adapter — lihat `docs/instructions/07_prompt_rules.md` dan `11_generation_adapters.md`). Prompt ini disusun dari kombinasi Shot + Bible + Style.

## Subject *(wajib)*

- Character(s) yang muncul di Shot, diambil dari Character Bible (Identity, Face, Body, Hair, Wardrobe yang relevan) sesuai Character Blocking di Shot.
- Prop yang relevan di Shot ini, diambil dari Prop Bible (Appearance).

## Environment *(wajib)*

- Lokasi tempat Shot berlangsung, diambil dari Location Bible (Exterior/Interior sesuai konteks Shot, Atmosphere).

## Composition *(wajib)*

- Diambil langsung dari field Composition dan Framing di Shot (Storyboard Engine).

## Lighting *(wajib)*

- Kombinasi Lighting dari Location Bible (kondisi default lokasi) dan Lighting umum dari Style Bible (arah pencahayaan Project) — jika ada Shot-specific lighting instruction dari pengguna, itu menjadi prioritas di atas keduanya.

## Camera *(wajib)*

- Diambil dari Camera Position, Lens (jika ada), dan Shot Type di Storyboard Engine.

## Style *(wajib)*

- Diambil dari Style Bible: Visual Style, Color, Texture (jika ada). Ini elemen yang paling konsisten muncul di semua Image Prompt dalam satu Project.

## Reference Instructions *(wajib jika Bible terkait punya reference image)*

- Instruksi conditioning terhadap reference image Character/Location yang relevan (lihat Prompt Rules untuk detail prioritas saat banyak reference).

## Constraints *(wajib)*

- Aspect ratio dan resolusi sesuai pengaturan Project. Batasan teknis spesifik model (mis. resolusi maksimum Flux) ditangani di lapisan adapter, bukan di sini.

## Alur Kompilasi

```
Shot + Character Bible + Location Bible + Prop Bible + Style Bible
  → Image Prompt konseptual (field di atas)
  → diterjemahkan oleh Generation Adapter (mis. Flux) menjadi prompt final
```
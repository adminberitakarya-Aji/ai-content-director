# Storyboard System

Referensi struktur data untuk entitas Shot. Aturan perilaku penyusunannya ada di `docs/instructions/06_storyboard_rules.md` — dokumen ini fokus ke field apa saja yang ada dan bentuknya.

## Shot List *(struktur induk)*

- Kumpulan Shot yang berurutan di bawah satu Scene. Urutan eksplisit dan tidak boleh ambigu (lihat Storyboard Rules).

## Shot Type *(wajib)*

- Kategori umum: extreme wide shot, wide shot, medium shot, close-up, extreme close-up, over-the-shoulder, POV, dan variasi lain sesuai kebutuhan produksi.

## Framing *(wajib)*

- Bagaimana subjek diposisikan dalam frame — rule of thirds, center framing, negative space, dst.

## Composition *(wajib)*

- Elemen visual dalam frame dan hubungan spasialnya — apa yang ada di foreground, midground, background; bagaimana leading lines atau elemen visual lain mengarahkan perhatian.

## Camera Position *(wajib)*

- Posisi kamera relatif terhadap subjek — eye-level, high angle, low angle, bird's eye, dst; jarak kamera ke subjek.

## Lens *(opsional, disarankan untuk gaya sinematik spesifik)*

- Jenis lensa/focal length yang diinginkan (wide lens, telephoto, dst) jika Project butuh kontrol sinematik detail. Untuk konten yang tidak butuh kontrol lensa spesifik (mis. UGC, social video kasual), field ini boleh dikosongkan.

## Camera Movement *(wajib untuk Project video)*

- Pergerakan kamera selama Shot berlangsung — static, pan, tilt, dolly, tracking, handheld, dst. Untuk Project image-only, field ini bisa dikosongkan atau diisi "static".

## Character Blocking *(wajib jika ada Character di Shot)*

- Posisi dan orientasi tiap Character dalam frame (lihat detail di Storyboard Rules).

## Visual Beat *(wajib)*

- Satu kalimat inti fokus visual utama Shot ini (lihat Storyboard Rules untuk fungsinya bagi Prompt Engine).

## Field Wajib Minimum agar Shot Bisa Lanjut ke Prompt Engine

Shot Type, Framing, Camera Position, Character Blocking (jika relevan), dan Visual Beat. Camera Movement wajib untuk Project yang menghasilkan video; Lens bersifat opsional tergantung kebutuhan kontrol sinematik.
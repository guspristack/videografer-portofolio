# Bayu Pradana · Portofolio Videografer

Showreel full-stack dengan studio produksi untuk persona fiktif Bayu Pradana dari Ruang Karya. Galeri publik menyediakan showreel, film unggulan, klip, dan tautan langsung ke setiap pemutar.

## Studio

- Simpan film sebagai draf, isi detailnya, dan pilih posisi showreel, film unggulan, atau klip.
- Di tab **Media**, unggah atau ganti video MP4 H.264 (audio AAC jika ada), poster JPEG/PNG/WebP, dan takarir WebVTT UTF-8. Isi teks alternatif poster dan bahasa takarir di tab **Film**.
- Studio membaca durasi dan keberadaan audio dari MP4 serta menyediakan pratinjau sebelum publikasi.
- Di tab **Kredit produksi**, kelola nama, peran, studio, dan urutan tampil.

Batas unggahan per file adalah 100 MB untuk video, 12 MB untuk poster, dan 256 KB untuk takarir. Pemutar mendukung permintaan byte range untuk seek. PostgreSQL menyimpan metadata, takarir, kredit, dan sesi. Berkas video dan poster disimpan di `MEDIA_ROOT` (bawaan `.media`). Cadangkan direktori media bersama database agar proyek dapat dipulihkan lengkap.

## Menjalankan secara lokal

Siapkan Node.js 24 dan PostgreSQL. Salin `.env.example` ke `.env` dan isi `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD`. Gunakan kata sandi admin minimal 16 karakter. Perintah pertama membuat nilai acak untuk rahasia sesi.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm ci
npm run db:migrate
npm run db:seed
npm run admin:provision
npm run dev
```

Mode pengembangan memakai [portofolio lokal](http://127.0.0.1:5180/) dan [studio admin](http://127.0.0.1:5180/admin). Pengisian awal menyediakan lima video, termasuk film pendek **Lampu terakhir** dengan takarir. `admin:provision` membuat atau mereset akun admin dan mengakhiri sesi sebelumnya.

Untuk memakai hasil build lokal, atur `APP_ORIGIN=http://127.0.0.1:4180`, jalankan `npm run build`, lalu `npm start`. Frontend memakai React, Vite, TypeScript, dan CSS Modules. Express menyediakan API dan Prisma mengelola PostgreSQL.

## Kredit

- Pengembangan oleh [guspriaman](https://github.com/guspriaman) untuk [guspriStack](https://github.com/guspristack).
- Desain portofolio, potret, poster generatif, dan animatik contoh berasal dari Ruang Karya. Kredit produksi film contoh memakai persona fiktif Bayu Pradana.

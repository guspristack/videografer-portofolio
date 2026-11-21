const films = [
  {
    id: 'cahaya-kota',
    name: 'Cahaya kota',
    type: 'Dokumenter kota',
    still: "film-city",
    video: "cahaya-kota",
    alt: 'Pedagang di pasar malam dengan cahaya yang terpantul di jalan basah.',
    description: 'Studi suasana pasar malam. Gerak mendekat perlahan mengarahkan perhatian ke pedagang dan cahaya gerobaknya.',
    role: 'Penyuntingan dan penataan warna',
    duration: 4,
  },
  {
    id: 'arus-selatan',
    name: 'Arus selatan',
    type: 'Film perjalanan',
    still: "film-coast",
    video: "arus-selatan",
    alt: 'Peselancar berjalan membawa papan di pantai berpasir gelap.',
    description: 'Studi skala antara peselancar dan garis pantai. Gerak menjauh memberi ruang pada tebing dan ombak.',
    role: 'Konsep visual dan penyuntingan',
    duration: 4,
  },
  {
    id: 'tangan-dan-tanah',
    name: 'Tangan dan tanah',
    type: 'Potret pengrajin',
    still: "film-craft",
    video: "tangan-dan-tanah",
    alt: 'Tangan pengrajin membentuk tanah liat pada meja putar.',
    description: 'Studi detail proses keramik dengan perhatian pada tekstur tanah liat, gerak tangan, dan cahaya jendela.',
    role: 'Penyuntingan dan pengaturan gerak gambar',
    duration: 4,
  },
];
const reel = {
  id: 'showreel',
  name: 'Showreel Bayu',
  type: 'Kompilasi animatik',
  still: "film-city",
  video: "showreel",
  description: 'Tiga studi visual pendek tentang pasar malam, perjalanan pesisir, dan proses kerja pengrajin.',
  role: 'Kurasi dan penyuntingan showreel',
  duration: 12,
};
const shortFilm = {
  id: 'lampu-terakhir',
  name: 'Lampu terakhir',
  type: 'Film pendek animatik',
  still: "film-city",
  video: "lampu-terakhir",
  description: 'Sebuah gerobak bersiap, memasak, lalu menutup malamnya. Ritme potongan mengikuti perubahan bunyi dari hujan, ke desis wajan, hingga jalan yang kembali tenang.',
  role: 'Penyuntingan gambar, ritme adegan, dan rancangan suara',
  duration: 42,
  sound: true,
};

export { films, reel, shortFilm };

// Titik masuk untuk hosting Passenger (cPanel "Setup Node.js App"): isi Application startup file dengan `app.cjs`.
// Di Passenger, server/index.js tidak dijalankan langsung sehingga tidak memanggil listen() sendiri (hasilnya 503).
// File ini memuat aplikasi (ESM) lalu memanggil listen(); Passenger yang mengatur port/socket-nya.
Promise.all([import("./server/index.js"), import("./server/config.js")])
  .then(([{ createApp }, { config }]) => {
    createApp().listen(config.port, () => console.log(`FasiReport berjalan (port ${config.port})`));
  })
  .catch((err) => {
    // Tampil di stderr.log aplikasi agar penyebab 503 mudah dicari (mis. JWT_SECRET belum diisi)
    console.error("FasiReport gagal start:", err && err.message ? err.message : err);
    process.exit(1);
  });

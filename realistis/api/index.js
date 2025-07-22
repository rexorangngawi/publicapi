// api/index.js

// 1. Import Modul yang Diperlukan
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios'); // Untuk mengambil gambar dari URL
const app = express();
const port = process.env.PORT || 3000;

// 2. Konfigurasi Awal & Inisialisasi Klien Gemini
// Memastikan API Key disetel sebagai environment variable
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set. Please set it as an environment variable.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);
const modelName = "gemini-2.0-flash-exp-image-generation"; // Model Gemini yang digunakan

// 3. Prompt Default (Hardcoded)
// Prompt ini akan selalu digunakan untuk setiap permintaan
const DEFAULT_PROMPT = `Ubah background foto ini menjadi super realistik HD sore hari langit tajam refleksi cahaya matahari HD sore hari. Jangan ubah apapun dari objek utama di depan (misalnya orang, hewan, atau benda). Tingkatkan kualitas foto jadi HD: buat lebih tajam, detail, dan bersih, tapi tetap alami dan realistis.`;

// 4. Middleware Global
// Mengatur Express untuk parsing JSON di body permintaan
app.use(express.json());

// 5. Rute Utama (Root Route)
// Rute sederhana untuk halaman utama API
app.get('/', (req, res) => {
    res.send('Welcome to the Image Enhancement API! Use POST /enhance-image-from-url to process an image from a URL.');
});

// 6. Rute Utama untuk Pemrosesan Gambar
// Endpoint POST untuk menerima URL gambar, memproses, dan mengembalikan Base64
app.post('/enhance-image-from-url', async (req, res) => {
    try {
        // a. Validasi Input
        const imageUrl = req.body.imageUrl;
        if (!imageUrl) {
            return res.status(400).json({ error: "Please provide an 'imageUrl' in the request body." });
        }

        // b. Mengambil Gambar dari URL
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        // c. Menyiapkan Data Gambar untuk Model Gemini
        const imagePart = {
            inlineData: {
                mimeType: imageResponse.headers['content-type'] || 'image/jpeg', // Deteksi MIME type
                data: imageBuffer.toString('base64'), // Konversi ke Base64
            },
        };

        // d. Memanggil Model Gemini
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([DEFAULT_PROMPT, imagePart]); // Kirim prompt dan gambar
        const response = await result.response;

        // e. Mengekstrak Hasil Gambar dari Respons Model
        let imageData = null;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                imageData = part.inlineData.data; // Dapatkan data Base64
                break;
            }
        }

        // f. Mengirim Respons ke Klien
        if (imageData) {
            res.status(200).json({
                image_base64: imageData,
                mime_type: 'image/png' // Asumsi output PNG
            });
        } else {
            res.status(500).json({ error: "No image data received from the Generative AI model." });
        }

    } catch (error) {
        // g. Penanganan Error
        console.error("Error enhancing image from URL:", error);
        res.status(500).json({
            error: "Failed to enhance image",
            details: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

// 7. Pengaturan Server untuk Pengembangan Lokal
// Hanya berjalan jika tidak di lingkungan produksi (Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

// 8. Ekspor Aplikasi (Untuk Vercel)
// Vercel akan menggunakan 'module.exports' sebagai entry point
module.exports = app;
                                                

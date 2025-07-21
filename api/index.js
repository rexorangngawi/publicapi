const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/download-tiktok', async (req, res) => {
    const { tiktok_url } = req.body;

    if (!tiktok_url) {
        return res.status(400).json({ error: "Missing 'tiktok_url' in request body." });
    }

    try {

        const dlpandaRequestUrl = `${process.env.DLPANDA_BASE_URL || 'https://dlpanda.com/'}?url=${encodeURIComponent(tiktok_url)}`;

        const dlpandaResponse = await axios.get(dlpandaRequestUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            
            maxRedirects: 0, 
            validateStatus: (status) => status >= 200 && status < 400
        });

        let finalDownloadUrl = null;
        
        if (dlpandaResponse.status >= 300 && dlpandaResponse.status < 400) {
            finalDownloadUrl = dlpandaResponse.headers.location;
        } else {
            const $ = cheerio.load(dlpandaResponse.data);
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('tiktokcdn.com') && href.includes('video/')) {
                    finalDownloadUrl = href;
                    return false;
                }
            });
        }

        if (!finalDownloadUrl) {
            console.error("No download URL found:", dlpandaResponse.data);
            return res.status(500).json({ error: "Failed to find video download URL from DLPanda.com. The site structure may have changed or the video is unavailable." });
        }

        if (finalDownloadUrl.startsWith('/')) {
            finalDownloadUrl = (process.env.DLPANDA_BASE_URL || 'https://dlpanda.com') + finalDownloadUrl;
        }

        const videoResponse = await axios.get(finalDownloadUrl, {
            responseType: 'arraybuffer'
        });

        const videoBase64 = Buffer.from(videoResponse.data).toString('base64');

        res.status(200).json({
            status: "success",
            tiktok_url: tiktok_url,
            video_base64: videoBase64,
            message: "Video successfully downloaded and encoded to Base64."
        });

    } catch (error) {
        console.error("Error downloading TikTok video:", error);
        if (error.response) {
            res.status(error.response.status).json({
                error: `Failed to fetch from external service. Status: ${error.response.status}`,
                details: error.message
            });
        } else if (error.request) {

            res.status(500).json({ error: "No response received from external service.", details: error.message });
        } else {

            res.status(500).json({ error: "An unexpected error occurred.", details: error.message });
        }
    }
});

app.get('/', (req, res) => {
    res.status(200).send('TikTok Downloader API is running!');
});

module.exports = app;

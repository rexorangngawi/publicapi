// Vercel Function API (Node.js)
import { writeFile, unlink } from 'fs/promises';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { url } = req.body;
  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ error: 'Invalid TikTok URL' });
  }

  try {
    // Step 1: Request to Musicaldown landing page
    const base = 'https://musicaldown.com';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    };

    // Step 2: POST video URL to get download form
    const formData = new URLSearchParams();
    formData.append('url', url);
    formData.append('submit', '');

    const r1 = await fetch(`${base}/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const html = await r1.text();
    const $ = cheerio.load(html);
    const downloadLink = $('a[href*="/download/"]').first().attr('href');

    if (!downloadLink) {
      return res.status(500).json({ error: 'Failed to fetch download link' });
    }

    // Step 3: Download the video
    const videoResp = await fetch(downloadLink);
    const buffer = await videoResp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Optional: Use Data URI prefix
    const mime = 'video/mp4';
    const dataUri = `data:${mime};base64,${base64}`;

    return res.status(200).json({ base64: dataUri });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
      }

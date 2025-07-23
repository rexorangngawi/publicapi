// api/tiktok.js
import { load } from 'cheerio';
import fetch from 'node-fetch';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'No URL provided' }), { status: 400 });
    }

    // Resolve TikTok shortlink
    const response = await fetch(url, { redirect: 'follow' });
    const finalUrl = response.url;

    // Fetch musicaldown.com
    const home = await fetch('https://musicaldown.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const homeHtml = await home.text();
    const $ = load(homeHtml);
    const token = $('input[name="token"]').val();

    // Submit form
    const form = await fetch('https://musicaldown.com/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      body: new URLSearchParams({
        url: finalUrl,
        token,
      }),
    });

    const formHtml = await form.text();
    const $$ = load(formHtml);
    const downloadLink = $$('a[href^="https://cdn"]').attr('href');

    if (!downloadLink) {
      return new Response(JSON.stringify({ error: 'Failed to fetch download link' }), { status: 500 });
    }

    return new Response(JSON.stringify({ url: downloadLink }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

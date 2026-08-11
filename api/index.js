const axios = require('axios');

// Random Modern Real Browser User-Agents Pool
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

module.exports = async (req, res) => {
    // 1. Enable Full CORS for Web & Mobile Players
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Extract Query Parameters
    let videoUrl = req.query.url;
    const origin = req.query.origin || 'https://filmboom.top';
    const referer = req.query.referer || 'https://filmboom.top/';

    if (!videoUrl) {
        return res.status(400).send(
            '🚀 Vercel Ultra Fast Video Proxy Server (Active)\n\n' +
            'Usage: ?url=<video_url>&origin=<origin>&referer=<referer>\n\n' +
            'Features:\n' +
            '✔ High Speed Edge Streaming\n' +
            '✔ Zero Cloudflare 427 Block\n' +
            '✔ Random Real Browser User-Agent Rotation\n' +
            '✔ Force Inline Playback (No Auto Download)\n' +
            '✔ Full Range Seeking & CORS Unlocked'
        );
    }

    try {
        if (videoUrl.includes('%')) videoUrl = decodeURIComponent(videoUrl);
        if (videoUrl.includes('%')) videoUrl = decodeURIComponent(videoUrl);

        // 3. Build Spoofed Headers
        const headers = {
            'User-Agent': getRandomUserAgent(),
            'Referer': referer,
            'Origin': origin
        };

        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // 4. Stream Video directly from target CDN
        const response = await axios({
            method: 'get',
            url: videoUrl,
            headers: headers,
            responseType: 'stream',
            validateStatus: () => true,
            timeout: 20000
        });

        // 5. Set Headers for Fast Video Streaming & Seeking
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Accept-Ranges', 'bytes');

        if (response.headers['content-range']) {
            res.setHeader('Content-Range', response.headers['content-range']);
        }
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        res.status(response.status);
        response.data.pipe(res);

    } catch (error) {
        res.status(500).send('Proxy Exception: ' + error.message);
    }
};

const axios = require('axios');

// User-Agent Pool
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || 'home';
    const ua = getRandomUserAgent();

    try {
        // ACTION 1: Home Page / Search HTML UI
        if (action === 'home') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MovieBox Web Debugger & Player</title>
                <style>
                    body { background: #0f172a; color: #e2e8f0; font-family: sans-serif; padding: 20px; text-align: center; }
                    h1 { color: #38bdf8; }
                    .search-box { margin: 20px 0; }
                    input { padding: 10px; width: 300px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; }
                    button { padding: 10px 15px; border-radius: 6px; border: none; background: #0284c7; color: #fff; cursor: pointer; }
                    .grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 20px; }
                    .card { background: #1e293b; padding: 10px; border-radius: 8px; width: 160px; text-align: center; }
                    .card img { width: 100%; border-radius: 6px; height: 220px; object-fit: cover; }
                    .card a { display: block; margin-top: 8px; color: #38bdf8; text-decoration: none; font-weight: bold; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>🎬 MovieBox Live Web Debugger</h1>
                <p>All-in-one: Vercel generates IP-bound signatures & streams seamlessly!</p>
                <form action="/" method="GET" class="search-box">
                    <input type="hidden" name="action" value="search">
                    <input type="text" name="q" placeholder="Search Movie (e.g. Avatar)..." required>
                    <button type="submit">Search</button>
                </form>
                <h2>Trending Movies</h2>
                <div id="content" class="grid">Loading...</div>
                <script>
                    fetch('/?action=api_trending')
                        .then(r => r.json())
                        .then(data => {
                            let html = '';
                            data.forEach(item => {
                                html += \`<div class="card">
                                    <img src="\${item.cover}" alt="poster">
                                    <a href="/?action=play&id=\${item.id}&detail=\${encodeURIComponent(item.detailPath)}">\${item.title}</a>
                                </div>\`;
                            });
                            document.getElementById('content').innerHTML = html;
                        });
                </script>
            </body>
            </html>
            `);
        }

        // ACTION 2: Trending Movies API
        if (action === 'api_trending') {
            const listUrl = 'https://h5-api.aoneroom.com/wefeed-h5api-bff/ranking-list/content?id=872031290915189720&page=1&perPage=12';
            const response = await axios.get(listUrl, { headers: { 'User-Agent': ua } });
            const items = response.data?.data?.subjectList || [];
            const result = items.map(i => ({
                id: i.subjectId,
                title: i.title,
                cover: i.cover?.url || '',
                detailPath: i.detailPath || ''
            }));
            res.setHeader('Content-Type', 'application/json');
            return res.json(result);
        }

        // ACTION 3: Search Movies API
        if (action === 'search') {
            const q = req.query.q || '';
            const searchUrl = 'https://filmboom.top/wefeed-h5-bff/web/subject/search';
            const response = await axios.post(searchUrl, {
                keyword: q,
                page: '1',
                perPage: '12',
                subjectType: '0'
            }, {
                headers: {
                    'User-Agent': ua,
                    'Referer': 'https://filmboom.top/',
                    'Content-Type': 'application/json'
                }
            });
            const items = response.data?.data?.items || [];
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            let html = `<!DOCTYPE html><html><head><title>Search: ${q}</title><style>body{background:#0f172a;color:#fff;font-family:sans-serif;padding:20px;text-align:center;}.grid{display:flex;flex-wrap:wrap;justify-content:center;gap:15px;}.card{background:#1e293b;padding:10px;border-radius:8px;width:160px;}.card img{width:100%;height:220px;object-fit:cover;border-radius:6px;}.card a{color:#38bdf8;text-decoration:none;font-weight:bold;}</style></head><body><h1>Search Results for: ${q}</h1><p><a href="/" style="color:#0284c7;">← Back Home</a></p><div class="grid">`;
            items.forEach(i => {
                html += `<div class="card"><img src="${i.cover?.url || ''}"><a href="/?action=play&id=${i.subjectId}&detail=${encodeURIComponent(i.detailPath || '')}">${i.title}</a></div>`;
            });
            html += `</div></body></html>`;
            return res.send(html);
        }

        // ACTION 4: Play Page Generator (Vercel fetches Play Link using Vercel IP)
        if (action === 'play') {
            const sid = req.query.id;
            const detailPath = req.query.detail || '';

            const playApiUrl = `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`;
            const playHeaders = {
                'User-Agent': ua,
                'Referer': `https://filmboom.top/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`
            };

            const playRes = await axios.get(playApiUrl, { headers: playHeaders });
            const streams = playRes.data?.data?.streams || [];

            if (!streams.length) {
                return res.send('<h2>No stream links found for this title.</h2><p><a href="/">Back</a></p>');
            }

            // High Quality Stream URL generated by Vercel IP!
            const targetStreamUrl = streams[0].url;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Playing Movie</title>
                <style>
                    body { background: #000; color: #fff; margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
                    video { width: 90%; max-width: 1000px; border-radius: 10px; outline:none; box-shadow: 0 0 20px rgba(56,189,248,0.3); }
                    .back { margin-top: 15px; color: #38bdf8; text-decoration: none; }
                </style>
            </head>
            <body>
                <h2>🎬 Live Stream (Zero 426/403 Error)</h2>
                <video controls autoplay name="media">
                    <source src="/?action=stream_pipe&target=${encodeURIComponent(targetStreamUrl)}" type="video/mp4">
                    Your browser does not support video.
                </video>
                <a href="/" class="back">← Back to Catalog</a>
            </body>
            </html>
            `);
        }

        // ACTION 5: Stream Pipe (Vercel streams the video using the same Vercel IP!)
        if (action === 'stream_pipe') {
            const targetUrl = req.query.target;
            if (!targetUrl) return res.status(400).send('Missing target stream URL');

            const headers = {
                'User-Agent': ua,
                'Referer': 'https://filmboom.top/',
                'Origin': 'https://filmboom.top'
            };

            if (req.headers.range) {
                headers['Range'] = req.headers.range;
            }

            const response = await axios({
                method: 'get',
                url: targetUrl,
                headers: headers,
                responseType: 'stream',
                validateStatus: () => true
            });

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
            return response.data.pipe(res);
        }

    } catch (err) {
        return res.status(500).send('Server Error: ' + err.message);
    }
};

const axios = require('axios');

// Random Modern Real Browser User-Agents Pool
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
        // -------------------------------------------------------------
        // ACTION 1: HOME CATALOG PAGE
        // -------------------------------------------------------------
        if (action === 'home') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MovieBox Web Debugger & Streamer</title>
                <style>
                    * { box-sizing: border-box; }
                    body { background: #0b0f19; color: #e2e8f0; font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 25px; }
                    h1 { color: #38bdf8; margin-bottom: 5px; }
                    .search-box { display: flex; justify-content: center; margin: 20px 0; gap: 10px; }
                    input { padding: 12px 16px; width: 320px; border-radius: 8px; border: 1px solid #1e293b; background: #1e293b; color: #fff; font-size: 15px; }
                    button { padding: 12px 20px; border-radius: 8px; border: none; background: #0284c7; color: #fff; font-weight: bold; cursor: pointer; font-size: 15px; }
                    button:hover { background: #0369a1; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 18px; max-width: 1200px; margin: 0 auto; }
                    .card { background: #1e293b; border-radius: 10px; overflow: hidden; transition: transform 0.2s; text-decoration: none; color: #fff; display: flex; flex-direction: column; }
                    .card:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(56,189,248,0.2); }
                    .card img { width: 100%; height: 230px; object-fit: cover; }
                    .card-title { padding: 10px; font-weight: 600; font-size: 14px; text-align: center; color: #f1f5f9; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎬 MovieBox Live Web Hub</h1>
                    <p style="color:#94a3b8;">Click any movie or drama to view Details & Stream</p>
                    <form action="/" method="GET" class="search-box">
                        <input type="hidden" name="action" value="search">
                        <input type="text" name="q" placeholder="Search Movie / Drama..." required>
                        <button type="submit">Search</button>
                    </form>
                </div>
                
                <h2 style="max-width:1200px; margin: 0 auto 15px; color:#38bdf8;">🔥 Trending Movies & TV Shows</h2>
                <div id="content" class="grid">Loading Catalog...</div>

                <script>
                    fetch('/?action=api_trending')
                        .then(r => r.json())
                        .then(data => {
                            let html = '';
                            data.forEach(item => {
                                html += \`<a href="/?action=play&id=\${item.id}&detail=\${encodeURIComponent(item.detailPath)}" class="card">
                                    <img src="\${item.cover}" alt="poster" loading="lazy">
                                    <div class="card-title">\${item.title}</div>
                                </a>\`;
                            });
                            document.getElementById('content').innerHTML = html;
                        }).catch(e => {
                            document.getElementById('content').innerHTML = 'Failed to load trending catalog.';
                        });
                </script>
            </body>
            </html>
            `);
        }

        // -------------------------------------------------------------
        // ACTION 2: TRENDING CATALOG API
        // -------------------------------------------------------------
        if (action === 'api_trending') {
            const listUrl = 'https://h5-api.aoneroom.com/wefeed-h5api-bff/ranking-list/content?id=872031290915189720&page=1&perPage=16';
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

        // -------------------------------------------------------------
        // ACTION 3: SEARCH RESULTS PAGE
        // -------------------------------------------------------------
        if (action === 'search') {
            const q = req.query.q || '';
            const searchUrl = 'https://filmboom.top/wefeed-h5-bff/web/subject/search';
            const response = await axios.post(searchUrl, {
                keyword: q,
                page: '1',
                perPage: '16',
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
            let html = `<!DOCTYPE html><html><head><title>Search: ${q}</title><style>
                body{background:#0b0f19;color:#fff;font-family:sans-serif;padding:20px;text-align:center;}
                h1{color:#38bdf8;}
                .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px;max-width:1200px;margin:20px auto;}
                .card{background:#1e293b;border-radius:10px;overflow:hidden;text-decoration:none;color:#fff;}
                .card img{width:100%;height:230px;object-fit:cover;}
                .card-title{padding:10px;font-size:14px;text-align:center;}
                .back{color:#38bdf8;text-decoration:none;font-weight:bold;font-size:16px;}
            </style></head><body>
                <h1>Search Results for: "${q}"</h1>
                <p><a href="/" class="back">← Back to Home</a></p>
                <div class="grid">`;
            items.forEach(i => {
                html += `<a href="/?action=play&id=${i.subjectId}&detail=${encodeURIComponent(i.detailPath || '')}" class="card">
                    <img src="${i.cover?.url || ''}">
                    <div class="card-title">${i.title}</div>
                </a>`;
            });
            html += `</div></body></html>`;
            return res.send(html);
        }

        // -------------------------------------------------------------
        // ACTION 4: MOVIE / DRAMA DETAILS & PLAYER PAGE
        // -------------------------------------------------------------
        if (action === 'play') {
            const sid = req.query.id;
            let detailPath = req.query.detail || '';
            let reqSe = req.query.se;
            let reqEp = req.query.ep;

            let subject = null;
            let resourceData = null;

            // 1. Fetch Subject Detail Metadata
            try {
                const detailRes = await axios.get(`https://filmboom.top/wefeed-h5-bff/web/subject/detail?subjectId=${sid}`, {
                    headers: { 'User-Agent': ua, 'Referer': 'https://filmboom.top/' }
                });
                subject = detailRes.data?.data?.subject || null;
                resourceData = detailRes.data?.data?.resource || null;
                if (!detailPath && subject?.detailPath) {
                    detailPath = subject.detailPath;
                }
            } catch (e) {}

            const title = subject?.title || 'Watch Media';
            const poster = subject?.cover?.url || '';
            const description = subject?.description || 'No description available.';
            const releaseDate = subject?.releaseDate || '';
            const genre = subject?.genre || '';
            const rating = subject?.imdbRatingValue || 'N/A';
            const country = subject?.countryName || '';

            // Determine Season & Episode
            let se = reqSe;
            let ep = reqEp;

            // Auto-detect season and episode if not specified (Fix 0 || 1 JS bug)
            if (se === undefined || ep === undefined) {
                if (resourceData?.seasons && resourceData.seasons.length > 0) {
                    const s0 = resourceData.seasons[0].se;
                    se = s0 !== undefined && s0 !== null ? String(s0) : (subject?.subjectType === 2 ? '1' : '0');
                    ep = (se === '0') ? '0' : '1';
                } else if (subject?.subjectType === 2) {
                    se = '1';
                    ep = '1';
                } else {
                    se = '0';
                    ep = '0';
                }
            }

            const playHeaders = {
                'User-Agent': ua,
                'Referer': `https://filmboom.top/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                'Origin': 'https://filmboom.top'
            };

            let streams = [];
            
            // Try 1: Specified se & ep
            try {
                const playRes = await axios.get(`https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`, { headers: playHeaders });
                streams = playRes.data?.data?.streams || [];
            } catch (e) {}

            // Fallback 1: Try se=1, ep=1 if episode 0 failed
            if (!streams.length && (se === '0' || se === 0)) {
                try {
                    const playRes2 = await axios.get(`https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=1&ep=1`, { headers: playHeaders });
                    streams = playRes2.data?.data?.streams || [];
                    if (streams.length) { se = '1'; ep = '1'; }
                } catch (e) {}
            }

            // Fallback 2: Try se=0, ep=0 if se=1, ep=1 failed
            if (!streams.length && (se === '1' || se === 1)) {
                try {
                    const playRes3 = await axios.get(`https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`, { headers: playHeaders });
                    streams = playRes3.data?.data?.streams || [];
                    if (streams.length) { se = '0'; ep = '0'; }
                } catch (e) {}
            }

            // Build Episode Selector Buttons if seasons exist (TV Series only)
            let episodeButtonsHtml = '';
            if (resourceData?.seasons && resourceData.seasons.length > 0 && resourceData.seasons[0].se > 0) {
                const s0 = resourceData.seasons[0];
                const maxEp = s0.maxEp || 1;
                if (maxEp > 0) {
                    episodeButtonsHtml = '<div class="episodes-container"><h3>Episodes</h3><div class="ep-grid">';
                    for (let i = 1; i <= maxEp; i++) {
                        const activeClass = (String(i) === String(ep)) ? 'active-ep' : '';
                        episodeButtonsHtml += `<a href="/?action=play&id=${sid}&detail=${encodeURIComponent(detailPath)}&se=${s0.se}&ep=${i}" class="ep-btn ${activeClass}">Episode ${i}</a>`;
                    }
                    episodeButtonsHtml += '</div></div>';
                }
            }

            // Video Player Section HTML
            let playerHtml = '';
            if (streams.length) {
                const targetStreamUrl = streams[0].url;
                playerHtml = `
                    <div class="player-wrapper">
                        <video controls autoplay name="media" poster="${poster}">
                            <source src="/?action=stream_pipe&target=${encodeURIComponent(targetStreamUrl)}" type="video/mp4">
                            Your browser does not support video playback.
                        </video>
                    </div>
                `;
            } else {
                playerHtml = `
                    <div class="no-stream">
                        ⚠️ Stream links currently unavailable for Season ${se} Episode ${ep}.
                    </div>
                `;
            }

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - Details & Stream</title>
                <style>
                    body { background: #0b0f19; color: #e2e8f0; font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; }
                    .container { max-width: 1000px; margin: 0 auto; }
                    .back-btn { color: #38bdf8; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
                    .details-card { display: flex; flex-wrap: wrap; gap: 20px; background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
                    .poster { width: 200px; height: 280px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
                    .info { flex: 1; min-width: 260px; }
                    .title { font-size: 26px; color: #38bdf8; margin: 0 0 10px 0; }
                    .meta { font-size: 14px; color: #94a3b8; margin-bottom: 12px; }
                    .meta span { background: #334155; color: #fff; padding: 3px 8px; border-radius: 4px; margin-right: 6px; }
                    .plot { font-size: 15px; line-height: 1.6; color: #cbd5e1; }
                    .player-wrapper { width: 100%; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 0 25px rgba(56,189,248,0.3); }
                    video { width: 100%; display: block; max-height: 600px; }
                    .no-stream { padding: 30px; text-align: center; background: #1e293b; border-radius: 12px; color: #f87171; font-size: 16px; }
                    .episodes-container { margin: 20px 0; }
                    .episodes-container h3 { color: #38bdf8; margin-bottom: 10px; }
                    .ep-grid { display: flex; flex-wrap: wrap; gap: 8px; }
                    .ep-btn { background: #1e293b; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; font-size: 14px; }
                    .ep-btn:hover { background: #334155; }
                    .active-ep { background: #0284c7 !important; color: #fff !important; }
                </style>
            </head>
            <body>
                <div class="container">
                    <a href="/" class="back-btn">← Back to Catalog</a>
                    
                    <div class="details-card">
                        <img src="${poster}" class="poster" alt="poster">
                        <div class="info">
                            <h1 class="title">${title}</h1>
                            <div class="meta">
                                <span>⭐ IMDb ${rating}</span>
                                <span>📅 ${releaseDate}</span>
                                <span>🌐 ${country}</span>
                                <p style="margin-top:8px;"><strong>Genres:</strong> ${genre}</p>
                            </div>
                            <div class="plot">${description}</div>
                        </div>
                    </div>

                    ${episodeButtonsHtml}

                    ${playerHtml}
                </div>
            </body>
            </html>
            `);
        }

        // -------------------------------------------------------------
        // ACTION 5: STREAM PIPE (Vercel streams using Vercel IP)
        // -------------------------------------------------------------
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

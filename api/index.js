const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const SE_ASIAN_IPS = [
    '103.230.104.5',
    '180.252.120.10',
    '110.137.45.12'
];

function getRandomSEAsianIP() {
    return SE_ASIAN_IPS[Math.floor(Math.random() * SE_ASIAN_IPS.length)];
}

const MAIN_URL = "https://moviebox.ph";
const MAIN_API_URL = "https://h5-api.aoneroom.com";
const SECOND_API_URL = "https://filmboom.top";

module.exports = async (req, res) => {
    // 1. Full CORS & Expose Media Range Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const host = req.headers.host || 'vercel-video-proxy-ecru.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const api = req.query.api || req.query.action || 'docs';

    try {
        // =============================================================
        // 0. PREMIUM WEB VIDEO PLAYER INTERFACE (?api=player&id=...)
        // =============================================================
        if (api === 'player' || api === 'watch') {
            const sid = req.query.id || "7901815314139468256";
            
            // Fetch metadata and streams from internal handler
            let subject = null;
            let rawStreams = [];
            let subtitles = [];
            let detailPath = req.query.detail || '';

            try {
                const clientIp = getRandomSEAsianIP();
                const playHeaders = {
                    'User-Agent': USER_AGENT,
                    'Referer': `${SECOND_API_URL}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                    'Origin': SECOND_API_URL,
                    'Accept': 'application/json',
                    'X-Forwarded-For': clientIp,
                    'X-Real-IP': clientIp,
                    'Cookie': 'lang=en'
                };

                const [detailRes, playRes] = await Promise.all([
                    axios.get(`${SECOND_API_URL}/wefeed-h5-bff/web/subject/detail?subjectId=${sid}`, { headers: { 'User-Agent': USER_AGENT } }),
                    axios.get(`${SECOND_API_URL}/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`, { headers: playHeaders })
                ]);

                subject = detailRes.data?.data?.subject || {};
                rawStreams = playRes.data?.data?.streams || [];

                if (rawStreams.length > 0) {
                    const first = rawStreams[0];
                    const capRes = await axios.get(`${SECOND_API_URL}/wefeed-h5-bff/web/subject/caption?format=${first.format || 'MP4'}&id=${first.id}&subjectId=${sid}`, { headers: playHeaders });
                    subtitles = capRes.data?.data?.captions || [];
                }
            } catch (e) {}

            const title = subject?.title || 'MovieBox Cinema';
            const poster = subject?.cover?.url || '';
            const description = subject?.description || '';
            const rating = subject?.imdbRatingValue || '8.0';

            const defaultStreamUrl = rawStreams.length > 0 ? rawStreams[0].url : '';

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - MovieBox Ultra Player</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        background-color: #060913;
                        color: #f1f5f9;
                        font-family: 'Outfit', sans-serif;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 20px;
                    }
                    .container {
                        width: 100%;
                        max-width: 1100px;
                        background: rgba(15, 23, 42, 0.85);
                        backdrop-filter: blur(16px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.2);
                    }
                    .player-wrapper {
                        position: relative;
                        width: 100%;
                        aspect-ratio: 16 / 9;
                        background: #000;
                    }
                    video {
                        width: 100%;
                        height: 100%;
                        outline: none;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .controls-bar {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 12px;
                        align-items: center;
                        justify-content: space-between;
                        padding: 16px 24px;
                        background: #0f172a;
                    }
                    .badge {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: #fff;
                        padding: 6px 14px;
                        border-radius: 30px;
                        font-size: 13px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    }
                    .qualities-btn {
                        display: flex;
                        gap: 8px;
                    }
                    .q-btn {
                        background: #1e293b;
                        color: #94a3b8;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .q-btn:hover, .q-btn.active {
                        background: #10b981;
                        color: #fff;
                        border-color: #10b981;
                        box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
                    }
                    .movie-info {
                        display: flex;
                        gap: 24px;
                        padding: 24px;
                    }
                    .poster {
                        width: 140px;
                        height: 210px;
                        border-radius: 12px;
                        object-fit: cover;
                        border: 1px solid rgba(255,255,255,0.15);
                        box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                    }
                    .details {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: 700;
                        color: #fff;
                    }
                    .meta {
                        display: flex;
                        gap: 16px;
                        font-size: 14px;
                        color: #10b981;
                        font-weight: 600;
                    }
                    .desc {
                        font-size: 14px;
                        color: #94a3b8;
                        line-height: 1.6;
                    }
                    .api-link {
                        display: inline-block;
                        margin-top: 10px;
                        color: #38bdf8;
                        text-decoration: none;
                        font-size: 13px;
                        transition: color 0.2s;
                    }
                    .api-link:hover { color: #7dd3fc; text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="player-wrapper">
                        <video id="mainPlayer" controls autoplay crossorigin="anonymous" poster="${poster}">
                            ${defaultStreamUrl ? `<source src="${defaultStreamUrl}" type="video/mp4">` : ''}
                            ${subtitles.map(s => `<track kind="subtitles" src="${s.url}" srclang="${s.lan || 'en'}" label="${s.lanName || s.lan}" ${s.lan === 'en' ? 'default' : ''}>`).join('')}
                            Your browser does not support HTML5 video playback.
                        </video>
                    </div>

                    <div class="controls-bar">
                        <span class="badge">⚡ MovieBox Ultra Stream</span>
                        <div class="qualities-btn">
                            ${rawStreams.map((s, idx) => `
                                <button class="q-btn ${idx === 0 ? 'active' : ''}" onclick="switchStream('${s.url}', this)">
                                    ${s.resolutions ? s.resolutions + 'p' : 'HD'}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="movie-info">
                        ${poster ? `<img src="${poster}" class="poster" alt="${title}">` : ''}
                        <div class="details">
                            <h1 class="title">${title}</h1>
                            <div class="meta">
                                <span>⭐ IMDb ${rating}</span>
                                <span>🍿 MovieBox HD</span>
                                <span>💬 Subtitles Available (${subtitles.length})</span>
                            </div>
                            <p class="desc">${description || 'No description available.'}</p>
                            <a href="/?api=all&id=${sid}" class="api-link">View Full REST API JSON Response →</a>
                        </div>
                    </div>
                </div>

                <script>
                    function switchStream(url, btn) {
                        const player = document.getElementById('mainPlayer');
                        const currentTime = player.currentTime;
                        const isPaused = player.paused;

                        document.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        player.src = url;
                        player.currentTime = currentTime;
                        if (!isPaused) player.play();
                    }
                </script>
            </body>
            </html>
            `);
        }

        // =============================================================
        // 1. PURE REAL VIDEO STREAM REVERSE PROXY (?api=proxy & ?api=stream_play)
        // Streams MP4 video bytes directly through Vercel
        // =============================================================
        if (api === 'proxy' || api === 'stream_play' || api === 'stream_pipe') {
            const sid = req.query.id;
            const se = req.query.se || '0';
            const ep = req.query.ep || '0';
            const detailPath = req.query.detail || '';
            let targetUrl = req.query.target || req.query.url;

            // Step 1: Always resolve fresh live stream URL dynamically if sid is present
            if (sid) {
                const clientIp = getRandomSEAsianIP();
                const playHeaders = {
                    'User-Agent': USER_AGENT,
                    'Referer': `${SECOND_API_URL}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                    'Origin': SECOND_API_URL,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Forwarded-For': clientIp,
                    'X-Real-IP': clientIp,
                    'Cookie': 'lang=en'
                };

                const endpoints = [
                    `${SECOND_API_URL}/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                    `${MAIN_API_URL}/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                    `${SECOND_API_URL}/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`
                ];

                for (const epUrl of endpoints) {
                    try {
                        const pRes = await axios.get(epUrl, { headers: playHeaders, timeout: 8000 });
                        const st = pRes.data?.data?.streams || [];
                        if (st.length > 0) {
                            targetUrl = st[0].url;
                            break;
                        }
                    } catch (e) {}
                }
            }

            if (!targetUrl) {
                res.setHeader('Content-Type', 'application/json');
                return res.status(404).json({ status: 'error', message: 'Unable to resolve live stream URL' });
            }

            let decodedTarget = targetUrl;
            if (decodedTarget.includes('%')) decodedTarget = decodeURIComponent(decodedTarget);
            if (decodedTarget.includes('%')) decodedTarget = decodeURIComponent(decodedTarget);

            // Fast 302 Redirect to live fresh video stream
            return res.redirect(302, decodedTarget);
        }

        // Return JSON for REST API calls
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // =============================================================
        // 2. MAIN PAGE / RANKING LISTS / CATEGORIES (?api=trending)
        // =============================================================
        if (api === 'trending' || api === 'mainpage') {
            const categoryId = req.query.category || "872031290915189720";
            const page = req.query.page || "1";

            const url = `${MAIN_API_URL}/wefeed-h5api-bff/ranking-list/content?id=${categoryId}&page=${page}&perPage=12`;
            const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
            const items = response.data?.data?.subjectList || [];

            const results = items.map(i => ({
                id: i.subjectId,
                title: i.title,
                type: i.subjectType === 2 ? 'TV Series' : 'Movie',
                cover: i.cover?.url || '',
                detailPath: i.detailPath || '',
                imdbRating: i.imdbRatingValue || null,
                player_ui: `${baseUrl}/?api=player&id=${i.subjectId}`,
                details_api: `${baseUrl}/?api=all&id=${i.subjectId}`
            }));

            return res.json({ status: 'success', categoryId: categoryId, page: page, total: results.length, data: results });
        }

        // =============================================================
        // 3. CHANNEL FILTER API (?api=filter&channel=1&sort=ForYou)
        // =============================================================
        if (api === 'filter') {
            const channelId = req.query.channel || "1"; // 1 = Movie, 2 = TV, 1006 = Anime
            const sort = req.query.sort || "ForYou"; // ForYou, Hottest, Latest, Rating
            const page = req.query.page || 1;

            const filterUrl = `${MAIN_API_URL}/wefeed-h5api-bff/subject/filter`;
            const response = await axios.post(filterUrl, {
                channelId: channelId,
                page: Number(page),
                perPage: '28',
                sort: sort
            }, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Content-Type': 'application/json'
                }
            });

            const items = response.data?.data?.items || [];
            const results = items.map(i => ({
                id: i.subjectId,
                title: i.title,
                type: i.subjectType === 2 ? 'TV Series' : 'Movie',
                cover: i.cover?.url || '',
                detailPath: i.detailPath || '',
                imdbRating: i.imdbRatingValue || null,
                player_ui: `${baseUrl}/?api=player&id=${i.subjectId}`,
                details_api: `${baseUrl}/?api=all&id=${i.subjectId}`
            }));

            return res.json({ status: 'success', channelId: channelId, sort: sort, page: page, total: results.length, data: results });
        }

        // =============================================================
        // 4. SEARCH API (?api=search&q=Avatar)
        // =============================================================
        if (api === 'search') {
            const query = req.query.q || req.query.query || '';
            if (!query) return res.status(400).json({ status: 'error', message: "Missing 'q' query parameter" });

            const searchUrl = `${SECOND_API_URL}/wefeed-h5-bff/web/subject/search`;
            const response = await axios.post(searchUrl, {
                keyword: query,
                page: "1",
                perPage: "0",
                subjectType: "0"
            }, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': `${SECOND_API_URL}/`,
                    'Content-Type': 'application/json'
                }
            });

            const items = response.data?.data?.items || [];
            const results = items.map(i => ({
                id: i.subjectId,
                title: i.title,
                type: i.subjectType === 2 ? 'TV Series' : 'Movie',
                cover: i.cover?.url || '',
                detailPath: i.detailPath || '',
                imdbRating: i.imdbRatingValue || null,
                player_ui: `${baseUrl}/?api=player&id=${i.subjectId}`,
                details_api: `${baseUrl}/?api=all&id=${i.subjectId}`
            }));

            return res.json({ status: 'success', query: query, total: results.length, data: results });
        }

        // =============================================================
        // 5. CAPTIONS / SUBTITLES API (?api=subtitles&id=...&stream_id=...&format=MP4)
        // =============================================================
        if (api === 'subtitles' || api === 'captions') {
            const sid = req.query.id;
            const streamId = req.query.stream_id || '';
            const format = req.query.format || 'MP4';
            const detailPath = req.query.detail || '';

            if (!sid) return res.status(400).json({ status: 'error', message: "Missing 'id' parameter" });

            const captionUrl = `${SECOND_API_URL}/wefeed-h5-bff/web/subject/caption?format=${format}&id=${streamId}&subjectId=${sid}`;
            const referer = `${SECOND_API_URL}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`;

            const response = await axios.get(captionUrl, {
                headers: { 'User-Agent': USER_AGENT, 'Referer': referer }
            });

            const captions = response.data?.data?.captions || [];
            const results = captions.map(c => ({
                language: c.lanName || c.lan || 'Unknown',
                lang_code: c.lan || '',
                url: c.url
            }));

            return res.json({ status: 'success', subjectId: sid, total: results.length, subtitles: results });
        }

        // =============================================================
        // 6. ALL-IN-ONE METADATA, STREAMS & SUBTITLES (?api=all&id=...)
        // =============================================================
        if (api === 'all' || api === 'streams' || api === 'details' || api === 'play') {
            const sid = req.query.id;
            if (!sid) return res.status(400).json({ status: 'error', message: "Missing 'id' parameter" });

            let detailPath = req.query.detail || '';
            let reqSe = req.query.se;
            let reqEp = req.query.ep;

            let subject = null;
            let stars = [];
            let resourceData = null;
            let recommendations = [];

            // 1. Fetch Subject Detail & Stars
            try {
                const detailRes = await axios.get(`${SECOND_API_URL}/wefeed-h5-bff/web/subject/detail?subjectId=${sid}`, {
                    headers: { 'User-Agent': USER_AGENT, 'Referer': `${SECOND_API_URL}/` },
                    timeout: 8000
                });
                subject = detailRes.data?.data?.subject || null;
                stars = detailRes.data?.data?.stars || [];
                resourceData = detailRes.data?.data?.resource || null;
                if (!detailPath && subject?.detailPath) {
                    detailPath = subject.detailPath;
                }
            } catch (e) {}

            // 2. Fetch Recommendations
            try {
                const recRes = await axios.get(`${MAIN_URL}/wefeed-h5-bff/web/subject/detail-rec?subjectId=${sid}&page=1&perPage=12`, {
                    headers: { 'User-Agent': USER_AGENT }
                });
                recommendations = (recRes.data?.data?.items || []).map(r => ({
                    id: r.subjectId,
                    title: r.title,
                    cover: r.cover?.url || '',
                    detailPath: r.detailPath || ''
                }));
            } catch (e) {}

            // Auto Detect Season / Episode
            let se = reqSe;
            let ep = reqEp;

            if (se === undefined || ep === undefined) {
                if (resourceData?.seasons && resourceData.seasons.length > 0) {
                    const s0 = resourceData.seasons[0].se;
                    se = (s0 !== undefined && s0 !== null) ? String(s0) : (subject?.subjectType === 2 ? '1' : '0');
                    ep = (se === '0') ? '0' : '1';
                } else if (subject?.subjectType === 2) {
                    se = '1';
                    ep = '1';
                } else {
                    se = '0';
                    ep = '0';
                }
            }

            const clientIp = getRandomSEAsianIP();

            const playHeaders = {
                'User-Agent': USER_AGENT,
                'Referer': `${SECOND_API_URL}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                'Origin': SECOND_API_URL,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-Forwarded-For': clientIp,
                'X-Real-IP': clientIp,
                'Cookie': 'lang=en'
            };

            // 3. Fetch Video Streams
            let rawStreams = [];
            const endpoints = [
                `${SECOND_API_URL}/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `${MAIN_API_URL}/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `${SECOND_API_URL}/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`
            ];

            for (const epUrl of endpoints) {
                try {
                    const pRes = await axios.get(epUrl, { headers: playHeaders, timeout: 8000 });
                    const st = pRes.data?.data?.streams || [];
                    if (st.length > 0) {
                        rawStreams = st;
                        break;
                    }
                } catch (e) {}
            }

            // 4. Fetch Subtitles/Captions if stream available
            let subtitles = [];
            if (rawStreams.length > 0) {
                try {
                    const firstStream = rawStreams[0];
                    const capRes = await axios.get(`${SECOND_API_URL}/wefeed-h5-bff/web/subject/caption?format=${firstStream.format || 'MP4'}&id=${firstStream.id}&subjectId=${sid}`, {
                        headers: { 'User-Agent': USER_AGENT, 'Referer': playHeaders.Referer },
                        timeout: 5000
                    });
                    subtitles = (capRes.data?.data?.captions || []).map(c => ({
                        language: c.lanName || c.lan || 'Unknown',
                        lang_code: c.lan || '',
                        url: c.url
                    }));
                } catch (e) {}
            }

            // Map streams with direct URL and Pure Stream Reverse Proxy URL
            const formattedStreams = rawStreams.map(s => ({
                id: s.id,
                resolution: s.resolutions ? `${s.resolutions}p` : 'HD',
                format: s.format || 'MP4',
                size_bytes: s.size || null,
                direct_url: s.url,
                proxy_url: `${baseUrl}/?api=proxy&url=${encodeURIComponent(s.url)}&id=${sid}&se=${se}&ep=${ep}&detail=${encodeURIComponent(detailPath)}`
            }));

            // Format Stars / Cast
            const castList = stars.map(s => ({
                name: s.name,
                character: s.character,
                avatarUrl: s.avatarUrl
            }));

            // Format Seasons Info for TV Series
            let seasonsInfo = [];
            if (resourceData?.seasons) {
                seasonsInfo = resourceData.seasons.map(season => ({
                    season: season.se,
                    maxEpisodes: season.maxEp || 0,
                    episodes: season.allEp ? season.allEp.split(',').map(Number) : (season.maxEp ? Array.from({length: season.maxEp}, (_, i) => i + 1) : [])
                }));
            }

            return res.json({
                status: 'success',
                id: sid,
                title: subject?.title || 'Unknown',
                type: subject?.subjectType === 2 ? 'TV Series' : 'Movie',
                releaseDate: subject?.releaseDate || '',
                imdbRating: subject?.imdbRatingValue || null,
                country: subject?.countryName || '',
                genres: subject?.genre ? subject.genre.split(',').map(g => g.trim()) : [],
                poster: subject?.cover?.url || '',
                description: subject?.description || '',
                trailer_url: subject?.trailer?.videoAddress?.url || null,
                player_ui: `${baseUrl}/?api=player&id=${sid}`,
                cast: castList,
                current_season: se,
                current_episode: ep,
                seasons: seasonsInfo,
                recommendations: recommendations,
                subtitles: subtitles,
                streams: formattedStreams
            });
        }

        // DEFAULT DOCUMENTATION
        return res.json({
            status: 'online',
            service: 'MovieBox Full Suite & Modern Web Video Player Hub',
            version: '6.0.0',
            endpoints: {
                web_player_ui: `${baseUrl}/?api=player&id=7901815314139468256`,
                all_in_one_json: `${baseUrl}/?api=all&id=7901815314139468256`,
                trending: `${baseUrl}/?api=trending`,
                filter: `${baseUrl}/?api=filter&channel=1&sort=ForYou`,
                search: `${baseUrl}/?api=search&q=Avatar`
            }
        });

    } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

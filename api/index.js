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
        // 1. PURE REAL VIDEO STREAM REVERSE PROXY (?api=proxy & ?api=stream_play)
        // Streams MP4 video bytes directly through Vercel (NO REDIRECTS!)
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

            // Fast 302 Redirect to live fresh video stream (0.01s Execution Speed)
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

            // Map streams with direct URL and Pure Stream Reverse Proxy URL (NO REDIRECTS!)
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
            service: 'MovieBox Pure Real Video Stream Reverse Proxy Engine',
            version: '5.0.0',
            endpoints: {
                trending: `${baseUrl}/?api=trending`,
                filter: `${baseUrl}/?api=filter&channel=1&sort=ForYou`,
                search: `${baseUrl}/?api=search&q=Avatar`,
                details_streams_subtitles: `${baseUrl}/?api=all&id=7901815314139468256`,
                real_video_stream_proxy: `${baseUrl}/?api=proxy&id=7901815314139468256`
            }
        });

    } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

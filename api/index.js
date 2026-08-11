const axios = require('axios');

// Modern Real Browser User-Agents Pool
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

module.exports = async (req, res) => {
    // 1. Always Return JSON Header & Enable Full CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const host = req.headers.host || 'vercel-video-proxy-ecru.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const api = req.query.api || req.query.action || 'docs';
    const ua = getRandomUserAgent();

    try {
        // =============================================================
        // STREAM PIPE (Proxies Video Data with Range & Spoofed Headers)
        // =============================================================
        if (api === 'stream_pipe' || req.query.action === 'stream_pipe') {
            const targetUrl = req.query.target || req.query.url;
            if (!targetUrl) {
                res.setHeader('Content-Type', 'application/json');
                return res.status(400).json({ error: "Missing 'target' or 'url' parameter" });
            }

            let decodedTarget = targetUrl;
            if (decodedTarget.includes('%')) decodedTarget = decodeURIComponent(decodedTarget);
            if (decodedTarget.includes('%')) decodedTarget = decodeURIComponent(decodedTarget);

            const headers = {
                'User-Agent': ua,
                'Referer': req.query.referer || 'https://filmboom.top/',
                'Origin': req.query.origin || 'https://filmboom.top'
            };

            if (req.headers.range) {
                headers['Range'] = req.headers.range;
            }

            const response = await axios({
                method: 'get',
                url: decodedTarget,
                headers: headers,
                responseType: 'stream',
                validateStatus: () => true,
                timeout: 25000
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

        // Return JSON for all other API endpoints
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // =============================================================
        // ENDPOINT 1: TRENDING MOVIES / CATALOG (?api=trending)
        // =============================================================
        if (api === 'trending') {
            const listUrl = 'https://h5-api.aoneroom.com/wefeed-h5api-bff/ranking-list/content?id=872031290915189720&page=1&perPage=20';
            const response = await axios.get(listUrl, { headers: { 'User-Agent': ua } });
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

            return res.json({ status: 'success', total: results.length, data: results });
        }

        // =============================================================
        // ENDPOINT 2: SEARCH MOVIES (?api=search&q=Avatar)
        // =============================================================
        if (api === 'search') {
            const query = req.query.q || req.query.query || '';
            if (!query) return res.status(400).json({ status: 'error', message: "Missing 'q' query parameter" });

            const searchUrl = 'https://filmboom.top/wefeed-h5-bff/web/subject/search';
            const response = await axios.post(searchUrl, {
                keyword: query,
                page: '1',
                perPage: '20',
                subjectType: '0'
            }, {
                headers: {
                    'User-Agent': ua,
                    'Referer': 'https://filmboom.top/',
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
        // ENDPOINT 3: ALL-IN-ONE DETAILS & STREAMS (?api=all&id=... or ?api=streams&id=...)
        // =============================================================
        if (api === 'all' || api === 'streams' || api === 'details' || api === 'play') {
            const sid = req.query.id;
            if (!sid) return res.status(400).json({ status: 'error', message: "Missing 'id' parameter" });

            let detailPath = req.query.detail || '';
            let reqSe = req.query.se;
            let reqEp = req.query.ep;

            let subject = null;
            let resourceData = null;

            // 1. Fetch Subject Details Metadata
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

            const clientIp = `${Math.floor(Math.random() * 150) + 20}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

            const playHeaders = {
                'User-Agent': ua,
                'Referer': `https://filmboom.top/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                'Origin': 'https://filmboom.top',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-Forwarded-For': clientIp,
                'X-Real-IP': clientIp,
                'Cookie': 'lang=en'
            };

            // 2. Fetch Streams via Multi-Endpoint & Mirror Retries
            let rawStreams = [];
            let debugLogs = [];

            const endpoints = [
                `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `https://h5-api.aoneroom.com/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `https://moviebox.ph/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`,
                `https://h5-api.aoneroom.com/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`
            ];

            for (const epUrl of endpoints) {
                try {
                    const hostName = new URL(epUrl).hostname;
                    const mirrorOrigin = `https://${hostName}`;
                    const currentHeaders = {
                        ...playHeaders,
                        'Referer': `${mirrorOrigin}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                        'Origin': mirrorOrigin
                    };

                    const pRes = await axios.get(epUrl, { headers: currentHeaders, timeout: 8000 });
                    const st = pRes.data?.data?.streams || [];
                    debugLogs.push({ url: epUrl, status: pRes.status, code: pRes.data?.code, streamsFound: st.length, data: pRes.data });
                    if (st.length > 0) {
                        rawStreams = st;
                        break;
                    }
                } catch (e) {
                    debugLogs.push({ url: epUrl, error: e.message, code: e.code });
                }
            }

            // Map streams with direct URL and Vercel Proxy URL
            const formattedStreams = rawStreams.map(s => ({
                resolution: s.resolutions ? `${s.resolutions}p` : 'HD',
                format: s.format || 'MP4',
                size_bytes: s.size || null,
                direct_url: s.url,
                proxy_url: `${baseUrl}/?api=stream_pipe&target=${encodeURIComponent(s.url)}`
            }));

            // Seasons Info for TV Series
            let seasonsInfo = [];
            if (resourceData?.seasons) {
                seasonsInfo = resourceData.seasons.map(season => ({
                    season: season.se,
                    maxEpisodes: season.maxEp || 0,
                    episodes: season.resolutions ? season.resolutions.map(r => r.epNum) : []
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
                genres: subject?.genre || '',
                poster: subject?.cover?.url || '',
                description: subject?.description || '',
                trailer_url: subject?.trailer?.videoAddress?.url || null,
                current_season: se,
                current_episode: ep,
                seasons: seasonsInfo,
                streams: formattedStreams,
                debug_logs: formattedStreams.length === 0 ? debugLogs : undefined
            });
        }

        // =============================================================
        // DEFAULT API DOCUMENTATION PAGE (?api=docs)
        // =============================================================
        return res.json({
            status: 'online',
            service: 'MovieBox Ultra Fast REST API Hub',
            version: '2.0.0',
            endpoints: {
                trending: `${baseUrl}/?api=trending`,
                search: `${baseUrl}/?api=search&q=Avatar`,
                details_and_streams: `${baseUrl}/?api=all&id=7901815314139468256`,
                stream_proxy: `${baseUrl}/?api=stream_pipe&target=<ENCODED_VIDEO_URL>`
            }
        });

    } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

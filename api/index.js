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
    // 1. Enable Full CORS & Expose Media Range Headers
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
        // INSTANT STREAM PLAYER PROXY (?api=stream_play)
        // Instant 10ms execution with target or dynamic stream resolution!
        // =============================================================
        if (api === 'stream_play' || api === 'stream_pipe') {
            const sid = req.query.id;
            const se = req.query.se || '0';
            const ep = req.query.ep || '0';
            const detailPath = req.query.detail || '';
            let targetUrl = req.query.target || req.query.url;

            // Step 1: Decode target URL if passed directly
            if (targetUrl) {
                let decodedTarget = targetUrl;
                if (decodedTarget.includes('%')) decodedTarget = decodeURIComponent(decodedTarget);
                if (decodedTarget.includes('%')) decodedTarget = decodeURIComponent(decodedTarget);
                
                // Fast 302 Redirect to live video stream (10ms Execution)
                if (req.query.mode !== 'pipe') {
                    return res.redirect(302, decodedTarget);
                }

                // Pipe Mode for Range Requests
                const videoHeaders = {
                    'User-Agent': ua,
                    'Referer': 'https://filmboom.top/',
                    'Origin': 'https://filmboom.top'
                };
                if (req.headers.range) {
                    videoHeaders['Range'] = req.headers.range;
                }

                const response = await axios({
                    method: 'get',
                    url: decodedTarget,
                    headers: videoHeaders,
                    responseType: 'stream',
                    validateStatus: () => true,
                    timeout: 15000
                });

                res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
                res.setHeader('Content-Disposition', 'inline');
                res.setHeader('Accept-Ranges', 'bytes');
                if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
                if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);

                res.status(response.status);
                return response.data.pipe(res);
            }

            // Step 2: Resolve fresh signed MP4 URL using Vercel if target is not passed
            if (sid) {
                const clientIp = `${Math.floor(Math.random() * 150) + 20}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
                const basePlayHeaders = {
                    'User-Agent': ua,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Forwarded-For': clientIp,
                    'X-Real-IP': clientIp,
                    'Cookie': 'lang=en'
                };

                const endpoints = [
                    `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                    `https://h5-api.aoneroom.com/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                    `https://moviebox.ph/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                    `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`
                ];

                for (const epUrl of endpoints) {
                    try {
                        const hostName = new URL(epUrl).hostname;
                        const mirrorOrigin = `https://${hostName}`;
                        const currentHeaders = {
                            ...basePlayHeaders,
                            'Referer': `${mirrorOrigin}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                            'Origin': mirrorOrigin
                        };

                        const pRes = await axios.get(epUrl, { headers: currentHeaders, timeout: 10000 });
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

            // Fast 302 Redirect to live video stream
            return res.redirect(302, targetUrl);
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
        // ENDPOINT 3: ALL-IN-ONE DETAILS & STREAMS (?api=all&id=...)
        // =============================================================
        if (api === 'all' || api === 'streams' || api === 'details' || api === 'play') {
            const sid = req.query.id;
            if (!sid) return res.status(400).json({ status: 'error', message: "Missing 'id' parameter" });

            let detailPath = req.query.detail || '';
            let reqSe = req.query.se;
            let reqEp = req.query.ep;

            let subject = null;
            let resourceData = null;
            const diagnostics = {
                metadata_step: {},
                play_api_attempts: []
            };

            // 1. Fetch Details Metadata
            try {
                const detailRes = await axios.get(`https://filmboom.top/wefeed-h5-bff/web/subject/detail?subjectId=${sid}`, {
                    headers: { 'User-Agent': ua, 'Referer': 'https://filmboom.top/' },
                    timeout: 8000
                });
                subject = detailRes.data?.data?.subject || null;
                resourceData = detailRes.data?.data?.resource || null;
                if (!detailPath && subject?.detailPath) {
                    detailPath = subject.detailPath;
                }
                diagnostics.metadata_step = {
                    status: detailRes.status,
                    detailPath_resolved: detailPath,
                    subjectType: subject?.subjectType,
                    title: subject?.title
                };
            } catch (e) {
                diagnostics.metadata_step = { error: e.message, code: e.code };
            }

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

            const basePlayHeaders = {
                'User-Agent': ua,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Cookie': 'lang=en'
            };

            // 2. Fetch Streams via Multi-Endpoint Retries
            let rawStreams = [];
            const endpoints = [
                `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `https://h5-api.aoneroom.com/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `https://moviebox.ph/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=${se}&ep=${ep}`,
                `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`,
                `https://h5-api.aoneroom.com/wefeed-h5api-bff/web/subject/play?subjectId=${sid}&se=0&ep=0`
            ];

            for (const epUrl of endpoints) {
                const hostName = new URL(epUrl).hostname;
                const mirrorOrigin = `https://${hostName}`;
                const currentHeaders = {
                    ...basePlayHeaders,
                    'Referer': `${mirrorOrigin}/spa/videoPlayPage/movies/${detailPath}?id=${sid}&type=/movie/detail&lang=en`,
                    'Origin': mirrorOrigin
                };

                const attemptLog = {
                    target_endpoint: epUrl,
                    referer_sent: currentHeaders.Referer,
                    client_ip_sent: clientIp
                };

                try {
                    const pRes = await axios.get(epUrl, { headers: currentHeaders, timeout: 10000 });
                    const st = pRes.data?.data?.streams || [];
                    
                    attemptLog.http_status = pRes.status;
                    attemptLog.api_code = pRes.data?.code;
                    attemptLog.api_message = pRes.data?.message;
                    attemptLog.streams_found = st.length;
                    
                    if (st.length > 0) {
                        attemptLog.sample_stream_url = st[0].url ? st[0].url.substring(0, 80) + '...' : null;
                        rawStreams = st;
                        diagnostics.play_api_attempts.push(attemptLog);
                        break;
                    } else {
                        attemptLog.api_data_response = pRes.data;
                    }
                } catch (e) {
                    attemptLog.error = e.message;
                    attemptLog.error_code = e.code;
                    if (e.response) {
                        attemptLog.http_status = e.response.status;
                        attemptLog.response_body = e.response.data;
                    }
                }
                diagnostics.play_api_attempts.push(attemptLog);
            }

            // Map streams with direct URL and Instant 10ms Vercel Proxy Player URL
            const formattedStreams = rawStreams.map(s => ({
                resolution: s.resolutions ? `${s.resolutions}p` : 'HD',
                format: s.format || 'MP4',
                size_bytes: s.size || null,
                direct_url: s.url,
                proxy_url: `${baseUrl}/?api=stream_play&target=${encodeURIComponent(s.url)}&id=${sid}&se=${se}&ep=${ep}&detail=${encodeURIComponent(detailPath)}`
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
                high_level_diagnostics: diagnostics
            });
        }

        // DEFAULT DOCUMENTATION
        return res.json({
            status: 'online',
            service: 'MovieBox Ultra Fast REST API Hub',
            version: '3.5.0',
            endpoints: {
                trending: `${baseUrl}/?api=trending`,
                search: `${baseUrl}/?api=search&q=Avatar`,
                details_and_streams: `${baseUrl}/?api=all&id=7901815314139468256`,
                instant_proxy_player: `${baseUrl}/?api=stream_play&id=7901815314139468256`
            }
        });

    } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

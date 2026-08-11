# Vercel High-Speed Video Streaming Proxy 🚀

An ultra-fast, zero-block Node.js Serverless Video Streaming Proxy designed for Vercel deployment.

## Features
- ⚡ **Ultra Fast Streaming:** Edge serverless architecture with zero buffering latency.
- 🛡️ **Zero Cloudflare 427 Block:** Operates outside Cloudflare cross-zone blocks.
- 🔄 **Random User-Agent Pool:** Rotates modern Chrome, Firefox, and Mobile browser headers automatically.
- 📺 **Inline Playback:** Sets `Content-Disposition: inline` to stream directly inside browsers/VLC instead of forcing file downloads.
- ⏩ **Full Range Seeking:** Preserves `Range` and `Accept-Ranges: bytes` for fast forward / scrubbing.
- 🔓 **CORS Unlocked:** `Access-Control-Allow-Origin: *` enabled for Web players.

## Usage
`https://your-vercel-domain.vercel.app/?url=<ENCODED_VIDEO_URL>&origin=<ORIGIN>&referer=<REFERER>`

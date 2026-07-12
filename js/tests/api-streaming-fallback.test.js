import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../utils.js', () => ({
    RATE_LIMIT_ERROR_MESSAGE: 'rate limited',
    deriveTrackQuality: vi.fn(),
    delay: vi.fn(() => Promise.resolve()),
    isTrackUnavailable: vi.fn(() => false),
    getExtensionFromBlob: vi.fn(),
    getTrackDiscNumber: vi.fn(),
    normalizeQualityToken: vi.fn((quality) => quality),
    getTrackCoverId: vi.fn(),
    getCoverBlob: vi.fn(),
}));

vi.mock('../storage.js', () => ({
    preferDolbyAtmosSettings: { isEnabled: vi.fn(() => false) },
    trackDateSettings: { useAlbumYear: vi.fn(() => false) },
    devModeSettings: { isEnabled: vi.fn(() => false), getUrl: vi.fn(() => '') },
    amazonMusicSettings: { isEnabled: vi.fn(() => false) },
}));

vi.mock('../cache.js', () => ({
    APICache: class {
        async get() {
            return null;
        }
        async set() {}
        async clearExpired() {}
    },
}));

vi.mock('../dash-downloader.ts', () => ({ DashDownloader: class {} }));
vi.mock('../hls-downloader.js', () => ({ HlsDownloader: class {} }));
vi.mock('../proxy-utils.js', () => ({ getProxyUrl: vi.fn((url) => url), wrapTidalUrl: vi.fn((url) => url) }));
vi.mock('../ffmpeg.js', () => ({ loadFfmpeg: vi.fn(), FfmpegError: class extends Error {}, ffmpeg: vi.fn() }));
vi.mock('../download-utils.ts', () => ({ triggerDownload: vi.fn(), applyAudioPostProcessing: vi.fn() }));
vi.mock('../ffmpegFormats.ts', () => ({ isCustomFormat: vi.fn(() => false) }));
vi.mock('../progressEvents.js', () => ({ DownloadProgress: class {} }));
vi.mock('../readableStreamIterator.js', () => ({ readableStreamIterator: vi.fn() }));
vi.mock('../HiFi.ts', () => ({
    HiFiClient: { instance: { query: vi.fn() } },
    TidalResponse: class {},
}));
vi.mock('../platform-detection.js', () => ({ isIos: false, isSafari: false, isChrome: true }));
vi.mock('../container-classes.js', () => ({
    TrackAlbum: class {},
    EnrichedAlbum: class {},
    EnrichedTrack: class {},
    ReplayGain: class {},
    PlaybackInfo: class {
        constructor(value) {
            Object.assign(this, value);
        }
    },
    Track: class {},
    Album: class {},
    PreparedVideo: class {},
    PreparedTrack: class {},
}));

const { LosslessAPI } = await import('../api.js');

const jioNoResults = {
    ok: true,
    json: async () => ({ success: true, data: { results: [] } }),
};

describe('LosslessAPI stream source order (JioSaavn → Tidal → YouTube)', () => {
    let settings;
    let api;
    let fetchMock;

    beforeEach(() => {
        settings = {
            getInstances: vi.fn(async () => []),
        };
        api = new LosslessAPI(settings);
        vi.spyOn(api, 'getTrackMetadata').mockResolvedValue({
            id: '123',
            title: 'Song',
            artist: { name: 'Artist' },
        });
        vi.spyOn(api, 'getTrack').mockResolvedValue(null);
        fetchMock = vi.fn(async () => jioNoResults);
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('uses JioSaavn first when it has a matching track', async () => {
        fetchMock.mockImplementation(async (url) => {
            if (String(url).startsWith('/pm-audio/')) {
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        data: {
                            results: [
                                {
                                    name: 'Song',
                                    artists: { primary: [{ name: 'Artist' }] },
                                    downloadUrl: [{ quality: '320kbps', url: 'https://cdn.example/song.mp4' }],
                                },
                            ],
                        },
                    }),
                };
            }
            return { ok: false, json: async () => ({}) };
        });

        const result = await api.getStreamUrl('123', 'LOSSLESS');

        expect(result.provider).toBe('jiosaavn');
        expect(result.url).toBe('https://cdn.example/song.mp4');
        expect(api.getTrack).not.toHaveBeenCalled();
    });

    test('falls back to Tidal manifest when JioSaavn has no match', async () => {
        api.getTrack.mockResolvedValue({
            info: {
                manifest: btoa(JSON.stringify({ urls: ['https://audio.example/tidal.flac'] })),
                trackReplayGain: -4,
                trackPeakAmplitude: 0.9,
                albumReplayGain: -5,
                albumPeakAmplitude: 0.95,
            },
        });

        const result = await api.getStreamUrl('123', 'LOSSLESS');

        expect(result.provider).toBe('tidal');
        expect(result.url).toBe('https://audio.example/tidal.flac');
        expect(result.rgInfo).toEqual({
            trackReplayGain: -4,
            trackPeakAmplitude: 0.9,
            albumReplayGain: -5,
            albumPeakAmplitude: 0.95,
        });
        expect(api.getTrack).toHaveBeenCalledWith('123', 'LOSSLESS');
    });

    test('falls back to YouTube local-fallback when JioSaavn and Tidal fail', async () => {
        fetchMock.mockImplementation(async (url) => {
            if (String(url).startsWith('/api/local-fallback')) {
                return {
                    ok: true,
                    json: async () => ({ url: 'https://backend.example/proxy-stream?url=abc' }),
                };
            }
            return jioNoResults;
        });

        const result = await api.getStreamUrl('123', 'LOSSLESS');

        expect(result.provider).toBe('youtube');
        expect(result.url).toBe('https://backend.example/proxy-stream?url=abc');
    });

    test('throws when no source resolves a stream URL', async () => {
        await expect(api.getStreamUrl('123', 'LOSSLESS')).rejects.toThrow(
            'Could not resolve stream URL from JioSaavn, Tidal, or YouTube fallback'
        );
    });
});

import fs from 'fs';
import { pathToFileURL } from 'url';

async function run() {
    global.window = { location: { protocol: 'http:', host: 'localhost:5173' } };
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
        writable: true
    });
    
    // Create fetch polyfill for the backend/API
    global.fetch = async (url, options) => {
        const fetch = (await import('node-fetch')).default;
        return fetch(url, options);
    };

    // Load api.js
    const apiModulePath = pathToFileURL('js/api.js').href;
    const { default: Api } = await import(apiModulePath);
    
    const api = new Api();
    api.streamCache = new Map();
    api.getTrackMetadata = async () => ({ id: '123', title: 'Wishes', artist: { name: 'Hasan Raheem' } });
    
    // We mock the settings objects imported by api.js that might be global
    global.amazonMusicSettings = {
        isEnabled: () => true,
        getApiBaseUrl: () => 'https://amz.geeked.wtf',
        getTurnstileBypassToken: () => 'test_token',
    };
    global.devModeSettings = { isEnabled: () => false };
    
    console.log("Calling getStreamUrl...");
    try {
        const result = await api.getStreamUrl('123', 'LOSSLESS');
        console.log("Result:", result);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();

// js/keepalive.js
// Silently pings the Pulse Music backend every 20 seconds to prevent idle shutdown.

import { AUTH_BASE_URL } from './accounts/config.js';

const INTERVAL_MS = 20_000; // 20 seconds
const PING_URL = () => `${AUTH_BASE_URL}/ping`;

let _timer = null;
let _consecutiveFails = 0;

async function ping() {
    try {
        const res = await fetch(PING_URL(), { method: 'GET', cache: 'no-store' });
        if (res.ok) {
            _consecutiveFails = 0;
        } else {
            _consecutiveFails++;
        }
    } catch {
        _consecutiveFails++;
        if (_consecutiveFails >= 3) {
            console.warn('[Keepalive] Backend appears offline. Will keep retrying...');
        }
    }
}

export function startKeepalive() {
    if (_timer) return; // already running
    ping(); // immediate first ping
    _timer = setInterval(ping, INTERVAL_MS);
}

export function stopKeepalive() {
    if (_timer) {
        clearInterval(_timer);
        _timer = null;
    }
}

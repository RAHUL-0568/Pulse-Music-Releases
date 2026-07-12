// js/accounts/config.js

const getBaseURL = () => {
    const local = localStorage.getItem('pulse music-auth-url');
    if (local) return local;

    if (window.__AUTH_URL__) return window.__AUTH_URL__;

    const envUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';

    // If running in Capacitor (Android/iOS), default to the remote backend
    // since localhost would point to the mobile device itself instead of a server.
    if (window?.Capacitor?.isNative || window?.Capacitor?.isNativePlatform?.()) {
        return envUrl;
    }

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return '';
    }
    
    return envUrl;
};

export const AUTH_BASE_URL = getBaseURL();

export const authClient = {
    getSession: async () => {
        const token = localStorage.getItem('pulse_music_token');
        if (!token) return { data: null };
        try {
            const res = await fetch(`${AUTH_BASE_URL}/api/v1/auth/me`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-pm-key': import.meta.env.VITE_PM_KEY || ''
                }
            });
            if (!res.ok) throw new Error('Session expired');
            const data = await res.json();
            return { data: { user: data } };
        } catch (e) {
            return { data: null };
        }
    },
    signIn: {
        email: async ({ email, password }) => {
            try {
                const res = await fetch(`${AUTH_BASE_URL}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) return { error: { message: data.detail || 'Login failed' } };
                return { data };
            } catch (e) {
                return { error: { message: e.message } };
            }
        },
        social: async ({ provider, callbackURL }) => {
            // Unchanged: handled differently or rely on existing flow
            return { error: { message: "Social login not fully supported in this backend yet." } };
        }
    },
    signUp: {
        email: async ({ email, password, name }) => {
            try {
                const res = await fetch(`${AUTH_BASE_URL}/api/v1/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name })
                });
                const data = await res.json();
                if (!res.ok) return { error: { message: data.detail || 'Signup failed' } };
                return { data };
            } catch (e) {
                return { error: { message: e.message } };
            }
        }
    },
    signOut: async () => {
        // Handled in auth.js mostly
    },
    requestPasswordReset: async ({ email }) => {
        try {
            const res = await fetch(`${AUTH_BASE_URL}/api/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) return { error: { message: data.detail || 'Request failed' } };
            return { data };
        } catch (e) {
            return { error: { message: e.message } };
        }
    },
    resetPassword: async ({ newPassword, token }) => {
        try {
            const res = await fetch(`${AUTH_BASE_URL}/api/v1/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: newPassword })
            });
            const data = await res.json();
            if (!res.ok) return { error: { message: data.detail || 'Reset failed' } };
            return { data };
        } catch (e) {
            return { error: { message: e.message } };
        }
    }
};

export { authClient as auth };

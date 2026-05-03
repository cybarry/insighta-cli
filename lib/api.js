import axios from 'axios';
import { loadCredentials, saveCredentials, clearCredentials } from './credentials.js';
import chalk from 'chalk';

const BASE_URL = process.env.INSIGHTA_API_URL || 'https://insighta-backend-production-b142.up.railway.app';

async function refreshTokens(refreshToken) {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
    return res.data;
}

export async function apiRequest(method, endpoint, options = {}) {
    const creds = loadCredentials();

    if (!creds) {
        console.error(chalk.red('Not logged in. Run: insighta login'));
        process.exit(1);
    }

    const headers = {
        Authorization: `Bearer ${creds.access_token}`,
        'X-API-Version': '1',
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const res = await axios({
            method,
            url: `${BASE_URL}${endpoint}`,
            headers,
            params: options.params,
            data: options.data,
            responseType: options.responseType || 'json',
        });
        return res.data;
    } catch (err) {
        // Try refresh if 401
        if (err.response?.status === 401 && creds.refresh_token) {
            try {
                const refreshed = await refreshTokens(creds.refresh_token);
                saveCredentials({
                    ...creds,
                    access_token: refreshed.access_token,
                    refresh_token: refreshed.refresh_token,
                });

                // Retry original request
                const res = await axios({
                    method,
                    url: `${BASE_URL}${endpoint}`,
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${refreshed.access_token}`,
                    },
                    params: options.params,
                    data: options.data,
                    responseType: options.responseType || 'json',
                });
                return res.data;
            } catch {
                clearCredentials();
                console.error(chalk.red('Session expired. Run: insighta login'));
                process.exit(1);
            }
        }

        const message = err.response?.data?.message || err.message;
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
    }
}
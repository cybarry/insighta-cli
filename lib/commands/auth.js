import http from 'http';
import { createHash, randomBytes } from 'crypto';
import open from 'open';
import chalk from 'chalk';
import { saveCredentials, loadCredentials, clearCredentials } from '../credentials.js';
import axios from 'axios';

const BASE_URL = process.env.INSIGHTA_API_URL || 'https://insighta-web-production-418d.up.railway.app';
const CLIENT_ID = 'Ov23liLDvSdOft2VTnrt';
const PORT = 9876;

function base64url(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function loginCommand() {
    const state = randomBytes(16).toString('hex');
    const codeVerifier = base64url(randomBytes(64));
    const codeChallenge = base64url(
        createHash('sha256').update(codeVerifier).digest()
    );

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: `http://localhost:${PORT}/callback`,
        scope: 'read:user user:email',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    const authUrl = `${BASE_URL}/auth/github?cli=1&port=${PORT}&state=${state}`;

    console.log(chalk.cyan('Opening GitHub login in your browser...'));

    // Start local callback server
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname !== '/callback') return;

        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const username = url.searchParams.get('username');
        const returnedState = url.searchParams.get('state');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Login successful! You can close this tab.</h2></body></html>');
        server.close();

        if (!accessToken) {
            console.error(chalk.red('Login failed — no token received'));
            process.exit(1);
        }

        saveCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
            username,
        });

        console.log(chalk.green(`✅ Logged in as @${username}`));
    });

    server.listen(PORT, () => {
        open(authUrl);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
        server.close();
        console.error(chalk.red('Login timed out. Try again.'));
        process.exit(1);
    }, 120000);
}

export function logoutCommand() {
    const creds = loadCredentials();
    if (!creds) {
        console.log(chalk.yellow('Not logged in.'));
        return;
    }

    // Invalidate server-side
    axios.post(`${BASE_URL}/auth/logout`, {
        refresh_token: creds.refresh_token,
    }).catch(() => { });

    clearCredentials();
    console.log(chalk.green('✅ Logged out successfully.'));
}

export function whoamiCommand() {
    const creds = loadCredentials();
    if (!creds) {
        console.log(chalk.yellow('Not logged in. Run: insighta login'));
        return;
    }
    console.log(chalk.cyan(`Logged in as @${creds.username}`));
}
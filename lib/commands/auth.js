import http from 'http';
import { createHash, randomBytes } from 'crypto';
import open from 'open';
import chalk from 'chalk';
import { saveCredentials, loadCredentials, clearCredentials } from '../credentials.js';
import axios from 'axios';

const BASE_URL = process.env.INSIGHTA_API_URL || 'https://insighta-backend-production-b142.up.railway.app';
const PORT = 9876;

function base64url(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * insighta login
 *
 * PKCE flow:
 *   1. Generate state + code_verifier + code_challenge
 *   2. Start local HTTP server on localhost:9876 to catch the redirect
 *   3. Open browser → backend /auth/github?cli=1&port=9876
 *   4. Backend handles GitHub OAuth, then redirects to localhost:9876/callback
 *      with access_token + refresh_token in the query string
 *   5. CLI stores credentials to ~/.insighta/credentials.json
 */
export async function loginCommand() {
    const state = randomBytes(16).toString('hex');
    const codeVerifier = base64url(randomBytes(64));
    const codeChallenge = base64url(
        createHash('sha256').update(codeVerifier).digest()
    );

    // Build the auth URL through our backend (which then redirects to GitHub)
    const authUrl = `${BASE_URL}/auth/github?cli=1&port=${PORT}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log(chalk.cyan('🔐 Opening GitHub login in your browser...'));
    console.log(chalk.gray(`   Listening on localhost:${PORT}/callback`));

    return new Promise((resolve, reject) => {
        // Start local callback server
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            if (url.pathname !== '/callback') {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            const accessToken = url.searchParams.get('access_token');
            const refreshToken = url.searchParams.get('refresh_token');
            const username = url.searchParams.get('username');

            // Send success page to browser
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <head><style>
                    body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3;
                           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .box { text-align: center; }
                    h2 { color: #3fb950; margin-bottom: 8px; }
                    p { color: #7d8590; font-size: 14px; }
                </style></head>
                <body><div class="box">
                    <h2>✅ Login successful!</h2>
                    <p>You can close this tab and return to the terminal.</p>
                </div></body>
                </html>
            `);

            server.close();

            if (!accessToken) {
                console.error(chalk.red('❌ Login failed — no token received'));
                process.exit(1);
            }

            saveCredentials({ access_token: accessToken, refresh_token: refreshToken, username });
            console.log(chalk.green(`\n✅ Logged in as @${username}`));
            resolve();
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(chalk.red(`❌ Port ${PORT} is in use. Close whatever is using it and retry.`));
            } else {
                console.error(chalk.red(`❌ Server error: ${err.message}`));
            }
            reject(err);
            process.exit(1);
        });

        server.listen(PORT, () => {
            open(authUrl).catch(() => {
                console.log(chalk.yellow('Could not open browser automatically. Visit:'));
                console.log(chalk.cyan(authUrl));
            });
        });

        // Timeout after 2 minutes
        setTimeout(() => {
            server.close();
            console.error(chalk.red('\n⏰ Login timed out after 2 minutes. Try again.'));
            reject(new Error('timeout'));
            process.exit(1);
        }, 120_000);
    });
}

export async function logoutCommand() {
    const creds = loadCredentials();
    if (!creds) {
        console.log(chalk.yellow('Not logged in.'));
        return;
    }

    // Invalidate server-side
    try {
        await axios.post(`${BASE_URL}/auth/logout`, {
            refresh_token: creds.refresh_token,
        });
    } catch { /* best-effort */ }

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
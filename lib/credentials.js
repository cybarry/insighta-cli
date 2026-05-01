import fs from 'fs';
import path from 'path';
import os from 'os';

const DIR = path.join(os.homedir(), '.insighta');
const FILE = path.join(DIR, 'credentials.json');

export function saveCredentials(data) {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function loadCredentials() {
    if (!fs.existsSync(FILE)) return null;
    try {
        return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
        return null;
    }
}

export function clearCredentials() {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
}
#!/usr/bin/env node
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { fetch } from 'undici';
import { CAPIClient } from '@vscode/copilot-api';

// Determine configuration directories and files
const DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), '.aiask-data');
const ENV_PATH = path.join(DATA_DIR, '.env');
const TOKEN_FILE = path.join(DATA_DIR, 'token');
const LOG_DIR = path.join(DATA_DIR, 'logs');

// Load environment variables synchronously and robustly
try {
    const content = readFileSync(ENV_PATH, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
        // Match key=value, ignoring comments
        const match = line.match(/^\s*(export\s+)?([^#=\s]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[2].trim();
            let val = match[3].trim();
            // Strip inline comments if not part of a quoted string
            const isQuoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
            if (!isQuoted) {
                const commentIdx = val.indexOf('#');
                if (commentIdx !== -1) {
                    val = val.substring(0, commentIdx).trim();
                }
            }
            // Strip surrounding single/double quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
        }
    }
} catch {
    // Ignore if file doesn't exist or is not readable
}

const CLIENT_ID = '01ab8ac9400c4e429b23';
const SYSTEM_PROMPT = 'Answer shortly as an engineer would.';

const CLIENT_CONFIG = {
    machineId: 'cli',
    sessionId: 'cli-session',
    vscodeVersion: 'cli-vscode',
    buildType: 'dev' as 'dev' | 'prod',
    name: 'AiAsk',
    version: '1.0.0',
};

async function log(input: string, output: string): Promise<void> {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(LOG_DIR, `${today}.log`);
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp}\nINPUT: ${input}\nOUTPUT: ${output}\n---\n`;
        await fs.appendFile(logFile, logEntry);
    } catch (error) {
        console.error('[ERROR] Failed to write log:', error);
    }
}

async function getToken(): Promise<string> {
    try {
        return await fs.readFile(TOKEN_FILE, 'utf8');
    } catch {
        return await auth();
    }
}

async function auth(): Promise<string> {
    console.log('[INFO] Starting authentication...');

    const authResp = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo' }),
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    const { device_code, user_code, verification_uri, interval } = await authResp.json() as any;

    console.log(`\nGo to: ${verification_uri}`);
    console.log(`Enter code: ${user_code}`);

    for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, interval * 1000));

        const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            body: JSON.stringify({
                client_id: CLIENT_ID,
                device_code,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        });

        const data = await tokenResp.json() as any;

        if (data.access_token) {
            await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
            await fs.writeFile(TOKEN_FILE, data.access_token);
            console.log('[SUCCESS] Authentication successful!');
            return data.access_token;
        }

        if (data.error !== 'authorization_pending') {
            throw new Error(`Auth error: ${data.error}`);
        }
    }

    throw new Error('Authentication timeout');
}

async function getCopilotToken(githubToken: string): Promise<string> {
    const client = new CAPIClient(CLIENT_CONFIG, 'I accept terms', {
        fetch: async (url: string, options: any) => {
            const response = await fetch(url, {
                ...options,
                headers: { ...options.headers, 'Authorization': `Bearer ${githubToken}` }
            });
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                text: () => response.text(),
                json: () => response.json(),
            };
        },
    });

    const response = await client.makeRequest<any>({
        headers: { Authorization: `token ${githubToken}` },
    }, { type: "CopilotToken" });

    const data = await response.json();
    return data.token;
}

export async function getModel(): Promise<string> {
    try {
        const content = await fs.readFile(ENV_PATH, 'utf8');
        const match = content.match(/^\s*(export\s+)?NIM_MODEL\s*=\s*(.*)$/m);
        if (match) {
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            return val;
        }
    } catch {
        // Ignore and fall through
    }
    return process.env.NIM_MODEL || process.env.nim_model || 'meta/llama-3.1-8b-instruct';
}

export async function setModel(modelName: string): Promise<void> {
    let content = '';
    try {
        content = await fs.readFile(ENV_PATH, 'utf8');
    } catch {
        // File doesn't exist
    }

    const lines = content.split('\n');
    let updated = false;

    const newLines = lines.map(line => {
        const match = line.match(/^\s*(export\s+)?NIM_MODEL\s*=\s*(.*)$/);
        if (match) {
            updated = true;
            const prefix = match[1] || '';
            return `${prefix}NIM_MODEL=${modelName}`;
        }
        return line;
    });

    if (!updated) {
        if (content && !content.endsWith('\n')) {
            newLines.push('');
        }
        newLines.push(`NIM_MODEL=${modelName}`);
    }

    await fs.mkdir(path.dirname(ENV_PATH), { recursive: true });
    await fs.writeFile(ENV_PATH, newLines.join('\n'), 'utf8');
    process.env.NIM_MODEL = modelName;
}

export async function ask(prompt: string): Promise<void> {
    try {
        console.log(`[INFO] Asking: "${prompt}"`);

        const nimToken = process.env.NIM_TOKEN || process.env.nim_token;
        const nimBaseUrl = process.env.NIM_BASE_URL || process.env.nim_base_url || 'https://integrate.api.nvidia.com/v1';

        if (nimToken) {
            const currentModel = await getModel();
            const response = await fetch(`${nimBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${nimToken}`
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: false,
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`NVIDIA NIM API error (${response.status}): ${text}`);
            }

            const data = await response.json() as any;
            const answer = data.choices?.[0]?.message?.content || 'No response';

            console.log('\nResponse:');
            console.log(answer);

            await log(prompt, answer);
            return;
        }

        const githubToken = await getToken();
        const copilotToken = await getCopilotToken(githubToken);

        const client = new CAPIClient(CLIENT_CONFIG, 'I accept terms', {
            fetch: async (url: string, options: any) => {
                const response = await fetch(url, {
                    ...options,
                    headers: { ...options.headers, 'Authorization': `Bearer ${copilotToken}` }
                });
                return {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    text: () => response.text(),
                    json: () => response.json(),
                };
            },
        });

        const response = await client.makeRequest<any>({
            method: 'POST',
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
            }),
            headers: { 'Content-Type': 'application/json' },
        }, { type: "ChatCompletions" });

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || 'No response';

        console.log('\nResponse:');
        console.log(answer);

        await log(prompt, answer);

    } catch (error: any) {
        console.error('[ERROR]', error.message || error);
    } finally {
        if (process.env.NODE_ENV !== 'test') {
            process.exit(0);
        }
    }
}

export async function handleCli(args: string[]): Promise<void> {
    if (args.length > 0 && args[0] === 'model') {
        if (args.length === 1) {
            const model = await getModel();
            console.log(model);
            if (process.env.NODE_ENV !== 'test') {
                process.exit(0);
            }
            return;
        } else if (args.length === 2) {
            const newModel = args[1];
            await setModel(newModel);
            console.log(`Model successfully set to: ${newModel}`);
            if (process.env.NODE_ENV !== 'test') {
                process.exit(0);
            }
            return;
        }
    }

    const prompt = args.join(' ');
    if (!prompt) {
        console.log('Usage: aiask "your question"');
        if (process.env.NODE_ENV !== 'test') {
            process.exit(0);
        }
        return;
    }

    await ask(prompt);
}

// Main
if (process.env.NODE_ENV !== 'test') {
    const args = process.argv.slice(2);
    handleCli(args);
}

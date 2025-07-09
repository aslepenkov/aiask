#!/usr/bin/env NODE_NO_WARNINGS=1 node

import fs from 'fs/promises';
import path from 'path';
import { fetch } from 'undici';
import { CAPIClient } from '@vscode/copilot-api';

const CLIENT_ID = '01ab8ac9400c4e429b23';
const SYSTEM_PROMPT = 'Answer shortly as an engineer would.';
const TOKEN_FILE = process.env.DATA_DIR ? process.env.DATA_DIR + '/token' : './token';
const LOG_DIR = process.env.DATA_DIR ? process.env.DATA_DIR + '/logs' : './logs';

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

async function ask(prompt: string): Promise<void> {
    try {
        console.log(`[INFO] Asking: "${prompt}"`);

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
        process.exit(1);
    }
}

// Main
const args = process.argv.slice(2);
const prompt = args.join(' ');

if (!prompt) {
    console.log('Usage: aiask "your question"');
    process.exit(1);
}

ask(prompt);

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getProvider, NimProvider, CopilotProvider } from './providers/index.js';
import { log } from './logger.js';

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
});

let serverHitCount = 0;
let lastRequestHeaders: any = null;
let lastRequestBody: any = null;

// Start mock server
const server = http.createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        serverHitCount++;
        lastRequestHeaders = req.headers;

        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                lastRequestBody = JSON.parse(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: 'Mocked NIM response'
                            }
                        }
                    ]
                }));
            } catch (err: any) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Bad Request: ' + err.message);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        const port = address.port;
        process.env.NODE_ENV = 'test';
        process.env.DATA_DIR = '.';
        process.env.NIM_TOKEN = 'test-token';
        process.env.NIM_MODEL = 'test-model';
        process.env.NIM_BASE_URL = `http://127.0.0.1:${port}/v1`;
        process.env.SYSTEM_PROMPT = 'Custom system prompt test';
        resolve();
    });
});

const { handleCli, getModel } = await import('./ask.js');

console.log('--- Starting Integration & Unit Tests ---');

let capturedLogs: string[] = [];
const originalLog = console.log;
console.log = (...args: any[]) => {
    capturedLogs.push(args.join(' '));
    originalLog(...args);
};

try {
    // 1. Test Provider Factory
    const nimProv = getProvider('nim');
    if (!(nimProv instanceof NimProvider)) {
        throw new Error('Expected getProvider("nim") to return NimProvider instance');
    }

    const copilotProv = getProvider('copilot');
    if (!(copilotProv instanceof CopilotProvider)) {
        throw new Error('Expected getProvider("copilot") to return CopilotProvider instance');
    }

    try {
        getProvider('unknown');
        throw new Error('Expected getProvider("unknown") to throw error');
    } catch (e: any) {
        if (!e.message.includes('Unsupported AI provider')) {
            throw new Error(`Unexpected error message for invalid provider: ${e.message}`);
        }
    }

    // 2. Test Logging Toggle
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join('./logs', `${today}.log`);

    // Test disabled logging
    await log('test disabled prompt', 'test response', false);
    let logExists = false;
    try {
        await fs.access(logFile);
        logExists = true;
    } catch {}
    if (logExists) {
        throw new Error('Expected log file NOT to exist when logging is disabled');
    }

    // 3. Test model viewing
    capturedLogs = [];
    await handleCli(['model']);
    if (!capturedLogs.join('\n').includes('test-model')) {
        throw new Error(`Expected model output "test-model", got: ${capturedLogs.join('\n')}`);
    }

    // 4. Test model changing
    capturedLogs = [];
    await handleCli(['model', 'new-super-model']);
    if (!capturedLogs.join('\n').includes('Model successfully set to: new-super-model')) {
        throw new Error(`Expected success message when changing model, got: ${capturedLogs.join('\n')}`);
    }

    const currentModel = await getModel();
    if (currentModel !== 'new-super-model') {
        throw new Error(`Expected model "new-super-model", got "${currentModel}"`);
    }

    const envContent = await fs.readFile('./.env', 'utf8');
    if (!envContent.includes('NIM_MODEL=new-super-model')) {
        throw new Error(`Expected .env to contain NIM_MODEL=new-super-model, got:\n${envContent}`);
    }

    // 5. Test fund command
    capturedLogs = [];
    await handleCli(['fund']);
    if (!capturedLogs.join('\n').includes('Support AiAsk Development')) {
        throw new Error(`Expected funding output, got: ${capturedLogs.join('\n')}`);
    }

    // 6. Test asking a question with configured system prompt & model
    capturedLogs = [];
    const testPrompt = 'Hello NVIDIA NIM!';
    await handleCli([testPrompt]);

    console.log = originalLog;

    if (serverHitCount !== 1) {
        throw new Error(`Expected server hit 1 time, got ${serverHitCount}`);
    }

    if (lastRequestHeaders['authorization'] !== 'Bearer test-token') {
        throw new Error(`Expected Bearer test-token, got: ${lastRequestHeaders['authorization']}`);
    }

    if (lastRequestBody.model !== 'new-super-model') {
        throw new Error(`Expected model "new-super-model", got: ${lastRequestBody.model}`);
    }

    if (lastRequestBody.messages[0].content !== 'Custom system prompt test') {
        throw new Error(`Expected system prompt "Custom system prompt test", got: ${lastRequestBody.messages[0].content}`);
    }

    if (lastRequestBody.messages[1].content !== testPrompt) {
        throw new Error(`Expected user prompt "${testPrompt}", got: ${lastRequestBody.messages[1].content}`);
    }

    const fileContent = await fs.readFile(logFile, 'utf8');
    if (!fileContent.includes(testPrompt) || !fileContent.includes('Mocked NIM response')) {
        throw new Error(`Log file missing expected content:\n${fileContent}`);
    }

    // Clean up test files
    await fs.unlink(logFile);
    await fs.unlink('./.env');

    console.log('[SUCCESS] All Integration & Unit Tests Passed!');
    server.close();
    process.exit(0);
} catch (err: any) {
    console.log = originalLog;
    console.error('[FAILURE] test failed:', err);
    server.close();
    process.exit(1);
}

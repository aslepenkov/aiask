import http from 'http';
import fs from 'fs/promises';
import path from 'path';

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

// Start the server on a dynamic port
await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        const port = address.port;
        // Set environment variables before importing ask.ts
        process.env.NODE_ENV = 'test';
        process.env.DATA_DIR = '.';
        process.env.NIM_TOKEN = 'test-token';
        process.env.NIM_MODEL = 'test-model';
        process.env.NIM_BASE_URL = `http://127.0.0.1:${port}/v1`;
        resolve();
    });
});

// Import the ask function and CLI handler dynamically after env vars are set
const { handleCli, getModel, setModel } = await import('./ask.js');

console.log('--- Starting NVIDIA NIM Integration Test ---');

// Capture console output
let capturedLogs: string[] = [];
const originalLog = console.log;
console.log = (...args: any[]) => {
    capturedLogs.push(args.join(' '));
    originalLog(...args);
};

try {
    // 1. Test model viewing when model is not set explicitly in .env
    capturedLogs = [];
    await handleCli(['model']);
    if (capturedLogs.length === 0 || !capturedLogs[0].includes('test-model')) {
        throw new Error(`Expected model output to default to "test-model" (from env), got: ${capturedLogs.join('\n')}`);
    }

    // 2. Test model changing
    capturedLogs = [];
    await handleCli(['model', 'new-super-model']);
    if (!capturedLogs.join('\n').includes('Model successfully set to: new-super-model')) {
        throw new Error(`Expected success message when changing model, got: ${capturedLogs.join('\n')}`);
    }

    // Check that getModel returns the new model name
    const currentModel = await getModel();
    if (currentModel !== 'new-super-model') {
        throw new Error(`Expected model to be "new-super-model", but got "${currentModel}"`);
    }

    // Verify the .env file has been updated
    const envPath = './.env';
    const envContent = await fs.readFile(envPath, 'utf8');
    if (!envContent.includes('NIM_MODEL=new-super-model')) {
        throw new Error(`Expected .env file to contain NIM_MODEL=new-super-model, got:\n${envContent}`);
    }

    // 3. Test asking a question which now uses the newly configured model
    capturedLogs = [];
    const testPrompt = 'Hello NVIDIA NIM!';
    await handleCli([testPrompt]);

    // Restore original console.log
    console.log = originalLog;

    // Verify server received request with correct parameters
    if (serverHitCount !== 1) {
        throw new Error(`Expected server to be hit 1 time, but was hit ${serverHitCount} times.`);
    }

    if (lastRequestHeaders['authorization'] !== 'Bearer test-token') {
        throw new Error(`Expected Authorization header "Bearer test-token", got: ${lastRequestHeaders['authorization']}`);
    }

    // It should be the custom model we just configured!
    if (lastRequestBody.model !== 'new-super-model') {
        throw new Error(`Expected model to be "new-super-model", got: ${lastRequestBody.model}`);
    }

    if (lastRequestBody.messages[1].content !== testPrompt) {
        throw new Error(`Expected user prompt to be "${testPrompt}", got: ${lastRequestBody.messages[1].content}`);
    }

    // Verify printed response
    const outputLog = capturedLogs.join('\n');
    if (!outputLog.includes('Mocked NIM response')) {
        throw new Error(`Expected output to contain "Mocked NIM response", but got:\n${outputLog}`);
    }

    // Verify files were logged
    const today = new Date().toISOString().split('T')[0];
    const logDir = './logs';
    const logFile = path.join(logDir, `${today}.log`);

    const fileContent = await fs.readFile(logFile, 'utf8');
    if (!fileContent.includes(testPrompt) || !fileContent.includes('Mocked NIM response')) {
        throw new Error(`Expected log file content to contain prompt and response, but got:\n${fileContent}`);
    }

    // Clean up files created during test
    await fs.unlink(logFile);
    await fs.unlink(envPath);
    console.log('[SUCCESS] NVIDIA NIM Integration Test Passed!');
    server.close();
    process.exit(0);

} catch (err: any) {
    console.log = originalLog;
    console.error('[FAILURE] test failed:', err);
    server.close();
    process.exit(1);
}

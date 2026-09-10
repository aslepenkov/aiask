# AiAsk — Minimal AI ask CLI

A minimal CLI tool for asking questions using **GitHub Copilot** or **NVIDIA NIM**.

No Docker. No daemon. Install globally with npm and use `aiask` from anywhere.

![AiAsk Dem](https://github.com/user-attachments/assets/54cbcbf3-3d6f-430e-af70-0ccd10f3955d)

## Features

* 🤖 **GitHub Copilot or NVIDIA NIM** — use Copilot by default or route requests through NVIDIA NIM
* 🔐 **One-time GitHub authentication** — OAuth device flow with persistent token storage
* 📝 **Daily logging** — automatically stores questions and answers
* ⚙️ **Model configuration** — easily view or change the active NIM model
* 📦 **Global npm CLI** — available as `aiask` from any directory
* ⚡ **Minimalistic** — small TypeScript-based CLI with no Docker runtime

## Installation

### One-liner

```bash
curl -fsSL https://raw.githubusercontent.com/aslepenkov/aiask/main/setup.sh | bash
```

The installer:

1. Clones the repository if necessary
2. Installs npm dependencies
3. Builds the TypeScript project
4. Installs `aiask` globally
5. Optionally configures NVIDIA NIM

### From npm

```bash
npm install -g aiask
```

### From source

```bash
git clone https://github.com/aslepenkov/aiask.git
cd aiask

npm install
npm run build
npm install -g .
```

## Usage

Ask a question:

```bash
aiask "your question here"
```

Examples:

```bash
aiask "explain quantum computing in simple terms"

aiask "write a Python function to sort a list"

aiask "explain async await in C#"
```

## Model

Show the current NVIDIA NIM model:

```bash
aiask model
```

Change the model:

```bash
aiask model meta/llama-3.1-70b-instruct
```

The model configuration is stored persistently in:

```text
~/.aiask/.env
```

## Configuration

AiAsk automatically loads configuration from:

```text
~/.aiask/.env
```

### NVIDIA NIM

If `NIM_TOKEN` is configured, requests are sent through NVIDIA NIM.

| Variable       | Description             | Default                               |
| -------------- | ----------------------- | ------------------------------------- |
| `NIM_TOKEN`    | NVIDIA NGC API token    | —                                     |
| `NIM_MODEL`    | NVIDIA NIM model        | `meta/llama-3.1-8b-instruct`          |
| `NIM_BASE_URL` | NVIDIA NIM API base URL | `https://integrate.api.nvidia.com/v1` |

Example:

```env
NIM_TOKEN="nvapi-..."
NIM_MODEL="meta/llama-3.1-8b-instruct"
NIM_BASE_URL="https://integrate.api.nvidia.com/v1"
```

If `NIM_TOKEN` is not configured, AiAsk uses GitHub Copilot authentication.

## Data

AiAsk stores its persistent data in:

```text
~/.aiask/
├── .env
├── token
└── logs/
    └── YYYY-MM-DD.log
```

The GitHub authentication token is stored locally and reused on subsequent requests.

## Funding & Support

If you find AiAsk helpful and want to support its ongoing development:

* Run `npm fund` to view funding details.
* Run `aiask fund` to display tipping options (including Solana / USDT).

## Architecture

```text
aiask "question"
       │
       ├── NIM_TOKEN configured
       │        ↓
       │   NVIDIA NIM API
       │
       └── NIM_TOKEN not configured
                ↓
          GitHub OAuth
                ↓
          GitHub Copilot
```

## Requirements

* Node.js >= 20
* npm

Docker is **not required**.

## License

MIT

# AiAsk - Minimal GitHub Copilot CLI

A super minimalistic CLI tool for asking questions to GitHub Copilot or NVIDIA NIM. Single file, Docker-ready, with persistent authentication and daily logging.

![AiAsk Dem](https://github.com/user-attachments/assets/54cbcbf3-3d6f-430e-af70-0ccd10f3955d)

## Features

- 🤖 **Ask Copilot or NIM** - Seamlessly get answers from GitHub Copilot or NVIDIA NIM
- 🔐 **One-time authentication** - GitHub OAuth with persistent token storage
- 📝 **Daily logging** - Automatic logging of all questions and answers
- 🐳 **Docker containerized** - Daemonized setup for fast responses
- ⚡ **Minimalistic** - Single TypeScript file, fast and clean

## Installation

### One-liner Docker Setup (Recommended)

Installs `aiask` automatically:
```bash
curl -fsSL https://raw.githubusercontent.com/aslepenkov/aiask/main/setup.sh | bash
```

### Global NPM Setup (Alternative)

```bash
npm install -g aiask
```

*Note: Reload your shell (`source ~/.bashrc` or `source ~/.zshrc`) to start using `aiask` command.*

## Usage

```bash
aiask "your question here"
aiask "explain quantum computing in simple terms"
aiask "write a Python function to sort a list"
```

## Configuration

`aiask` natively loads configurations from a `.env` file (saved at `~/.aiask-data/.env` or `./.env`).

| Variable | Description | Default / Example |
|---|---|---|
| `NIM_TOKEN` | NVIDIA NGC API token. Setting this routes completions through NVIDIA NIM. | `nvapi-...` |
| `NIM_MODEL` | AI model to use on NVIDIA NIM. | `meta/llama-3.1-8b-instruct` |
| `NIM_BASE_URL` | Custom base URL for NVIDIA NIM. | `https://integrate.api.nvidia.com/v1` |

## License

MIT

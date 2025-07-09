# AiAsk - Minimal GitHub Copilot CLI

A super minimalistic CLI tool for asking questions to GitHub Copilot. Single file, Docker-ready, with persistent authentication and daily logging.

![AiAsk Dem](https://github.com/user-attachments/assets/54cbcbf3-3d6f-430e-af70-0ccd10f3955d)

## Features

- 🤖 **Ask GitHub Copilot** - Get quick answers from AI
- 🔐 **One-time authentication** - GitHub OAuth with persistent token storage
- 📝 **Daily logging** - Automatic logging of all questions and answers
- 🐳 **Docker containerized** - Persistent container for fast responses
- ⚡ **Minimalistic** - Single TypeScript file (~180 lines)

## Installation

### Prerequisites
- Docker (for containerized setup)
- Node.js 20+ (for direct usage)

### Docker Setup (Recommended)

1. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd aiask
   ./setup.sh
   ```

2. **Reload your shell**:
   ```bash
   source ~/.bashrc   # or ~/.zshrc for zsh users
   # Or simply restart your terminal
   ```

### Direct Usage (Alternative)

```bash
git clone <your-repo>
cd aiask
npm install
```

## Usage

### Basic Usage
```bash
# Docker setup (after installation)
aiask "your question here"

# Direct usage
npm run ask "your question here"
```

### Example Commands
```bash
aiask "list top 5 GDP countries as table"
aiask "explain quantum computing in simple terms" 
aiask "what is the difference between async and sync?"
aiask "write a Python function to sort a list"
```

## Log Management

All interactions are automatically logged with timestamps. Here's how to view them:

### List Log Files
```bash
docker exec -it aiask-container ls -la /app/data/logs/
```

### View Today's Log
```bash
docker exec -it aiask-container cat /app/data/logs/$(date +%Y-%m-%d).log
```

### View Specific Date Log
```bash
docker exec -it aiask-container cat /app/data/logs/2025-07-09.log
```

### View Last 10 Entries
```bash
docker exec -it aiask-container tail -10 /app/data/logs/$(date +%Y-%m-%d).log
```

### Follow Live Log Updates
```bash
docker exec -it aiask-container tail -f /app/data/logs/$(date +%Y-%m-%d).log
```

### Search in Logs
```bash
# Search in today's log
docker exec -it aiask-container grep -i "python" /app/data/logs/$(date +%Y-%m-%d).log

# Search across all logs
docker exec -it aiask-container grep -r "programming" /app/data/logs/
```

### Copy Logs to Host
```bash
# Copy today's log
docker cp aiask-container:/app/data/logs/$(date +%Y-%m-%d).log ./

# Copy all logs
docker cp aiask-container:/app/data/logs/ ./logs/
```

### Interactive Log Browsing
```bash
docker exec -it aiask-container sh
cd /app/data/logs
ls -la
cat 2025-07-09.log
exit
```

## Log Format
```
2025-07-09T10:06:44.566Z
INPUT: what is 2+2?
OUTPUT: 4
---
```

## Authentication

On first use, you'll be prompted to authenticate with GitHub:

1. Visit the provided URL
2. Enter the device code  
3. Press Enter to continue
4. Token is saved automatically for future use

## File Structure

```
aiask/
├── ask.ts              # Single source file (main application)
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── Dockerfile          # Docker container setup
├── setup.sh           # Setup script for Docker
├── token              # GitHub token (auto-generated)
├── logs/              # Daily log files
│   └── 2025-07-09.log # Format: YYYY-MM-DD.log
└── dist/              # Built JavaScript (auto-generated)
    └── ask.js
```

## Configuration

The app uses these environment variables (Docker only):
- `NODE_NO_WARNINGS` - Suppresses Node.js deprecation warnings

System prompt: "Answer shortly as an engineer would."

## Logging

All interactions are automatically logged to daily files:
```
2025-07-09T09:48:30.932Z
INPUT: what is 2+2?
OUTPUT: 4
---
```

## Docker Details

The Docker setup creates:
- **Persistent container** - `aiask-container` (faster than creating new containers)
- **Data volume** - `~/.aiask-data` (stores token and logs)
- **Auto-restart** - Container starts automatically with Docker

## Commands

```bash
# Setup (one-time)
./setup.sh

# Ask questions
aiask "your question"

# Manual usage
npm run ask "your question"
npm run build                    # Build TypeScript
node dist/ask.js "your question" # Run built version

# Docker management
docker stop aiask-container                           # Stop container
docker start aiask-container                          # Start container
docker exec -it aiask-container node dist/ask.js "q" # Direct container usage
```

## Cleanup

Remove everything:
```bash
docker stop aiask-container
docker rm aiask-container
docker rmi aiask
rm ~/.aiask_alias.sh
```

## Dependencies

- `@vscode/copilot-api` - GitHub Copilot API client
- `undici` - Fast HTTP client
- `typescript` + `ts-node` - TypeScript support

## License

MIT

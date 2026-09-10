#!/bin/bash
set -e

# Support curl-to-bash installation
if [ ! -f "package.json" ]; then
    echo "[INFO] Repository not found. Creating temporary checkout..."
    TEMP_DIR=$(mktemp -d)
    git clone https://github.com/aslepenkov/aiask.git "$TEMP_DIR" --depth=1
    cd "$TEMP_DIR"
fi

echo "Installing aiask..."

# Install dependencies and build
npm install
npm run build

# Install globally
npm install -g .

# Persistent config
DATA_DIR="$HOME/.aiask"
ENV_FILE="$DATA_DIR/.env"

mkdir -p "$DATA_DIR"

# NVIDIA NIM configuration
if [ -t 0 ]; then
    echo ""
    echo "================================================="
    echo "           NVIDIA NIM Configuration"
    echo "================================================="
    echo ""

    read -p "Configure NVIDIA NIM endpoint? (y/N): " CONFIGURE_NIM

    if [[ "$CONFIGURE_NIM" =~ ^[Yy]$ ]]; then
        read -p "Enter NVIDIA NIM Token: " USER_NIM_TOKEN
        read -p "Enter NVIDIA NIM Model [meta/llama-3.1-8b-instruct]: " USER_NIM_MODEL
        USER_NIM_MODEL=${USER_NIM_MODEL:-meta/llama-3.1-8b-instruct}

        read -p "Enter NVIDIA NIM Base URL [https://integrate.api.nvidia.com/v1]: " USER_NIM_BASE_URL
        USER_NIM_BASE_URL=${USER_NIM_BASE_URL:-https://integrate.api.nvidia.com/v1}

        cat > "$ENV_FILE" << EOF
NIM_TOKEN="$USER_NIM_TOKEN"
NIM_MODEL="$USER_NIM_MODEL"
NIM_BASE_URL="$USER_NIM_BASE_URL"
EOF

        chmod 600 "$ENV_FILE"

        echo "NVIDIA NIM configured."
    fi
fi

echo ""
echo "Installation complete!"
echo ""
echo "Usage:"
echo '  aiask "explain async/await in C#"'
echo "  aiask model"
echo "  aiask model meta/llama-3.1-70b-instruct"
echo ""
echo "Config: $ENV_FILE"
echo ""
echo "If NIM is not configured, aiask will use GitHub Copilot authentication."
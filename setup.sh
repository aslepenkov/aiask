#!/bin/bash

set -e

# Support curl-to-bash installation
if [ ! -f "Dockerfile" ]; then
    echo "[INFO] No Dockerfile found in current directory. Setting up a temporary checkout..."
    TEMP_DIR=$(mktemp -d)
    echo "Cloning repository to $TEMP_DIR..."
    git clone https://github.com/aslepenkov/aiask.git "$TEMP_DIR" --depth=1
    cd "$TEMP_DIR"
fi

# Build the Docker image
echo "Building aiask Docker image..."
docker build -t aiask .

# Ensure data directory exists
mkdir -p ~/.aiask-data

ENV_FILE="$HOME/.aiask-data/.env"

# Prompt for NVIDIA NIM configuration
if [ -t 0 ]; then
    echo ""
    echo "================================================="
    echo "           NVIDIA NIM Configuration"
    echo "================================================="
    echo "aiask supports using NVIDIA NIM endpoints natively."
    echo "You can set up your API Key (NGC token) now."
    echo ""
    read -p "Do you want to configure an NVIDIA NIM endpoint? (y/N): " CONFIGURE_NIM
    if [[ "$CONFIGURE_NIM" =~ ^[Yy]$ ]]; then
        read -p "Enter your NVIDIA NIM Token (NGC API Key): " USER_NIM_TOKEN
        read -p "Enter NVIDIA NIM Model [meta/llama-3.1-8b-instruct]: " USER_NIM_MODEL
        USER_NIM_MODEL=${USER_NIM_MODEL:-meta/llama-3.1-8b-instruct}
        read -p "Enter NVIDIA NIM Base URL [https://integrate.api.nvidia.com/v1]: " USER_NIM_BASE_URL
        USER_NIM_BASE_URL=${USER_NIM_BASE_URL:-https://integrate.api.nvidia.com/v1}

        echo "Writing configuration to $ENV_FILE..."
        cat << EOF > "$ENV_FILE"
NIM_TOKEN="$USER_NIM_TOKEN"
NIM_MODEL="$USER_NIM_MODEL"
NIM_BASE_URL="$USER_NIM_BASE_URL"
EOF
        echo "NVIDIA NIM configured successfully!"
    else
        echo "Skipping NVIDIA NIM configuration. You can configure it later in $ENV_FILE"
        if [ ! -f "$ENV_FILE" ]; then
            touch "$ENV_FILE"
        fi
    fi
else
    echo "[INFO] Non-interactive shell detected, skipping NIM configuration prompting."
    if [ ! -f "$ENV_FILE" ]; then
        touch "$ENV_FILE"
    fi
fi
echo ""

# Stop and remove existing container if it exists
docker stop aiask-container 2>/dev/null || true
docker rm aiask-container 2>/dev/null || true

# Start a long-running container
echo "Starting aiask container..."
docker run -d --name aiask-container \
    -v ~/.aiask-data:/app/data \
    --restart unless-stopped \
    aiask tail -f /dev/null

# Create the alias function that uses the running container
cat << 'EOF' > ~/.aiask_alias.sh
aiask() {
    # Check if container is running, start if not
    if ! docker ps --format "{{.Names}}" | grep -q "^aiask-container$"; then
        echo "Starting aiask container..."
        docker start aiask-container >/dev/null 2>&1
        sleep 1
    fi
    
    # Execute the command in the running container
    docker exec -it aiask-container node dist/ask.js "$@"
}
EOF

# Auto-detect shell and add source line
echo "Adding aiask alias to your shell configuration..."

# Detect current shell
CURRENT_SHELL=$(basename "$SHELL")

# Determine config file based on shell
case "$CURRENT_SHELL" in
    "zsh")
        CONFIG_FILE="$HOME/.zshrc"
        ;;
    "bash")
        CONFIG_FILE="$HOME/.bashrc"
        ;;
    "fish")
        CONFIG_FILE="$HOME/.config/fish/config.fish"
        echo "Fish shell detected. You'll need to manually add the alias."
        echo "Run: echo 'source ~/.aiask_alias.sh' >> $CONFIG_FILE"
        ;;
    *)
        CONFIG_FILE="$HOME/.profile"
        echo "Unknown shell ($CURRENT_SHELL), using .profile"
        ;;
esac

# Add source line if not already present (except for fish)
if [ "$CURRENT_SHELL" != "fish" ]; then
    if ! grep -q "source ~/.aiask_alias.sh" "$CONFIG_FILE" 2>/dev/null; then
        echo "source ~/.aiask_alias.sh" >> "$CONFIG_FILE"
        echo "Added aiask alias to $CONFIG_FILE"
    else
        echo "aiask alias already exists in $CONFIG_FILE"
    fi
fi

echo ""
echo "Setup complete!"
echo ""
if [ "$CURRENT_SHELL" = "fish" ]; then
    echo "Since you're using Fish shell, manually run:"
    echo "echo 'source ~/.aiask_alias.sh' >> ~/.config/fish/config.fish"
    echo ""
else
    echo "aiask alias has been automatically added to your shell."
    echo "Reload your shell to start using it:"
    echo "source $CONFIG_FILE"
    echo "# Or simply restart your terminal"
    echo ""
fi
echo "Usage examples:"
echo "aiask \"list top 5 GDP countries as table\""
echo "aiask \"explain quantum computing in simple terms\""
echo ""
echo "Note: On first run, you'll need to authenticate with GitHub."
echo "The auth token will be saved persistently in the container."
echo ""
echo "Management commands:"
echo "docker stop aiask-container    # Stop container"
echo "docker start aiask-container   # Start container"  
echo "docker rm aiask-container && docker rmi aiask  # Remove everything"

#!/bin/bash

# Build the Docker image
echo "Building aiask Docker image..."
docker build -t aiask .

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

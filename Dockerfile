# Minimal Node.js image (v20 for undici compatibility)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install all dependencies (including dev deps for build)
COPY package.json ./
RUN npm install

# Copy source files
COPY ask.ts tsconfig.json ./

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create data directory for persistent storage (token and logs)
RUN mkdir -p /app/data

# Set environment variables for Docker
ENV DATA_DIR=/app/data
ENV NODE_NO_WARNINGS=1

# Keep container running
CMD ["tail", "-f", "/dev/null"]
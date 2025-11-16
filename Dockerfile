FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# CRITICAL: Use exec form for proper signal handling (SIGTERM, SIGINT)
# This ensures graceful shutdowns work correctly on Railway
CMD ["node", "src/server.js"]

# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for native modules like sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S photoframe -u 1001

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY server/ ./

# Create uploads directory and set permissions
RUN mkdir -p uploads && \
    chown -R photoframe:nodejs /app

# Switch to non-root user
USER photoframe

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request({port:3000,path:'/api/health'}, (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)).end()"

# Start the application
CMD ["npm", "start"]
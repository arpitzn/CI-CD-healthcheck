# Simple single-stage build for demo
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy all application files
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads && chown nodejs:nodejs logs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["npm", "start"]

# ==========================================
# Multi-stage build for production
# ==========================================

# Stage 1: Dependencies
FROM node:18-alpine as deps

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Development build (for hot reload in dev)
FROM node:18-alpine as dev-deps

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

# Stage 3: Production build
FROM node:18-alpine as production

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application
COPY frontend/ ./

# Build the application
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Ownership of built files
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "run", "start"]

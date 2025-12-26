# Build Stage
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

COPY . .

# Build frontend (Vite)
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Copy backend source code
COPY . .

# Copy frontend build from builder stage
COPY --from=builder /app/dist ./dist

# Add entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]

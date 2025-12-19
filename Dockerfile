# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose web port
EXPOSE 80

# Use the entrypoint script specifically
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

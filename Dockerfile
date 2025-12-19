# Build Stage
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Vite build puts files in /dist
RUN npm run build 

# Production Stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copy backend files
COPY server.js .

# Copy frontend build from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint (optional, if we still need runtime injection for frontend)
# Since we are now serving from Node, we can inject variables differently or keep the script.
# For simplicity, let's keep the script pattern if we want window.env, 
# OR we can serve a dynamic /env-config.js endpoint from Express!
# Let's switch to the Express endpoint approach, it's cleaner. 
# But for now, standard environment variables passed to Node are enough for the Backend.
# For the Frontend to see VITE_ vars, we still need the injection if we want runtime config.
# Let's stick to standard node command for now and assume variables are present.

EXPOSE 3000
CMD ["node", "server.js"]

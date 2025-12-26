#!/bin/sh
set -e

# Wait for services to be ready
echo "Checking database and redis connection..."
node src/utils/wait-for-services.js

# Placeholder for database migrations
echo "Running migrations..."
# Example: npx sequelize-cli db:migrate

echo "Starting application..."
exec "$@"

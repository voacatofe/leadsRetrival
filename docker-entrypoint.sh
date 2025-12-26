#!/bin/sh
set -e

# Placeholder for database migrations
echo "Running migrations..."
# Example: npx sequelize-cli db:migrate

echo "Starting application..."
exec "$@"

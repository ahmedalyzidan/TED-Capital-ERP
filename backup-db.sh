#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DB_CONTAINER="erp-db"
DB_NAME="erp_db"
DB_USER="postgres"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "Starting database backup for $DB_NAME..."

# Perform the backup using docker exec
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz

if [ $? -eq 0 ]; then
    echo "Backup successfully created at $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
else
    echo "Error: Backup failed!"
    exit 1
fi

# Delete backups older than 7 days
echo "Cleaning up old backups (older than 7 days)..."
find $BACKUP_DIR -name "db_backup_*.sql.gz" -type f -mtime +7 -delete

echo "Backup process completed."

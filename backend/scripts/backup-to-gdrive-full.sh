#!/bin/bash
# --- CONFIGURATION ---
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="/root/erp-backups"
UPLOADS_DIR="/root/backend/uploads"
DB_CONTAINER="erp-db"
DB_USER="postgres"
DB_NAME="erp_db"
GDRIVE_REMOTE="gdrive:TedERP-Backups"
KEEP_DAYS=7

echo "🚀 Starting Full Ted ERP Backup (DB + Uploads): $TIMESTAMP"
mkdir -p $BACKUP_DIR

# --- 2. DUMP DATABASE ---
echo "📦 Dumping database from container..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

if [ $? -ne 0 ]; then
    echo "❌ Error: Database dump failed!"
    exit 1
fi

# --- 3. COMPRESS (DB + UPLOADS) ---
echo "🗜️ Compressing database and uploads..."
# We compress the sql file and the backend/uploads directory
tar -czf $BACKUP_DIR/erp_full_backup_$TIMESTAMP.tar.gz -C $BACKUP_DIR db_backup_$TIMESTAMP.sql -C /root backend/uploads
rm $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# --- 4. UPLOAD TO GOOGLE DRIVE ---
echo "☁️ Uploading to Google Drive..."
rclone copy $BACKUP_DIR/erp_full_backup_$TIMESTAMP.tar.gz $GDRIVE_REMOTE

if [ $? -eq 0 ]; then
    echo "✅ Full Upload Successful!"
else
    echo "⚠️ Warning: Google Drive upload failed. (Check rclone config)"
fi

# --- 5. CLEANUP OLD BACKUPS (LOCAL) ---
echo "🧹 Cleaning up local backups older than $KEEP_DAYS days..."
find $BACKUP_DIR -name "erp_full_backup_*.tar.gz" -mtime +$KEEP_DAYS -delete

echo "🏁 Backup Process Finished: $(date)"

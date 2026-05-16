
$RemoteUser = "root"
$RemoteHost = "46.224.144.166"
$RemotePath = "/root/erp-backups/*"
$LocalPath = "C:\Zidan Folder\ERP backup"

# Ensure local path exists
if (-not (Test-Path $LocalPath)) {
    New-Item -ItemType Directory -Force -Path $LocalPath
}

Write-Host "🔄 Starting ERP Backup Sync from Production Server..." -ForegroundColor Cyan
scp "$($RemoteUser)@$($RemoteHost):$RemotePath" "$LocalPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Sync Completed Successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Sync failed. Check SSH connection." -ForegroundColor Red
}

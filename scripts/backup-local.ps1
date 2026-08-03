# Backup of files that are not in Git.
#
# .env, CLAUDE.md, blocklist.json and _internal/ are deliberately untracked.
# They exist only on this machine, so a disk failure loses them.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\backup-local.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\backup-local.ps1 -Target "D:\backup\dashboard"
#
# Default target is a OneDrive folder, adjust if you keep backups elsewhere.

param(
    [string]$Target = "$env:USERPROFILE\OneDrive\backup\dashboard-local"
)

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dest   = Join-Path $Target $stamp

$items = @('.env', 'CLAUDE.md', 'blocklist.json', '_internal')

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$copied  = @()
$missing = @()

foreach ($item in $items) {
    $path = Join-Path $source $item
    if (Test-Path $path) {
        Copy-Item -Path $path -Destination $dest -Recurse -Force
        $copied += $item
    } else {
        $missing += $item
    }
}

Write-Host ""
Write-Host "Backup written to: $dest"
Write-Host "Copied:  $($copied -join ', ')"

if ($missing.Count -gt 0) {
    Write-Host "MISSING: $($missing -join ', ')" -ForegroundColor Yellow
    Write-Host "Check whether these files should exist before relying on this backup."
}

# Keep the ten most recent backups, remove older ones.
Get-ChildItem -Path $Target -Directory |
    Sort-Object Name -Descending |
    Select-Object -Skip 10 |
    Remove-Item -Recurse -Force

Write-Host ""

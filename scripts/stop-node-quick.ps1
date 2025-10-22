#!/usr/bin/env pwsh
# ===========================================
# SCRIPT RAPIDE POUR ARRETER LES PROCESSUS NODE.JS
# ===========================================

Write-Host "ARRET de tous les processus Node.js..." -ForegroundColor Red

# Arreter tous les processus Node.js
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Arreter tous les processus npm/yarn
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "yarn" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "pnpm" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Tous les processus Node.js ont ete arretes" -ForegroundColor Green

# Verifier le port 3001
Write-Host "Verification du port 3001..." -ForegroundColor Cyan
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($port3001) {
    Write-Host "Le port 3001 est encore utilise" -ForegroundColor Yellow
    foreach ($process in $port3001) {
        $pid = $process.OwningProcess
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  - $($proc.ProcessName) (PID: $pid)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  - Processus inconnu (PID: $pid)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Le port 3001 est libre" -ForegroundColor Green
}

#!/usr/bin/env pwsh
# ===========================================
# SCRIPT POUR ARRÊTER TOUS LES PROCESSUS NODE.JS
# ===========================================
# Ce script arrête tous les processus Node.js en cours d'exécution
# Utile pour libérer les ports occupés par l'API

param(
    [int]$Port = 3001,
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# Fonction pour afficher les messages colorés
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Fonction pour arrêter les processus sur un port spécifique
function Stop-ProcessOnPort {
    param([int]$PortNumber)
    
    Write-Info "Recherche des processus utilisant le port $PortNumber..."
    
    try {
        # Trouver les processus utilisant le port
        $processes = Get-NetTCPConnection -LocalPort $PortNumber -ErrorAction SilentlyContinue | 
                     Select-Object -ExpandProperty OwningProcess -Unique
        
        if ($processes) {
            foreach ($pid in $processes) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Info "Processus trouvé : $($process.ProcessName) (PID: $pid)"
                        
                        if ($Force) {
                            Write-Warning "Arrêt forcé du processus $pid..."
                            Stop-Process -Id $pid -Force
                            Write-Success "Processus $pid arrêté avec succès"
                        } else {
                            Write-Info "Arrêt gracieux du processus $pid..."
                            Stop-Process -Id $pid
                            Write-Success "Processus $pid arrêté avec succès"
                        }
                    }
                } catch {
                    Write-Warning "Impossible d'arrêter le processus $pid : $($_.Exception.Message)"
                }
            }
        } else {
            Write-Success "Aucun processus trouvé sur le port $PortNumber"
        }
    } catch {
        Write-Error "Erreur lors de la recherche des processus sur le port $PortNumber : $($_.Exception.Message)"
    }
}

# Fonction pour arrêter tous les processus Node.js
function Stop-AllNodeProcesses {
    Write-Info "Recherche de tous les processus Node.js..."
    
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            Write-Info "Trouvé $($nodeProcesses.Count) processus Node.js"
            
            foreach ($process in $nodeProcesses) {
                try {
                    Write-Info "Processus : $($process.ProcessName) (PID: $($process.Id))"
                    
                    if ($Force) {
                        Write-Warning "Arrêt forcé du processus $($process.Id)..."
                        Stop-Process -Id $process.Id -Force
                        Write-Success "Processus $($process.Id) arrêté avec succès"
                    } else {
                        Write-Info "Arrêt gracieux du processus $($process.Id)..."
                        Stop-Process -Id $process.Id
                        Write-Success "Processus $($process.Id) arrêté avec succès"
                    }
                } catch {
                    Write-Warning "Impossible d'arrêter le processus $($process.Id) : $($_.Exception.Message)"
                }
            }
        } else {
            Write-Success "Aucun processus Node.js trouvé"
        }
    } catch {
        Write-Error "Erreur lors de la recherche des processus Node.js : $($_.Exception.Message)"
    }
}

# Fonction pour arrêter tous les processus npm/yarn
function Stop-AllNpmProcesses {
    Write-Info "Recherche des processus npm/yarn..."
    
    $processNames = @("npm", "yarn", "pnpm")
    
    foreach ($processName in $processNames) {
        try {
            $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
            
            if ($processes) {
                Write-Info "Trouvé $($processes.Count) processus $processName"
                
                foreach ($process in $processes) {
                    try {
                        Write-Info "Processus : $($process.ProcessName) (PID: $($process.Id))"
                        
                        if ($Force) {
                            Write-Warning "Arrêt forcé du processus $($process.Id)..."
                            Stop-Process -Id $process.Id -Force
                            Write-Success "Processus $($process.Id) arrêté avec succès"
                        } else {
                            Write-Info "Arrêt gracieux du processus $($process.Id)..."
                            Stop-Process -Id $process.Id
                            Write-Success "Processus $($process.Id) arrêté avec succès"
                        }
                    } catch {
                        Write-Warning "Impossible d'arrêter le processus $($process.Id) : $($_.Exception.Message)"
                    }
                }
            }
        } catch {
            Write-Warning "Erreur lors de la recherche des processus $processName : $($_.Exception.Message)"
        }
    }
}

# Fonction principale
function Start-StopProcesses {
    Write-Host "🛑 ARRÊT DE TOUS LES PROCESSUS NODE.JS" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    
    # Arrêter les processus sur le port spécifié
    Stop-ProcessOnPort -PortNumber $Port
    
    Write-Host ""
    
    # Arrêter tous les processus Node.js
    Stop-AllNodeProcesses
    
    Write-Host ""
    
    # Arrêter tous les processus npm/yarn
    Stop-AllNpmProcesses
    
    Write-Host ""
    Write-Success "Tous les processus ont été traités"
    
    # Vérifier que le port est libre
    Write-Host ""
    Write-Info "Vérification que le port $Port est libre..."
    
    Start-Sleep -Seconds 2
    
    try {
        $remainingProcesses = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($remainingProcesses) {
            Write-Warning "Le port $Port est encore utilisé par :"
            foreach ($process in $remainingProcesses) {
                $pid = $process.OwningProcess
                try {
                    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Warning "  - $($proc.ProcessName) (PID: $pid)"
                    }
                } catch {
                    Write-Warning "  - Processus inconnu (PID: $pid)"
                }
            }
        } else {
            Write-Success "Le port $Port est maintenant libre !"
        }
    } catch {
        Write-Success "Le port $Port semble être libre"
    }
}

# Fonction d'aide
function Show-Help {
    Write-Host "🛑 SCRIPT D'ARRÊT DES PROCESSUS NODE.JS" -ForegroundColor Yellow
    Write-Host "=======================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage :" -ForegroundColor White
    Write-Host "  .\scripts\stop-all-processes.ps1 [OPTIONS]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Options :" -ForegroundColor White
    Write-Host "  -Port <number>     Port à vérifier (défaut: 3001)" -ForegroundColor Gray
    Write-Host "  -Force             Arrêt forcé des processus" -ForegroundColor Gray
    Write-Host "  -Verbose           Affichage détaillé" -ForegroundColor Gray
    Write-Host "  -Help              Afficher cette aide" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Exemples :" -ForegroundColor White
    Write-Host "  .\scripts\stop-all-processes.ps1" -ForegroundColor Gray
    Write-Host "  .\scripts\stop-all-processes.ps1 -Port 3000" -ForegroundColor Gray
    Write-Host "  .\scripts\stop-all-processes.ps1 -Force" -ForegroundColor Gray
    Write-Host ""
}

# Point d'entrée principal
if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
    Show-Help
    exit 0
}

try {
    Start-StopProcesses
} catch {
    Write-Error "Erreur fatale : $($_.Exception.Message)"
    exit 1
}

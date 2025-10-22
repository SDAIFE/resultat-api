#!/usr/bin/env pwsh
# ===========================================
# SCRIPT DE VERIFICATION DES DONNEES PERSONNES_ASTREINTES
# ===========================================

param(
    [string]$DBHost = "localhost",
    [int]$DBPort = 1433,
    [string]$DBName = "BD_RESULTAT_PRESIDENTIELLE_2025",
    [string]$DBUser = "sa",
    [SecureString]$DBPassword
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

# Fonction pour obtenir le mot de passe en texte clair
function Get-PlainTextPassword {
    if (-not $DBPassword) {
        Write-Info "Mot de passe non fourni, demande interactive..."
        $DBPassword = Read-Host "Entrez le mot de passe de la base de données" -AsSecureString
    }
    
    $PlainTextPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPassword))
    return $PlainTextPassword
}

# Fonction pour nettoyer le mot de passe de la mémoire
function Clear-PlainTextPassword {
    if ($PlainTextPassword) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR([Runtime.InteropServices.Marshal]::StringToBSTR($PlainTextPassword))
        $PlainTextPassword = $null
    }
}

Write-Host "🔍 VERIFICATION DES DONNEES PERSONNES_ASTREINTES" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Yellow
Write-Host ""

try {
    # Obtenir le mot de passe
    $PlainTextPassword = Get-PlainTextPassword
    
    # Construire la chaîne de connexion
    $connectionString = "Server=${DBHost},${DBPort};Database=${DBName};User Id=${DBUser};Password=$PlainTextPassword;TrustServerCertificate=true;"
    
    Write-Info "Connexion à la base de données..."
    Write-Info "Serveur: ${DBHost}:${DBPort}"
    Write-Info "Base: $DBName"
    Write-Info "Utilisateur: $DBUser"
    
    # Requête pour vérifier les données personnesAstreintes
    $query = @"
SELECT TOP 10
    COD_CEL,
    PERS_ASTR,
    CASE 
        WHEN PERS_ASTR IS NULL THEN 'NULL'
        WHEN PERS_ASTR = '' THEN 'VIDE'
        WHEN ISNUMERIC(PERS_ASTR) = 1 THEN 'NUMERIQUE'
        ELSE 'TEXTE'
    END AS TYPE_VALEUR,
    CASE 
        WHEN PERS_ASTR IS NULL OR PERS_ASTR = '' THEN 0
        ELSE CAST(PERS_ASTR AS INT)
    END AS VALEUR_NUMERIQUE
FROM TBL_IMPORT_EXCEL_CEL
WHERE STATUT_IMPORT = 'COMPLETED'
ORDER BY COD_CEL
"@
    
    Write-Info "Exécution de la requête de vérification..."
    
    # Exécuter la requête
    $result = sqlcmd -S "${DBHost},${DBPort}" -d "$DBName" -U "$DBUser" -P "$PlainTextPassword" -Q "$query" -h -1 -W
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Requête exécutée avec succès"
        Write-Host ""
        Write-Host "RÉSULTATS DE LA VERIFICATION :" -ForegroundColor Green
        Write-Host "==============================" -ForegroundColor Green
        Write-Host $result -ForegroundColor White
        
        # Analyser les résultats
        $lines = $result -split "`n" | Where-Object { $_.Trim() -ne "" }
        $totalRows = 0
        $nullValues = 0
        $emptyValues = 0
        $numericValues = 0
        $textValues = 0
        $totalNumericSum = 0
        
        foreach ($line in $lines) {
            if ($line -match "^\s*\w+\s+\w+\s+\w+\s+\w+\s+\d+") {
                $totalRows++
                $parts = $line -split "\s+" | Where-Object { $_.Trim() -ne "" }
                if ($parts.Length -ge 4) {
                    $typeValeur = $parts[2]
                    $valeurNumerique = [int]$parts[3]
                    
                    switch ($typeValeur) {
                        "NULL" { $nullValues++ }
                        "VIDE" { $emptyValues++ }
                        "NUMERIQUE" { 
                            $numericValues++
                            $totalNumericSum += $valeurNumerique
                        }
                        "TEXTE" { $textValues++ }
                    }
                }
            }
        }
        
        Write-Host ""
        Write-Host "ANALYSE DES DONNEES :" -ForegroundColor Cyan
        Write-Host "====================" -ForegroundColor Cyan
        Write-Host "Total des lignes analysées: $totalRows" -ForegroundColor White
        Write-Host "Valeurs NULL: $nullValues" -ForegroundColor Yellow
        Write-Host "Valeurs vides: $emptyValues" -ForegroundColor Yellow
        Write-Host "Valeurs numériques: $numericValues" -ForegroundColor Green
        Write-Host "Valeurs texte: $textValues" -ForegroundColor Red
        Write-Host "Somme des valeurs numériques: $totalNumericSum" -ForegroundColor Green
        
        if ($numericValues -gt 0) {
            Write-Success "✅ Des données personnesAstreintes sont présentes dans la base"
            Write-Success "✅ La correction devrait maintenant fonctionner"
        } else {
            Write-Warning "⚠️  Aucune donnée numérique trouvée pour personnesAstreintes"
            Write-Warning "⚠️  Vérifiez que les données sont correctement importées"
        }
        
    } else {
        Write-Error "Erreur lors de l'exécution de la requête"
        Write-Error "Code de sortie: $LASTEXITCODE"
    }
    
} catch {
    Write-Error "Erreur lors de la vérification: $($_.Exception.Message)"
} finally {
    # Nettoyer le mot de passe de la mémoire
    Clear-PlainTextPassword
}

Write-Host ""
Write-Host "PROCHAINES ETAPES :" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "1. Redémarrer l'API : npm run start:dev" -ForegroundColor White
Write-Host "2. Tester l'endpoint : GET /api/v1/upload/cel/{codeCel}/data" -ForegroundColor White
Write-Host "3. Vérifier que personnesAstreintes dans metrics n'est plus 0" -ForegroundColor White

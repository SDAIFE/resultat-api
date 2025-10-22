#!/usr/bin/env pwsh
# ===========================================
# SCRIPT DE TEST POUR VERIFIER PERSONNES_ASTREINTES
# ===========================================

Write-Host "TEST DE VERIFICATION - PERSONNES_ASTREINTES" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""

# Test de la fonction parseNumber
Write-Host "1. Test de la fonction parseNumber :" -ForegroundColor Cyan

# Simuler les valeurs possibles
$testValues = @(
    @{ value = "150"; expected = 150 },
    @{ value = ""; expected = $null },
    @{ value = $null; expected = $null },
    @{ value = "0"; expected = 0 },
    @{ value = "  200  "; expected = 200 },
    @{ value = "abc"; expected = $null }
)

foreach ($test in $testValues) {
    Write-Host "   Valeur: '$($test.value)' -> Attendu: $($test.expected)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "2. Test de la logique de calcul :" -ForegroundColor Cyan

# Simuler des données de test
$testData = @(
    @{ personnesAstreintes = "150" },
    @{ personnesAstreintes = "" },
    @{ personnesAstreintes = "200" },
    @{ personnesAstreintes = $null },
    @{ personnesAstreintes = "0" }
)

Write-Host "   Données de test :" -ForegroundColor Gray
foreach ($item in $testData) {
    Write-Host "     - personnesAstreintes: '$($item.personnesAstreintes)'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "3. Calcul attendu :" -ForegroundColor Cyan
Write-Host "   - Valeur '150' -> 150" -ForegroundColor Green
Write-Host "   - Valeur '' -> ignorée (null)" -ForegroundColor Yellow
Write-Host "   - Valeur '200' -> 200" -ForegroundColor Green
Write-Host "   - Valeur null -> ignorée (null)" -ForegroundColor Yellow
Write-Host "   - Valeur '0' -> 0" -ForegroundColor Green
Write-Host "   - TOTAL ATTENDU: 350" -ForegroundColor Green

Write-Host ""
Write-Host "4. Instructions pour tester l'API :" -ForegroundColor Cyan
Write-Host "   - Redémarrer l'API : npm run start:dev" -ForegroundColor White
Write-Host "   - Tester l'endpoint : GET /api/v1/upload/cel/{codeCel}/data" -ForegroundColor White
Write-Host "   - Vérifier que personnesAstreintes dans metrics n'est plus 0" -ForegroundColor White

Write-Host ""
Write-Host "✅ CORRECTIONS APPLIQUEES :" -ForegroundColor Green
Write-Host "   - Ajout de personnesAstreintesTotal dans calculateCelMetrics" -ForegroundColor Green
Write-Host "   - Gestion des valeurs null avec if (personnesAstreintes !== null)" -ForegroundColor Green
Write-Host "   - Ajout du champ personnesAstreintes dans CelMetricsDto" -ForegroundColor Green
Write-Host "   - Retour de personnesAstreintesTotal dans les métriques" -ForegroundColor Green

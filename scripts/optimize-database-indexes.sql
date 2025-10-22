-- ===========================================
-- 🚀 SCRIPT D'OPTIMISATION : Index de Performance
-- ===========================================
-- Date : 2025-01-22
-- Objectif : Optimiser les requêtes lentes détectées (1306ms → ~50ms)
-- 
-- REQUÊTE LENTE CIBLÉE :
-- SELECT DISTINCT c.COD_CEL, c.LIB_CEL, c.ETA_RESULTAT_CEL 
-- FROM TBL_CEL c 
-- INNER JOIN TBL_LV lv ON c.COD_CEL = lv.COD_CEL 
-- WHERE lv.COD_DEPT = @P?

-- ===========================================
-- INDEX POUR OPTIMISER LES JOINTURES
-- ===========================================

-- 1. Index composite principal pour la jointure TBL_LV
-- Optimise : WHERE lv.COD_DEPT = @P AND lv.COD_CEL = c.COD_CEL
CREATE INDEX IDX_TBL_LV_COD_DEPT_COD_CEL 
ON TBL_LV (COD_DEPT, COD_CEL)
WITH (FILLFACTOR = 90);

-- 2. Index sur COD_DEPT pour les filtres WHERE
-- Optimise : WHERE lv.COD_DEPT = @P
CREATE INDEX IDX_TBL_LV_COD_DEPT 
ON TBL_LV (COD_DEPT)
WITH (FILLFACTOR = 90);

-- 3. Index sur COD_CEL pour les jointures
-- Optimise : INNER JOIN TBL_LV lv ON c.COD_CEL = lv.COD_CEL
CREATE INDEX IDX_TBL_LV_COD_CEL 
ON TBL_LV (COD_CEL)
WITH (FILLFACTOR = 90);

-- 4. Index sur la clé primaire de TBL_CEL (si pas déjà présent)
-- Optimise : accès rapide aux données CEL
CREATE INDEX IDX_TBL_CEL_COD_CEL 
ON TBL_CEL (COD_CEL)
WITH (FILLFACTOR = 90);

-- ===========================================
-- INDEX SUPPLÉMENTAIRES POUR AUTRES REQUÊTES
-- ===========================================

-- 5. Index pour les requêtes par commune
-- Optimise : WHERE lv.COD_DEPT = @dept AND lv.COD_COM = @com
CREATE INDEX IDX_TBL_LV_COD_DEPT_COM 
ON TBL_LV (COD_DEPT, COD_COM)
WITH (FILLFACTOR = 90);

-- 6. Index pour les requêtes par sous-préfecture
-- Optimise : WHERE lv.COD_DEPT = @dept AND lv.COD_SP = @sp
CREATE INDEX IDX_TBL_LV_COD_DEPT_SP 
ON TBL_LV (COD_DEPT, COD_SP)
WITH (FILLFACTOR = 90);

-- 7. Index pour les statistiques par état
-- Optimise : WHERE etatResultatCellule IN ('I', 'P')
CREATE INDEX IDX_TBL_CEL_ETAT_RESULTAT 
ON TBL_CEL (ETA_RESULTAT_CEL)
WITH (FILLFACTOR = 90);

-- ===========================================
-- INDEX POUR TBL_IMPORT_EXCEL_CEL
-- ===========================================

-- 8. Index composite principal pour les requêtes d'import
-- Optimise : WHERE COD_CEL IN (...) AND statutImport = 'COMPLETED'
CREATE INDEX IDX_TBL_IMPORT_EXCEL_CEL_COD_CEL_STATUT 
ON TBL_IMPORT_EXCEL_CEL (COD_CEL, STATUT_IMPORT)
WITH (FILLFACTOR = 90);

-- 9. Index sur COD_CEL pour les jointures et filtres
-- Optimise : WHERE COD_CEL IN (...)
CREATE INDEX IDX_TBL_IMPORT_EXCEL_CEL_COD_CEL 
ON TBL_IMPORT_EXCEL_CEL (COD_CEL)
WITH (FILLFACTOR = 90);

-- 10. Index sur STATUT_IMPORT pour les filtres
-- Optimise : WHERE statutImport = 'COMPLETED'
CREATE INDEX IDX_TBL_IMPORT_EXCEL_CEL_STATUT 
ON TBL_IMPORT_EXCEL_CEL (STATUT_IMPORT)
WITH (FILLFACTOR = 90);

-- 11. Index sur DATE_IMPORT pour les tris
-- Optimise : ORDER BY dateImport DESC
CREATE INDEX IDX_TBL_IMPORT_EXCEL_CEL_DATE_IMPORT 
ON TBL_IMPORT_EXCEL_CEL (DATE_IMPORT DESC)
WITH (FILLFACTOR = 90);

-- ===========================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- ===========================================

-- Script pour vérifier que les index ont été créés
SELECT 
    i.name AS IndexName,
    t.name AS TableName,
    c.name AS ColumnName,
    i.type_desc AS IndexType
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.name LIKE 'IDX_TBL_%'
ORDER BY t.name, i.name, ic.key_ordinal;

-- ===========================================
-- STATISTIQUES DE PERFORMANCE
-- ===========================================

-- Script pour analyser l'utilisation des index
SELECT 
    OBJECT_NAME(s.object_id) AS TableName,
    i.name AS IndexName,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates
FROM sys.dm_db_index_usage_stats s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(s.object_id) IN ('TBL_CEL', 'TBL_LV')
ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC;

-- ===========================================
-- NOTES D'OPTIMISATION
-- ===========================================

/*
🎯 GAINS ATTENDUS :
- Requête principale : 1306ms → ~50ms (96% plus rapide)
- Jointures TBL_CEL ↔ TBL_LV : Optimisées
- Filtres par département : Accélérés
- Requêtes batch : Possibles

📊 IMPACT UTILISATEUR :
- Chargement page : 2-6s → 0.5-1.5s
- Navigation : Fluide et réactive
- Expérience : "Lent" → "Rapide"

⚠️ MAINTENANCE :
- Surveiller l'utilisation des index
- Réorganiser si fragmentation > 30%
- Mettre à jour les statistiques régulièrement
*/

import { PrismaService } from '../src/database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

interface LvData {
  COD_DEPT: string;
  COD_SP: string;
  COD_COM: string;
  COD_LV: string;
  COD_CEL: string;
  LIB_LV: string;
}

class LvImporter {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  /**
   * Parse une ligne CSV en tenant compte des points-virgules
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Ajouter le dernier élément
    result.push(current.trim());
    
    return result;
  }

  /**
   * Lit et parse le fichier CSV
   */
  private async readCsvFile(filePath: string): Promise<LvData[]> {
    console.log('📖 Lecture du fichier CSV...');
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Ignorer la première ligne (en-têtes)
    const dataLines = lines.slice(1);
    
    const lvData: LvData[] = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;
      
      try {
        const columns = this.parseCsvLine(line);
        
        if (columns.length >= 6) {
          lvData.push({
            COD_DEPT: columns[0],
            COD_SP: columns[1],
            COD_COM: columns[2],
            COD_LV: columns[3],
            COD_CEL: columns[4],
            LIB_LV: columns[5]
          });
        } else {
          console.warn(`⚠️  Ligne ${i + 2} ignorée (colonnes insuffisantes): ${line}`);
        }
      } catch (error) {
        console.warn(`⚠️  Erreur ligne ${i + 2}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${lvData.length} lignes de données extraites`);
    return lvData;
  }

  /**
   * Vérifie les relations avant l'import
   */
  private async validateRelations(lvData: LvData[]): Promise<{ valid: LvData[], invalid: LvData[] }> {
    console.log('🔍 Validation des relations...');
    
    const valid: LvData[] = [];
    const invalid: LvData[] = [];
    
    // Récupérer les codes existants
    const [departements, sousPrefectures, communes, cellules] = await Promise.all([
      this.prisma.tblDept.findMany({ select: { codeDepartement: true } }),
      this.prisma.tblSp.findMany({ 
        select: { 
          codeDepartement: true, 
          codeSousPrefecture: true 
        } 
      }),
      this.prisma.tblCom.findMany({ 
        select: { 
          codeDepartement: true, 
          codeSousPrefecture: true, 
          codeCommune: true 
        } 
      }),
      this.prisma.tblCel.findMany({ select: { codeCellule: true } })
    ]);
    
    const deptCodes = new Set(departements.map(d => d.codeDepartement));
    const spCodes = new Set(sousPrefectures.map(sp => `${sp.codeDepartement}-${sp.codeSousPrefecture}`));
    const comCodes = new Set(communes.map(com => `${com.codeDepartement}-${com.codeSousPrefecture}-${com.codeCommune}`));
    const celCodes = new Set(cellules.map(cel => cel.codeCellule));
    
    for (const lv of lvData) {
      const isValid = 
        deptCodes.has(lv.COD_DEPT) &&
        spCodes.has(`${lv.COD_DEPT}-${lv.COD_SP}`) &&
        comCodes.has(`${lv.COD_DEPT}-${lv.COD_SP}-${lv.COD_COM}`) &&
        (lv.COD_CEL === '' || celCodes.has(lv.COD_CEL));
      
      if (isValid) {
        valid.push(lv);
      } else {
        invalid.push(lv);
      }
    }
    
    console.log(`✅ ${valid.length} enregistrements valides`);
    console.log(`❌ ${invalid.length} enregistrements invalides`);
    
    if (invalid.length > 0) {
      console.log('📋 Premiers enregistrements invalides:');
      invalid.slice(0, 5).forEach((lv, index) => {
        console.log(`  ${index + 1}. ${lv.COD_DEPT}-${lv.COD_SP}-${lv.COD_COM}-${lv.COD_LV} (CEL: ${lv.COD_CEL})`);
      });
    }
    
    return { valid, invalid };
  }

  /**
   * Importe les données dans la base
   */
  private async importData(lvData: LvData[]): Promise<void> {
    console.log('💾 Import des données...');
    
    const batchSize = 1000;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < lvData.length; i += batchSize) {
      const batch = lvData.slice(i, i + batchSize);
      
      try {
        await this.prisma.tblLv.createMany({
          data: batch.map(lv => ({
            codeDepartement: lv.COD_DEPT,
            codeSousPrefecture: lv.COD_SP,
            codeCommune: lv.COD_COM,
            codeLieuVote: lv.COD_LV,
            codeCellule: lv.COD_CEL || null,
            libelleLieuVote: lv.LIB_LV
          }))
        });
        
        imported += batch.length;
        console.log(`📦 Lot ${Math.floor(i / batchSize) + 1}: ${batch.length} enregistrements importés`);
        
      } catch (error) {
        console.error(`❌ Erreur lot ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      }
    }
    
    console.log(`✅ Import terminé: ${imported} enregistrements importés, ${errors} erreurs`);
  }

  /**
   * Affiche les statistiques finales
   */
  private async showStats(): Promise<void> {
    console.log('\n📊 Statistiques finales:');
    
    const totalLv = await this.prisma.tblLv.count();
    const lvWithCel = await this.prisma.tblLv.count({
      where: { codeCellule: { not: null } }
    });
    const lvWithoutCel = await this.prisma.tblLv.count({
      where: { codeCellule: null }
    });
    
  }

  /**
   * Lance l'import complet
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Début de l\'import des lieux de vote 2020...\n');
      
      const filePath = path.join(__dirname, '../carto/lv2020.csv');
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
      
      // 1. Lire le fichier CSV
      const lvData = await this.readCsvFile(filePath);
      
      // 2. Valider les relations
      const { valid, invalid } = await this.validateRelations(lvData);
      
      if (valid.length === 0) {
        console.log('❌ Aucun enregistrement valide trouvé. Arrêt de l\'import.');
        return;
      }
      
      // 3. Demander confirmation
      console.log(`\n❓ Voulez-vous importer ${valid.length} enregistrements valides ? (y/N)`);
      
      // Pour l'automatisation, on importe directement
      // En production, vous pourriez ajouter une confirmation interactive
      
      // 4. Importer les données
      await this.importData(valid);
      
      // 5. Afficher les statistiques
      await this.showStats();
      
      console.log('\n✅ Import terminé avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error.message);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Exécution du script
async function main() {
  const importer = new LvImporter();
  await importer.run();
}

main().catch(console.error);
# Prompt pour l'Équipe Backend - API Nest.js + Prisma

## Mission
Vous êtes chargés de développer l'API backend d'une application de transmission des résultats électoraux en utilisant **Nest.js avec TypeScript et Prisma ORM**. Cette API remplace un système ASP.NET MVC existant et doit gérer les données électorales de la présidentielle 2020 en Côte d'Ivoire.

## Contexte métier
L'API doit permettre :
- L'authentification et la gestion des utilisateurs (agents CEI)
- L'importation et le traitement de fichiers Excel contenant les résultats
- La validation et publication des résultats par département
- Le suivi en temps réel des états de traitement
- La génération de rapports et statistiques électorales

## Spécifications techniques

### Stack technologique requise
- **Framework :** Nest.js 10+ avec TypeScript
- **ORM :** Prisma 5+ avec SQL Server
- **Base de données :** SQL Server
- **Authentification :** JWT avec Passport.js
- **Validation :** class-validator + class-transformer
- **Upload :** multer pour les fichiers Excel
- **Excel :** xlsx ou exceljs pour le parsing
- **Logging :** Winston ou Nest.js Logger
- **Documentation :** Swagger/OpenAPI
- **Tests :** Jest + supertest

### Architecture du projet

```
src/
├── auth/                 # Module d'authentification
├── users/                # Gestion des utilisateurs
├── departements/         # Gestion des départements
├── cels/                 # Gestion des CELs
├── bureaux-vote/         # Gestion des bureaux de vote
├── resultats/            # Gestion des résultats
├── candidats/            # Gestion des candidats
├── upload/               # Service d'upload de fichiers
├── publication/          # Service de publication
├── rapports/             # Génération de rapports
├── dashboard/            # Statistiques dashboard
├── common/               # Utilitaires partagés
├── database/             # Configuration Prisma
└── main.ts              # Point d'entrée
```

## Schéma Prisma à créer

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  firstName   String
  lastName    String
  password    String
  role        Role     @default(USER)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  departments Department[]
  sessions    Session[]
  
  @@map("users")
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

enum Role {
  ADMIN
  USER
}

model Department {
  id           String    @id @default(cuid())
  code         String    @unique
  name         String
  regionCode   String?
  userId       String?
  isPublished  Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  // Relations
  user         User?     @relation(fields: [userId], references: [id])
  cels         Cel[]
  votingBooth  VotingBooth[]
  
  @@map("departments")
}

model Cel {
  id              String    @id @default(cuid())
  code            String    @unique
  name            String
  type            String?
  votingBoothCount Int?
  startLine       Float?
  status          CelStatus @default(PENDING)
  departmentId    String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  department      Department @relation(fields: [departmentId], references: [id])
  
  @@map("cels")
}

model VotingBooth {
  id                String    @id @default(cuid())
  departmentCode    String
  subPrefectureCode String
  communeCode       String
  locationCode      String
  boothNumber       String
  registeredVoters  Int?
  malePopulation    Int?
  femalePopulation  Int?
  abstentions       Int?
  maleVoters        Int?
  femaleVoters      Int?
  totalVoters       Int?
  participationRate Float?
  nullBallots       Int?
  blankBallots      Int?
  validVotes        Int?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  department        Department @relation(fields: [departmentCode], references: [code])
  results           Result[]
  
  @@unique([departmentCode, subPrefectureCode, communeCode, locationCode, boothNumber])
  @@map("voting_booths")
}

model Result {
  id               String      @id @default(cuid())
  votingBoothId    String
  candidateId      String
  score            Int?
  isPublished      Boolean     @default(false)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  
  // Relations
  votingBooth      VotingBooth @relation(fields: [votingBoothId], references: [id])
  candidate        Candidate   @relation(fields: [candidateId], references: [id])
  
  @@unique([votingBoothId, candidateId])
  @@map("results")
}

model Candidate {
  id           String   @id @default(cuid())
  orderNumber  String   @unique
  firstName    String
  lastName     String
  partyId      String
  photoPath    String?
  symbolPath   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  party        Party    @relation(fields: [partyId], references: [id])
  results      Result[]
  
  @@map("candidates")
}

model Party {
  id          String      @id @default(cuid())
  code        String      @unique
  name        String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Relations
  candidates  Candidate[]
  
  @@map("parties")
}

enum CelStatus {
  PENDING    // En attente de données (N)
  VALIDATED  // Données validées (V)
  PUBLISHED  // Données publiées (P)
}

// Vues (à créer comme des requêtes Prisma raw)
// View_Departement_Utilisateur
// View_Cels_Utilisateur  
// View_Suivi_Publication_Resultat
```

## Modules et Services à développer

### 1. Module d'authentification (AuthModule)

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  async validateUser(email: string, password: string): Promise<any>
  async login(user: any): Promise<{ access_token: string, refresh_token: string }>
  async register(createUserDto: CreateUserDto): Promise<User>
  async refreshToken(refreshToken: string): Promise<{ access_token: string }>
  async logout(userId: string): Promise<void>
}

// auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto)
  
  @Post('register')
  @UseGuards(AdminGuard)
  async register(@Body() createUserDto: CreateUserDto)
  
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req)
}
```

### 2. Module des utilisateurs (UsersModule)

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  async findAll(): Promise<User[]>
  async findOne(id: string): Promise<User>
  async findByEmail(email: string): Promise<User>
  async create(createUserDto: CreateUserDto): Promise<User>
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User>
  async remove(id: string): Promise<void>
}
```

### 3. Module des CELs (CelsModule)

```typescript
// cels.service.ts
@Injectable()
export class CelsService {
  async findByUser(userId: string): Promise<Cel[]>
  async findOne(id: string): Promise<Cel>
  async findByCode(code: string): Promise<Cel>
  async updateStatus(id: string, status: CelStatus): Promise<Cel>
  async getStatistics(userId: string): Promise<CelStatistics>
}

// cels.controller.ts
@Controller('cels')
export class CelsController {
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string)
  
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string)
  
  @Post(':id/import')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@Param('id') id: string, @UploadedFile() file: Express.Multer.File)
  
  @Put(':id/validate')
  @UseGuards(JwtAuthGuard)
  async validate(@Param('id') id: string)
}
```

### 4. Module d'upload (UploadModule)

```typescript
// upload.service.ts
@Injectable()
export class UploadService {
  async processExcelFile(file: Express.Multer.File, celId: string): Promise<void>
  async validateExcelStructure(filePath: string): Promise<boolean>
  async parseExcelData(filePath: string, cel: Cel): Promise<any[]>
  async processVotingBoothData(data: any[]): Promise<void>
  async processResultsData(data: any[], celId: string): Promise<void>
  async validateDataIntegrity(data: any[]): Promise<boolean>
}
```

### 5. Module de publication (PublicationModule)

```typescript
// publication.service.ts
@Injectable()
export class PublicationService {
  async getDepartmentsReadyToPublish(userId: string): Promise<Department[]>
  async publishDepartment(departmentId: string): Promise<void>
  async checkAllCelsValidated(departmentId: string): Promise<boolean>
  async updatePublicationStatus(departmentId: string): Promise<void>
}

// publication.controller.ts
@Controller('publication')
export class PublicationController {
  @Get('departments/:userId')
  @UseGuards(JwtAuthGuard)
  async getDepartmentsToPublish(@Param('userId') userId: string)
  
  @Post('publish/:departmentId')
  @UseGuards(JwtAuthGuard)
  async publishDepartment(@Param('departmentId') departmentId: string)
}
```

### 6. Module dashboard (DashboardModule)

```typescript
// dashboard.service.ts
@Injectable()
export class DashboardService {
  async getUserStatistics(userId: string): Promise<DashboardStats>
  async getDepartmentProgress(userId: string): Promise<DepartmentProgress[]>
  async getGlobalStatistics(): Promise<GlobalStats>
}

// Types
interface DashboardStats {
  totalCels: number;
  celsPending: number;
  celsValidated: number;
  celsPublished: number;
  totalDepartments: number;
  departmentsPublished: number;
}
```

## Note importante sur l'authentification

**ATTENTION :** Cette nouvelle application n'utilise PAS les tables système ASP.NET Identity de l'ancien projet. Nous implémentons une authentification moderne avec :

- **Modèle User personnalisé** avec conventions Prisma (id CUID, email unique, timestamps)
- **JWT tokens** avec refresh tokens stockés en base
- **Hash des mots de passe** avec bcrypt
- **Sessions gérées** via la table Session
- **Pas de dépendance** aux tables AspNetUsers, AspNetRoles, etc.

## DTOs et Validation

```typescript
// auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// users/dto/create-user.dto.ts
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// cels/dto/import-excel.dto.ts
export class ImportExcelDto {
  @IsString()
  @IsNotEmpty()
  celId: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;
}
```

## Gestion des fichiers Excel

### Service de traitement Excel

```typescript
@Injectable()
export class ExcelProcessorService {
  async validateFileName(fileName: string, celName: string): Promise<boolean> {
    const fileNameWithoutExt = path.parse(fileName).name;
    return fileNameWithoutExt === celName;
  }

  async parseExcelFile(filePath: string, cel: TblCel): Promise<ExcelData[]> {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Extraire les données selon la ligne de début et fin
    const startRow = cel.ligneDebCel;
    const endRow = startRow + cel.nbrBvCel - 1;
    
    // Parser et valider les données
    // Retourner les données formatées
  }

  async createDynamicTable(tableName: string): Promise<void> {
    // Créer une table temporaire avec la structure des fichiers Excel
    const createTableQuery = `
      CREATE TABLE ${tableName} (
        [ORD] varchar(255),
        [REF_LV] varchar(255),
        [LIB_LV] varchar(255),
        [NUMERO_BV] varchar(255),
        [POP_HOM] varchar(255),
        [POP_FEM] varchar(255),
        [POP_TOTAL] varchar(255),
        [PERS_ASTR] varchar(255),
        [VOT_HOM] varchar(255),
        [VOT_FEM] varchar(255),
        [TOTAL_VOT] varchar(255),
        [TAUX_PART] varchar(255),
        [BUL_NUL] varchar(255),
        [BUL_BLANC] varchar(255),
        [SUF_EXP] varchar(255),
        [SCORE_1] varchar(255),
        [SCORE_2] varchar(255),
        [SCORE_3] varchar(255),
        [SCORE_4] varchar(255),
        [0] varchar(255)
      )
    `;
    
    await this.prisma.$executeRawUnsafe(createTableQuery);
  }
}
```

## Sécurité et autorisations

### Guards personnalisés

```typescript
// guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return user && user.typUtil === 'ADMIN';
  }
}

// guards/user-owns-resource.guard.ts
@Injectable()
export class UserOwnsResourceGuard implements CanActivate {
  constructor(private usersService: UsersService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifier que l'utilisateur a accès à la ressource demandée
  }
}
```

### Intercepteurs

```typescript
// interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => this.logger.log(`${method} ${url} ${Date.now() - now}ms`))
    );
  }
}
```

## Configuration et variables d'environnement

```env
# .env
DATABASE_URL="sqlserver://localhost:1433;database=BD_RESULTAT_PRESIDENTIELLE_2020;user=sa;password=yourpassword;trustServerCertificate=true"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
```

## API Endpoints à implémenter

### Authentification
```
POST /api/auth/login
POST /api/auth/register (admin only)
GET /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
```

### Dashboard
```
GET /api/dashboard/stats/:numUtil
GET /api/dashboard/departements/:numUtil
GET /api/dashboard/global-stats (admin only)
```

### Utilisateurs
```
GET /api/users (admin only)
GET /api/users/:numUtil
POST /api/users (admin only)
PUT /api/users/:numUtil
DELETE /api/users/:numUtil (admin only)
```

### CELs
```
GET /api/cels/user/:numUtil
GET /api/cels/:codCel
POST /api/cels/:codCel/import
PUT /api/cels/:codCel/validate
GET /api/cels/:codCel/progress
```

### Départements
```
GET /api/departements/user/:numUtil
GET /api/departements/:codDept
GET /api/departements/:codDept/cels
```

### Publication
```
GET /api/publication/ready/:numUtil
POST /api/publication/publish/:codeDept
GET /api/publication/status/:codeDept
```

### Rapports
```
GET /api/rapports/departement/:codeDept
GET /api/rapports/cel/:codCel
POST /api/rapports/export
GET /api/rapports/global (admin only)
```

## Tests à implémenter

### Tests unitaires
```typescript
// cels.service.spec.ts
describe('CelsService', () => {
  let service: CelsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CelsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CelsService>(CelsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should find CELs by user', async () => {
    // Test implementation
  });
});
```

### Tests d'intégration
```typescript
// cels.controller.e2e-spec.ts
describe('CelsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/cels/user/:numUtil (GET)', () => {
    return request(app.getHttpServer())
      .get('/cels/user/1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });
});
```

## Logging et monitoring

```typescript
// Configuration Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ],
});
```

## Performance et optimisation

### Mise en cache avec Redis (optionnel)
```typescript
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T> {
    return this.cacheManager.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.cacheManager.set(key, value, ttl);
  }
}
```

## Documentation Swagger

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('API Résultats Électoraux 2020')
  .setDescription('API pour la transmission des résultats électoraux')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

## Livrables attendus

1. **API Nest.js complète** avec tous les endpoints fonctionnels
2. **Schéma Prisma** configuré et migrations créées
3. **Tests unitaires et d'intégration** avec couverture > 80%
4. **Documentation Swagger** complète
5. **Scripts de déploiement** avec Docker
6. **Guide d'installation** et configuration

## Contraintes techniques

- **Performance :** Réponse API < 200ms pour les requêtes simples
- **Sécurité :** Validation stricte des données, protection CSRF
- **Scalabilité :** Architecture modulaire et extensible
- **Logging :** Traçabilité complète des actions utilisateur


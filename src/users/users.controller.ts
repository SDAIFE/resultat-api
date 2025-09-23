import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query, 
  ParseIntPipe,
  DefaultValuePipe 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignDepartementsDto } from './dto/assign-departements.dto';
import { UserResponseDto, UserListResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Créer un nouvel utilisateur
   */
  @Post()
  @Roles('SADMIN', 'ADMIN')
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Récupérer tous les utilisateurs avec pagination
   */
  @Get()
  @Roles('SADMIN', 'ADMIN')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ): Promise<UserListResponseDto> {
    return this.usersService.findAll(page, limit, search);
  }

  /**
   * Récupérer un utilisateur par ID
   */
  @Get(':id')
  @Roles('SADMIN', 'ADMIN')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  /**
   * Mettre à jour un utilisateur
   */
  @Patch(':id')
  @Roles('SADMIN', 'ADMIN')
  async update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Supprimer un utilisateur
   */
  @Delete(':id')
  @Roles('SADMIN')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.usersService.remove(id);
    return { message: 'Utilisateur supprimé avec succès' };
  }

  /**
   * Assigner des départements à un utilisateur
   */
  @Patch(':id/departements')
  @Roles('SADMIN', 'ADMIN')
  async assignDepartements(
    @Param('id') id: string,
    @Body() assignDepartementsDto: AssignDepartementsDto
  ): Promise<UserResponseDto> {
    return this.usersService.assignDepartements(id, assignDepartementsDto);
  }

  /**
   * Retirer tous les départements d'un utilisateur
   */
  @Delete(':id/departements')
  @Roles('SADMIN', 'ADMIN')
  async removeAllDepartements(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.removeAllDepartements(id);
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  @Get('profile/me')
  async getMyProfile(@CurrentUser() user: any): Promise<UserResponseDto> {
    return this.usersService.findOne(user.id);
  }

  /**
   * Mettre à jour le profil de l'utilisateur connecté
   */
  @Patch('profile/me')
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() updateUserDto: Omit<UpdateUserDto, 'roleId' | 'departementCodes'>
  ): Promise<UserResponseDto> {
    return this.usersService.update(user.id, updateUserDto);
  }
}

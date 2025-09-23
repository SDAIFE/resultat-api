import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Récupérer tous les rôles
   */
  @Get()
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findAll() {
    return this.rolesService.findAll();
  }

  /**
   * Récupérer la liste simple des rôles (pour les formulaires)
   */
  @Get('list/simple')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getSimpleList() {
    return this.rolesService.getSimpleList();
  }
}

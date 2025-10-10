import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegionResponseDto, RegionListResponseDto, RegionStatsDto } from './dto/region-response.dto';
import { SimpleRegionDto } from './dto/simple-region.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer toutes les régions avec pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    codeDistrict?: string
  ): Promise<RegionListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { libelleRegion: { contains: search } },
        { codeRegion: { contains: search } },
      ];
    }

    if (codeDistrict) {
      where.codeDistrict = codeDistrict;
    }

    const [regions, total] = await Promise.all([
      this.prisma.tblReg.findMany({
        where,
        skip,
        take: limit,
        include: {
          district: true,
          departements: {
            select: {
              id: true,
              codeDepartement: true,
              libelleDepartement: true,
            },
          },
        },
        orderBy: { libelleRegion: 'asc' },
      }),
      this.prisma.tblReg.count({ where }),
    ]);

    return {
      regions: regions.map(region => this.formatRegionResponse(region)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer une région par code
   */
  async findOne(codeRegion: string): Promise<RegionResponseDto> {
    const region = await this.prisma.tblReg.findUnique({
      where: { codeRegion },
      include: {
        district: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
      },
    });

    if (!region) {
      throw new NotFoundException('Région non trouvée');
    }

    return this.formatRegionResponse(region);
  }

  /**
   * Récupérer les statistiques des régions
   */
  async getStats(): Promise<RegionStatsDto> {
    const [totalRegions, totalDistricts, totalDepartements] = await Promise.all([
      this.prisma.tblReg.count(),
      this.prisma.tblDst.count(),
      this.prisma.tblDept.count(),
    ]);

    return {
      totalRegions,
      totalDistricts,
      totalDepartements,
    };
  }

  /**
   * Récupérer les régions d'un district
   */
  async findByDistrict(codeDistrict: string): Promise<RegionResponseDto[]> {
    const regions = await this.prisma.tblReg.findMany({
      where: { codeDistrict },
      include: {
        district: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
      },
      orderBy: { libelleRegion: 'asc' },
    });

    return regions.map(region => this.formatRegionResponse(region));
  }

  /**
   * Récupérer la liste simple des régions (pour les formulaires et filtres)
   */
  async getSimpleList(): Promise<SimpleRegionDto[]> {
    const regions = await this.prisma.tblReg.findMany({
      select: {
        codeRegion: true,
        libelleRegion: true,
      },
      orderBy: {
        libelleRegion: 'asc',
      },
    });

    return regions.map(region => ({
      codeRegion: region.codeRegion,
      libelleRegion: region.libelleRegion,
    }));
  }

  /**
   * Formater la réponse région
   */
  private formatRegionResponse(region: any): RegionResponseDto {
    return {
      id: region.id,
      codeRegion: region.codeRegion,
      libelleRegion: region.libelleRegion,
      codeDistrict: region.codeDistrict,
      district: region.district ? {
        id: region.district.id,
        codeDistrict: region.district.codeDistrict,
        libelleDistrict: region.district.libelleDistrict,
      } : undefined,
      departements: region.departements?.map((dept: any) => ({
        id: dept.id,
        codeDepartement: dept.codeDepartement,
        libelleDepartement: dept.libelleDepartement,
      })),
    };
  }
}


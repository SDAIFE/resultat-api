import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO simple pour les listes de régions (formulaires, filtres)
 */
export class SimpleRegionDto {
  @ApiProperty({ 
    example: 'R01', 
    description: 'Code unique de la région' 
  })
  codeRegion: string;

  @ApiProperty({ 
    example: 'District Autonome d\'Abidjan', 
    description: 'Libellé de la région' 
  })
  libelleRegion: string;
}


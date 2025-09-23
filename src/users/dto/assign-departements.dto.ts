import { IsArray, IsString } from 'class-validator';

export class AssignDepartementsDto {
  @IsArray({ message: 'Les départements doivent être un tableau' })
  @IsString({ each: true, message: 'Chaque code de département doit être une chaîne' })
  departementCodes: string[];
}

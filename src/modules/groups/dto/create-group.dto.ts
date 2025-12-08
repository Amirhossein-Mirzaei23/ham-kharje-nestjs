// dto/create-group.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsInt()
  ownerId: number;
}


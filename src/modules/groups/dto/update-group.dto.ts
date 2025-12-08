import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsInt()
  ownerId: number; // required for authorization check
}

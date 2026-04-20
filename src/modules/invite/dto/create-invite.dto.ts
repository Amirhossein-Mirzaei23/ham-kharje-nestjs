import { IsInt, IsOptional } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsInt()
  groupId: number;

  @IsInt()
  inviterId: number;
}

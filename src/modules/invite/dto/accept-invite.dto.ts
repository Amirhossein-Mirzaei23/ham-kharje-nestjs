import { IsInt } from 'class-validator';

export class AcceptInviteDto {
  @IsInt()
  userId: number;
}

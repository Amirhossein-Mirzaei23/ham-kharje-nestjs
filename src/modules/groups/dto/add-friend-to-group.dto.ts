import { IsInt } from 'class-validator';

export class AddFriendToGroupDto {
  @IsInt()
  ownerId: number;   // who requests adding (must be owner)
  @IsInt()
  friendId: number;  // friend to add
}

import { IsInt, IsNumber } from 'class-validator';

export class AddFrinedByLinkDto {
  @IsNumber()
  hostUserId;

  @IsNumber()
  newFriendId;
}

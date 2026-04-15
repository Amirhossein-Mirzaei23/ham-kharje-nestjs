  import { IsInt, IsNumber } from 'class-validator';
  
  export class AddMemberByLinkDto {
    @IsNumber()
    groupId;   

    @IsNumber()
    hostUserId;

    @IsNumber()
    newMemberUserId
  }
  
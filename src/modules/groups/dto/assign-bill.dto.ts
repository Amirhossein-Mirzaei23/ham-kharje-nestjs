// dto/
import { IsInt } from 'class-validator';

export class AssignBillDto {
  @IsInt()
  ownerId: number; // who assigns (must be owner)
  @IsInt()
  billId: number;
}

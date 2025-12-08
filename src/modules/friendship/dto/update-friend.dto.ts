export class UpdateFriendDto {
  isAccepted: boolean;
}

export class SendFriendRequestDto {
senderId: number;
receiverId: number;
}
export class AcceptFriendRequestDto {
friendshipId: number;
}
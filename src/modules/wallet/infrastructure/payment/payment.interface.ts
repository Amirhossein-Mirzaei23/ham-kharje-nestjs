export interface PaymentGateway {
  request(data: {
    amount: number;
    callbackUrl: string;
    description: string;
    referenceId: string;
  }): Promise<{ authority: string; paymentUrl: string }>;

  verify(authority: string, amount: number): Promise<any>;
}

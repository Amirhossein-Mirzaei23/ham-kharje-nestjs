import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class JibitLoggerInterceptor implements NestInterceptor {
  private logger = new Logger('JibitTransfer');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const body = req.body;

    this.logger.log(`📨 Sending transfer request | track: ${body.recordTrackId}`);
    this.logger.debug(JSON.stringify(body));

    const start = Date.now();

    return next.handle().pipe(
      tap((res) => {
        this.logger.log(
          `✅ Response received for track: ${body.recordTrackId} | ${Date.now() - start}ms`,
        );
        this.logger.debug(JSON.stringify(res));
      }),
    );
  }
}

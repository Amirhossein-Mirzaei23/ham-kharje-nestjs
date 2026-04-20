import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class JibitExceptionFilter implements ExceptionFilter {
  private logger = new Logger('JibitError');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.error('❌ Jibit API Error:', exception.response?.data || exception.message);

    response.status(status).json({
      success: false,
      message: 'خطا در اتصال به سرویس جیبیت',
      details: exception.response?.data || null,
    });
  }
}

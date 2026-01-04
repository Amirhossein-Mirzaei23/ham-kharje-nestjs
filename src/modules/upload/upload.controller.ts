import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: require('multer').memoryStorage(), // store in memory
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg)$/)) {
          cb(new Error('Invalid image type!'), false);
        } else cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException(`ارسال فایل الزامی میباشد`);

    // Upload to FTP
    const fullURL = await this.uploadService.uploadToFTP(file);

    return {
      message: 'Image uploaded successfully to FTP',
      filePath: fullURL,
      filename: file.originalname,
      size: file.size,
      fullURL,
    };
  }
}

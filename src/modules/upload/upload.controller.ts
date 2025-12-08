import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto'; 

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const uploadService = new UploadService();

          const uniqueName = uploadService.generateFilename(file.originalname);
          cb(null, uniqueName);
        },
      }),

      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg|svg\+xml)$/)) {
          cb(new Error('Invalid image type!'), false);
        } else cb(null, true);
      },

      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): UploadResponseDto {
    if (!file) throw new BadRequestException(`ارسال فایل الزامی میباشد`);
    const filePath = `/uploads/images/${file.filename}`;

    const fullURL = this.uploadService.generateFullImageURL(file.filename);

    return {
      message: 'Image uploaded successfully',
      filePath,
      filename: file.filename,
      size: file.size,
      fullURL: fullURL   
    };
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {

  validateImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg)$/)) {
      throw new BadRequestException('Only JPG, PNG, WEBP images are allowed');
    }

    return true;
  }

  generateFilename(originalName: string): string {
    const fileExt = extname(originalName);
    return `${uuid()}${fileExt}`;
  }

  buildFilePath(filename: string): string {
    return `/uploads/images/${filename}`;
  }
    generateFullImageURL(filename: string): string {
    return `${process.env.SERVER_URL}/uploads/images/${filename}`;
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private ftpHost = process.env.FTP_HOST;
  private ftpPort = Number(process.env.FTP_PORT || 21);
  private ftpUser = process.env.FTP_USER;
  private ftpPassword = process.env.FTP_PASS;

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

  async uploadToFTP(file: Express.Multer.File): Promise<string> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.ftpHost,
        port: this.ftpPort,
        user: this.ftpUser,
        password: this.ftpPassword,
        secure: false, // set true if using FTPS
      });

      const remoteFileName = this.generateFilename(file.originalname);
      const remotePath = `/${remoteFileName}`;

      await client.ensureDir('/uploads/images'); // create folder if not exists
      const stream = Readable.from(file.buffer); // convert buffer to readable stream
      await client.uploadFrom(stream, remotePath);

      return `${process.env.FTP_BASE_URL}${remotePath}`; // return full URL
    } catch (err) {
      throw new BadRequestException('FTP upload failed: ' + err.message);
    } finally {
      client.close();
    }
  }
}

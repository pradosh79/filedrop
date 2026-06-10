import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  constructor(private readonly maxSizeBytes: number) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File size ${file.size} exceeds maximum allowed size ${this.maxSizeBytes}`,
      );
    }
    return file;
  }
}

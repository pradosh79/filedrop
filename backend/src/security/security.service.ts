import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FieldType } from '../uploads/entities/upload-field.entity';
import { fromBuffer } from 'file-type';
import * as NodeClam from 'clamscan';
import { Readable } from 'stream';

const BLOCKED_EXTENSIONS = [
  'exe','bat','cmd','sh','ps1','php','asp','aspx','jsp','py',
  'rb','pl','cgi','htaccess','htpasswd','config','ini','dll',
  'com','vbs','jar','msi','apk','ipa',
];

const ALLOWED_MIMES: Record<string, string[]> = {
  [FieldType.IMAGE]:    ['image/jpeg','image/png','image/gif','image/webp','image/bmp','image/tiff','image/svg+xml'],
  [FieldType.PDF]:      ['application/pdf'],
  [FieldType.VIDEO]:    ['video/mp4','video/mpeg','video/quicktime','video/x-msvideo','video/webm'],
  [FieldType.ZIP]:      ['application/zip','application/x-zip-compressed','application/x-rar-compressed','application/x-7z-compressed'],
  [FieldType.DOCUMENT]: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv',
  ],
  [FieldType.CUSTOM]: [],
};

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  /**
   * Detect MIME from buffer magic bytes and validate against field type.
   * Returns { valid, detectedMime }.
   */
  async validateMimeType(
    buffer: Buffer,
    claimedMime: string,
    fieldType: string,
  ): Promise<{ valid: boolean; detectedMime: string }> {
    try {
      const detected = await fromBuffer(buffer);
      const detectedMime = detected?.mime ?? claimedMime;

      if (fieldType === FieldType.CUSTOM) {
        return { valid: true, detectedMime };
      }

      const allowed = ALLOWED_MIMES[fieldType] ?? [];
      return { valid: allowed.includes(detectedMime), detectedMime };
    } catch {
      return { valid: false, detectedMime: claimedMime };
    }
  }

  /**
   * Validate file extension against blocked list and optional allowlist.
   */
  validateExtension(fileName: string, allowedExtensions?: string[]): boolean {
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return false;
    }
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (BLOCKED_EXTENSIONS.includes(ext)) return false;
    if (allowedExtensions?.length) return allowedExtensions.includes(ext);
    return true;
  }

  /**
   * Validate file size in bytes against MB thresholds.
   */
  validateFileSize(sizeBytes: number, maxSizeMb: number, minSizeMb = 0): void {
    const maxBytes = maxSizeMb * 1024 * 1024;
    const minBytes = minSizeMb * 1024 * 1024;
    if (sizeBytes < minBytes) {
      throw new BadRequestException(`File too small (min ${minSizeMb} MB)`);
    }
    if (sizeBytes > maxBytes) {
      throw new BadRequestException(`File too large (max ${maxSizeMb} MB)`);
    }
  }

  sanitizeFileName(fileName: string): string {
    let clean = fileName
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/[<>:"|?*\x00-\x1f]/g, '')
      .trim();
    if (clean.length > 200) {
      const ext = clean.split('.').pop() ?? '';
      clean = clean.substring(0, 195) + '.' + ext;
    }
    return clean || 'upload';
  }

  async scanForViruses(buffer: Buffer): Promise<{ isClean: boolean; virusName?: string }> {
    try {
      const clamscan = await new NodeClam().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST ?? 'clamav',
          port: parseInt(process.env.CLAMAV_PORT ?? '3310', 10),
          timeout: 30_000,
        },
      });
      const stream = Readable.from(buffer);
      const { isInfected, viruses } = await clamscan.scanStream(stream);
      return { isClean: !isInfected, virusName: viruses?.[0] };
    } catch (err) {
      this.logger.warn(`ClamAV scan unavailable: ${err.message} — marking as clean`);
      return { isClean: true };
    }
  }
}

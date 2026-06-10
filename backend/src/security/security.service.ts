import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FieldType } from '../uploads/entities/upload-field.entity';
import * as fileType from 'file-type';
import * as crypto from 'crypto';
import axios from 'axios';

const BLOCKED_EXTENSIONS = [
  'exe','bat','cmd','sh','ps1','php','asp','aspx','jsp','py',
  'rb','pl','cgi','htaccess','htpasswd','config','ini','dll',
  'com','vbs','jar','msi','apk','ipa','scr','pif','reg',
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

  /** Detect MIME type from buffer magic bytes using file-type v14 (CJS). */
  async validateMimeType(
    buffer: Buffer,
    claimedMime: string,
    fieldType: string,
  ): Promise<{ valid: boolean; detectedMime: string }> {
    try {
      const detected = await fileType.fromBuffer(buffer);
      const detectedMime = detected?.mime ?? claimedMime;
      if (fieldType === FieldType.CUSTOM) return { valid: true, detectedMime };
      const allowed = ALLOWED_MIMES[fieldType] ?? [];
      return { valid: allowed.includes(detectedMime), detectedMime };
    } catch {
      return { valid: false, detectedMime: claimedMime };
    }
  }

  validateExtension(fileName: string, allowedExtensions?: string[]): boolean {
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return false;
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (BLOCKED_EXTENSIONS.includes(ext)) return false;
    if (allowedExtensions?.length) return allowedExtensions.includes(ext);
    return true;
  }

  validateFileSize(sizeBytes: number, maxSizeMb: number, minSizeMb = 0): void {
    const maxBytes = maxSizeMb * 1024 * 1024;
    const minBytes = minSizeMb * 1024 * 1024;
    if (sizeBytes < minBytes) throw new BadRequestException(`File too small (min ${minSizeMb} MB)`);
    if (sizeBytes > maxBytes) throw new BadRequestException(`File too large (max ${maxSizeMb} MB)`);
  }

  sanitizeFileName(fileName: string): string {
    let clean = fileName
      .replace(/\.\./g, '').replace(/[/\\]/g, '')
      .replace(/[<>:"|?*\x00-\x1f]/g, '').trim();
    if (clean.length > 200) {
      const ext = clean.split('.').pop() ?? '';
      clean = clean.substring(0, 195) + '.' + ext;
    }
    return clean || 'upload';
  }

  /**
   * Virus scan — uses VirusTotal API when VIRUSTOTAL_API_KEY is set.
   * Falls back to SHA-256 hash blocklist. Never throws.
   */
  async scanForViruses(buffer: Buffer): Promise<{ isClean: boolean; virusName?: string }> {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (apiKey) return this.scanWithVirusTotal(buffer, apiKey);
    return this.basicHashCheck(buffer);
  }

  private async scanWithVirusTotal(
    buffer: Buffer,
    apiKey: string,
  ): Promise<{ isClean: boolean; virusName?: string }> {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', buffer, { filename: 'upload', contentType: 'application/octet-stream' });

      const uploadRes = await axios.post(
        'https://www.virustotal.com/api/v3/files',
        form,
        { headers: { 'x-apikey': apiKey, ...form.getHeaders() }, timeout: 30_000 },
      );

      const analysisId = uploadRes.data?.data?.id;
      if (!analysisId) return { isClean: true };

      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await axios.get(
          `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
          { headers: { 'x-apikey': apiKey }, timeout: 10_000 },
        );
        const status = res.data?.data?.attributes?.status;
        if (status !== 'completed') continue;
        const stats = res.data?.data?.attributes?.stats ?? {};
        const malicious = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
        if (malicious > 2) {
          const results = res.data?.data?.attributes?.results ?? {};
          const virusName = Object.values(results as Record<string, any>)
            .find((r: any) => r.category === 'malicious')?.result ?? 'Unknown';
          return { isClean: false, virusName };
        }
        return { isClean: true };
      }
      return { isClean: true };
    } catch (err) {
      this.logger.warn(`VirusTotal scan failed: ${err.message} — marking clean`);
      return { isClean: true };
    }
  }

  private basicHashCheck(buffer: Buffer): { isClean: boolean; virusName?: string } {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const known = new Set([
      '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f', // EICAR
    ]);
    if (known.has(hash)) return { isClean: false, virusName: 'EICAR-Test-File' };
    return { isClean: true };
  }
}

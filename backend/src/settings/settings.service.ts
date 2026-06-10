import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantSettings } from './entities/merchant-settings.entity';

export interface UpdateSettingsDto {
  buttonColor?: string;
  buttonText?: string;
  buttonBorderRadius?: number;
  language?: string;
  customMessages?: Record<string, string>;
  notifyMerchantOnUpload?: boolean;
  notificationEmail?: string;
  notifyCustomerOnUpload?: boolean;
  signedUrlExpirySeconds?: number;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(MerchantSettings)
    private readonly settingsRepository: Repository<MerchantSettings>,
  ) {}

  async getSettings(merchantId: string): Promise<MerchantSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { merchantId },
    });

    if (!settings) {
      // Create defaults on first access
      settings = this.settingsRepository.create({
        merchantId,
        buttonColor: '#008060',
        buttonText: 'Upload File',
        buttonBorderRadius: 4,
        language: 'en',
        customMessages: {},
        notifyMerchantOnUpload: true,
        notifyCustomerOnUpload: false,
        signedUrlExpirySeconds: 3600,
      });
      await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(
    merchantId: string,
    dto: UpdateSettingsDto,
  ): Promise<MerchantSettings> {
    const settings = await this.getSettings(merchantId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async getPublicSettings(merchantId: string): Promise<Partial<MerchantSettings>> {
    const settings = await this.getSettings(merchantId);
    return {
      buttonColor: settings.buttonColor,
      buttonText: settings.buttonText,
      buttonBorderRadius: settings.buttonBorderRadius,
      language: settings.language,
      customMessages: settings.customMessages,
    };
  }
}

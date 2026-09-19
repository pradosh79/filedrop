import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GdprController } from './gdpr.controller';
import { Merchant } from '../auth/entities/merchant.entity';
import { Upload } from '../uploads/entities/upload.entity';
import { UploadField } from '../uploads/entities/upload-field.entity';
import { MerchantSettings } from '../settings/entities/merchant-settings.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { Product } from '../products/entities/product.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { StorageModule } from '../storage/storage.module';
import { MerchantCleanupModule } from '../common/merchant-cleanup.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Merchant,
      Upload,
      UploadField,
      MerchantSettings,
      Subscription,
      Product,
      Notification,
    ]),
    StorageModule,
    MerchantCleanupModule,
  ],
  controllers: [GdprController],
})
export class GdprModule {}

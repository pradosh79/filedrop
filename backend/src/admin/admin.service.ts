import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../plans/entities/plan.entity';
import { Merchant } from '../auth/entities/merchant.entity';
import { Upload } from '../uploads/entities/upload.entity';
import { Subscription } from '../billing/entities/subscription.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Merchant) private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Upload) private readonly uploadRepo: Repository<Upload>,
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
  ) {}

  // ── Plans ────────────────────────────────────────────────────────────────

  async getPlans() {
    return await this.planRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async updatePlan(id: string, dto: {
    displayName?: string;
    monthlyPrice?: number;
    uploadsPerMonth?: number;
    storageBytes?: number;
    maxFileSizeBytes?: number;
    features?: any;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    // Only update provided fields
    if (dto.displayName  !== undefined) plan.displayName     = dto.displayName;
    if (dto.monthlyPrice !== undefined) plan.monthlyPrice    = dto.monthlyPrice;
    if (dto.uploadsPerMonth !== undefined) plan.uploadsPerMonth = dto.uploadsPerMonth;
    if (dto.storageBytes !== undefined) plan.storageBytes    = dto.storageBytes;
    if (dto.maxFileSizeBytes !== undefined) plan.maxFileSizeBytes = dto.maxFileSizeBytes;
    if (dto.features     !== undefined) plan.features        = dto.features;
    if (dto.isActive     !== undefined) plan.isActive        = dto.isActive;
    if (dto.sortOrder    !== undefined) plan.sortOrder       = dto.sortOrder;

    const saved = await this.planRepo.save(plan);
    return saved;
  }

  // ── Merchants ────────────────────────────────────────────────────────────

  async getMerchants() {
    const merchants = await this.merchantRepo.find({
      order: { createdAt: 'DESC' },
    });

    // Attach subscription info for each merchant
    const result = await Promise.all(
      merchants.map(async (m) => {
        const sub = await this.subRepo.findOne({
          where: { merchantId: m.id },
          order: { createdAt: 'DESC' },
        });
        return {
          ...m,
          accessToken: '***hidden***',
          subscription: sub ? { status: sub.status, planId: sub.planId } : null,
        };
      }),
    );

    return result;
  }

  async getMerchant(id: string) {
    const merchant = await this.merchantRepo.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const subscriptions = await this.subRepo.find({
      where: { merchantId: id },
      order: { createdAt: 'DESC' },
    });

    const uploadCount = await this.uploadRepo.count({ where: { merchantId: id } });

    return {
      data: {
        ...merchant,
        accessToken: '***hidden***',
        subscriptions,
        uploadCount,
      },
    };
  }

  async deleteMerchant(id: string) {
    const merchant = await this.merchantRepo.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    await this.merchantRepo.remove(merchant);
  }

  // ── Platform metrics ─────────────────────────────────────────────────────

  async getMetrics() {
    const [totalMerchants, activeMerchants, totalUploads] = await Promise.all([
      this.merchantRepo.count(),
      this.merchantRepo.count({ where: { isActive: true } }),
      this.uploadRepo.count(),
    ]);

    const storageResult = await this.merchantRepo
      .createQueryBuilder('m')
      .select('SUM(m.storageUsedBytes)', 'total')
      .getRawOne();

    const planBreakdown = await this.subRepo
      .createQueryBuilder('s')
      .select('s.planId', 'planId')
      .addSelect('COUNT(*)', 'count')
      .where("s.status IN ('active', 'trial')")
      .groupBy('s.planId')
      .getRawMany();

    const recentMerchants = await this.merchantRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      data: {
        totalMerchants,
        activeMerchants,
        inactiveMerchants: totalMerchants - activeMerchants,
        totalUploads,
        totalStorageBytes: Number(storageResult?.total ?? 0),
        planBreakdown,
        recentMerchants: recentMerchants.map(m => ({
          ...m,
          accessToken: '***hidden***',
        })),
      },
    };
  }

  async getAllUploads() {
    const uploads = await this.uploadRepo.find({
      where: { deletedAt: null },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return uploads;
  }

  // ── App settings ─────────────────────────────────────────────────────────

  private appSettings: Record<string, any> = {
    appName: 'Custom File Upload Pro',
    supportEmail: 'support@yourapp.com',
    maxFreeStorageGB: 1,
    defaultTrialDays: 14,
    maintenanceMode: false,
    allowNewRegistrations: true,
  };

  async getAppSettings() {
    return this.appSettings;
  }

  async updateAppSettings(settings: Record<string, any>) {
    this.appSettings = { ...this.appSettings, ...settings };
    return this.appSettings;
  }
}

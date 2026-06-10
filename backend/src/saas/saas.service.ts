import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../auth/entities/merchant.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { Plan } from '../plans/entities/plan.entity';

export interface TenantUsage {
  merchantId: string;
  shopDomain: string;
  planName: string;
  uploadsThisMonth: number;
  uploadsLimit: number;
  storageUsedBytes: number;
  storageLimit: number;
  maxFileSizeBytes: number;
  isWithinLimits: boolean;
  usagePercent: { uploads: number; storage: number };
}

export interface SaaSMetrics {
  totalMerchants: number;
  activeMerchants: number;
  totalUploads: number;
  totalStorageBytes: number;
  mrr: number; // monthly recurring revenue in USD cents
  planBreakdown: Record<string, number>;
}

@Injectable()
export class SaaSService {
  private readonly logger = new Logger(SaaSService.name);

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  /**
   * Get current plan limits and usage for a merchant.
   * Used to enforce plan limits on upload and field creation.
   */
  async getTenantUsage(merchantId: string): Promise<TenantUsage> {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new Error(`Merchant ${merchantId} not found`);

    const plan = await this.getActivePlan(merchantId);

    const uploadsLimit = plan.uploadsPerMonth === -1 ? Infinity : plan.uploadsPerMonth;
    const storageLimit = plan.storageBytes;
    const maxFileSizeBytes = plan.maxFileSizeBytes;

    const uploadsPercent = uploadsLimit === Infinity
      ? 0
      : Math.round((merchant.monthlyUploads / uploadsLimit) * 100);

    const storagePercent = Math.round((merchant.storageUsedBytes / storageLimit) * 100);

    return {
      merchantId,
      shopDomain: merchant.shopDomain,
      planName: plan.name,
      uploadsThisMonth: merchant.monthlyUploads,
      uploadsLimit: plan.uploadsPerMonth,
      storageUsedBytes: merchant.storageUsedBytes,
      storageLimit,
      maxFileSizeBytes,
      isWithinLimits: uploadsPercent < 100 && storagePercent < 100,
      usagePercent: { uploads: uploadsPercent, storage: storagePercent },
    };
  }

  /** Enforce plan limits before allowing an upload. Throws if limit exceeded. */
  async enforceUploadLimit(merchantId: string, fileSizeBytes: number): Promise<void> {
    const usage = await this.getTenantUsage(merchantId);

    if (fileSizeBytes > usage.maxFileSizeBytes) {
      throw new Error(
        `File size ${Math.round(fileSizeBytes / 1048576)}MB exceeds your plan limit of ${Math.round(usage.maxFileSizeBytes / 1048576)}MB. Upgrade to upload larger files.`,
      );
    }

    if (usage.uploadsLimit !== -1 && usage.uploadsThisMonth >= usage.uploadsLimit) {
      throw new Error(
        `Monthly upload limit (${usage.uploadsLimit}) reached. Upgrade your plan to continue uploading.`,
      );
    }

    const storagePercent = (usage.storageUsedBytes / usage.storageLimit) * 100;
    if (storagePercent >= 100) {
      throw new Error(
        `Storage limit reached. Upgrade your plan to get more storage.`,
      );
    }
  }

  /** Platform-wide SaaS metrics (for internal admin monitoring). */
  async getPlatformMetrics(): Promise<SaaSMetrics> {
    const [totalMerchants, activeMerchants] = await Promise.all([
      this.merchantRepo.count(),
      this.merchantRepo.count({ where: { isActive: true } }),
    ]);

    const storageResult = await this.merchantRepo
      .createQueryBuilder('m')
      .select('SUM(m.storageUsedBytes)', 'total')
      .addSelect('SUM(m.totalUploads)', 'uploads')
      .getRawOne();

    const activeSubs = await this.subRepo
      .createQueryBuilder('s')
      .select('p.name', 'planName')
      .addSelect('COUNT(s.id)', 'count')
      .addSelect('p.monthlyPrice', 'price')
      .innerJoin(Plan, 'p', 'p.id = s.planId')
      .where("s.status IN ('active', 'trial')")
      .groupBy('p.name')
      .getRawMany();

    const planBreakdown: Record<string, number> = {};
    let mrr = 0;
    for (const row of activeSubs) {
      planBreakdown[row.planName] = Number(row.count);
      mrr += Number(row.price) * Number(row.count) * 100; // cents
    }

    return {
      totalMerchants,
      activeMerchants,
      totalUploads: Number(storageResult?.uploads ?? 0),
      totalStorageBytes: Number(storageResult?.total ?? 0),
      mrr,
      planBreakdown,
    };
  }

  /** Check if merchant is on trial and how many days remain. */
  async getTrialStatus(merchantId: string): Promise<{
    isOnTrial: boolean;
    daysRemaining: number;
    trialEndsAt: Date | null;
  }> {
    const sub = await this.subRepo.findOne({
      where: { merchantId, status: 'trial' as any },
      order: { createdAt: 'DESC' },
    });

    if (!sub?.trialEndsAt) return { isOnTrial: false, daysRemaining: 0, trialEndsAt: null };

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86_400_000),
    );

    return { isOnTrial: daysRemaining > 0, daysRemaining, trialEndsAt: sub.trialEndsAt };
  }

  private async getActivePlan(merchantId: string): Promise<Plan> {
    const sub = await this.subRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.plan', 'p')
      .where('s.merchantId = :merchantId', { merchantId })
      .andWhere("s.status IN ('active', 'trial')")
      .orderBy('s.createdAt', 'DESC')
      .getOne();

    if (sub?.plan) return sub.plan;

    // No active subscription — return free plan limits
    const freePlan = await this.planRepo.findOne({ where: { name: 'free' as any } });
    if (freePlan) return freePlan;

    // Absolute fallback
    return {
      uploadsPerMonth: 100,
      storageBytes: 1_073_741_824,
      maxFileSizeBytes: 10_485_760,
      name: 'free',
    } as Plan;
  }
}

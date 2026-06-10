import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UnauthorizedException,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
type any = Express.Multer.File;

/**
 * Public API used by the Shopify theme extension (upload-widget.liquid).
 * No JWT required — authenticated via shop domain + HMAC or merchant token
 * embedded in the widget's initialization script.
 */
@ApiTags('Storefront (Public)')
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  /**
   * GET /storefront/fields
   * Called by the widget on page load to fetch active upload fields for a product.
   */
  @Get('fields')
  @ApiOperation({ summary: 'Get upload fields for a product (public)' })
  getFields(
    @Query('merchantId') merchantId: string,
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
    @Query('tags') tags?: string,
  ) {
    if (!merchantId) throw new BadRequestException('merchantId is required');
    const tagList = tags ? tags.split(',').map(t => t.trim()) : [];
    return this.storefrontService.getFieldsForProduct(merchantId, productId, variantId, tagList);
  }

  /**
   * GET /storefront/settings/:merchantId
   * Widget styling config (button color, text, border radius, language).
   */
  @Get('settings/:merchantId')
  @ApiOperation({ summary: 'Get public storefront settings' })
  getSettings(@Param('merchantId') merchantId: string) {
    return this.storefrontService.getPublicSettings(merchantId);
  }

  /**
   * POST /storefront/upload
   * The actual file upload from the customer's browser.
   * merchantId embedded in the widget identifies which store this belongs to.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Customer file upload (public)' })
  async uploadFile(
    @UploadedFile() file: any,
    @Body('merchantId') merchantId: string,
    @Body('fieldId') fieldId: string,
    @Body('cartToken') cartToken?: string,
    @Body('productId') productId?: string,
    @Body('variantId') variantId?: string,
    @Body('customerEmail') customerEmail?: string,
    @Headers('x-shopify-shop-domain') shopDomain?: string,
  ) {
    if (!merchantId) throw new BadRequestException('merchantId is required');
    if (!fieldId) throw new BadRequestException('fieldId is required');
    if (!file) throw new BadRequestException('No file provided');

    return this.storefrontService.handleCustomerUpload({
      merchantId,
      fieldId,
      file,
      cartToken,
      productId,
      variantId,
      customerEmail,
    });
  }

  /**
   * DELETE /storefront/upload/:uploadId
   * Customer removes their file before submitting the order.
   */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('upload/:uploadId/remove')
  @ApiOperation({ summary: 'Customer removes their upload (public)' })
  removeUpload(
    @Param('uploadId') uploadId: string,
    @Body('merchantId') merchantId: string,
    @Body('cartToken') cartToken: string,
  ) {
    return this.storefrontService.removeCustomerUpload(uploadId, merchantId, cartToken);
  }
}

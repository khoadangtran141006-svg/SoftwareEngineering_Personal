import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProductsModule } from './products/products.module.js';
import { OrdersModule } from './orders/orders.module.js';

import { AuthModule } from './auth/auth.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { PromotionsModule } from './promotions/promotions.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { buildTypeOrmOptions } from './database/typeorm.config.js';
import { THROTTLER_OPTIONS } from './security/security.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => buildTypeOrmOptions(configService),
    }),
    ThrottlerModule.forRoot(THROTTLER_OPTIONS),
    AuthModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    InventoryModule,
    PromotionsModule,
    PrismaModule,
  ],

  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

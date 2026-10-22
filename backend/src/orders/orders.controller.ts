import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, ForbiddenException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@Body() createOrderDto: CreateOrderDto, @Req() request: Request & { user: { id: number } }) {
    return this.ordersService.createOrder(createOrderDto, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff')
  findActiveForStaff(@Req() request: Request & { user: { role: string } }) {
    this.assertStaff(request);
    return this.ordersService.findActiveForStaff();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() request: Request & { user: { id: number } }) {
    return this.ordersService.findMine(request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelMine(@Param('id', ParseIntPipe) id: number, @Req() request: Request & { user: { id: number } }) {
    return this.ordersService.cancelMine(id, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateOrderStatusDto, @Req() request: Request & { user: { role: string } }) {
    this.assertStaff(request);
    return this.ordersService.updateStatus(id, body.status);
  }

  private assertStaff(request: { user: { role: string } }) {
    if (request.user.role !== 'STAFF') throw new ForbiddenException('Chỉ nhân viên mới được thực hiện thao tác này');
  }
}

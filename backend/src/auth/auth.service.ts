import {
  ConflictException,
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, MoreThan, Repository, DataSource } from 'typeorm';
import nodemailer from 'nodemailer';

import { User } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { corsOrigins } from '../security/security.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly dataSource: DataSource,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email này đã được sử dụng',
      );
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      10,
    );

    const user = this.userRepository.create({
      name: registerDto.name,
      email,
      passwordHash,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      createdAt: savedUser.createdAt,
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Email hoặc mật khẩu không chính xác',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Email hoặc mật khẩu không chính xác',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
    );

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }

  async me(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
    };
  }

  async forgotPassword(email: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const smtpHost = process.env.SMTP_HOST;
    if (isProduction && !smtpHost) {
      throw new ServiceUnavailableException('Password reset email is not configured');
    }

    const genericMessage = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.';
    const user = await this.userRepository.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user) return { message: genericMessage };

    await this.resetTokens.delete({ userId: user.id });
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.resetTokens.save(this.resetTokens.create({ userId: user.id, tokenHash, expiresAt, usedAt: null }));

    const resetUrl = `${corsOrigins()[0]}/reset-password?token=${token}`;
    if (smtpHost) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD ?? '',
        } : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? `no-reply@${smtpHost}`,
        to: user.email,
        subject: 'Đặt lại mật khẩu BrewLite',
        text: `Liên kết đặt lại mật khẩu (có hiệu lực trong 15 phút): ${resetUrl}`,
        html: `<p>Liên kết đặt lại mật khẩu BrewLite có hiệu lực trong 15 phút.</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p>`,
      });
      return { message: genericMessage };
    }

    return { message: genericMessage, resetToken: token };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.resetTokens.findOne({
      where: { tokenHash, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    if (!reset) throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');

    const passwordHash = await bcrypt.hash(password, 10);
    await this.dataSource.transaction(async (manager) => {
      const consumed = await manager.update(
        PasswordResetToken,
        { id: reset.id, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
        { usedAt: new Date() },
      );
      if (!consumed.affected) throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      await manager.update(User, { id: reset.userId }, { passwordHash });
    });
    return { message: 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.' };
  }
}

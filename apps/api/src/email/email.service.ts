import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { loadSmtpConfig, type SmtpConfig } from '../common/auth.config';
import { buildVerificationEmail } from './email.templates';
import type { SendMailInput } from './email.types';

type OutgoingMail = SendMailInput & { from: string };

interface SmtpTransporter {
  sendMail(mail: OutgoingMail): Promise<unknown>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private config: SmtpConfig | undefined;
  private transporter: SmtpTransporter | undefined;

  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    const { subject, text, html } = buildVerificationEmail(otp);
    const mail: SendMailInput = { to: email, subject, text, html };
    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: this.config!.fromEmail,
        ...mail,
      });
    } catch (error) {
      console.error(error);
      this.logger.error('Failed to send verification email');
      throw error;
    }
  }

  private getTransporter(): SmtpTransporter {
    this.config ??= loadSmtpConfig();
    this.transporter ??= nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      auth: { user: this.config.user, pass: this.config.password },
    });
    return this.transporter;
  }
}

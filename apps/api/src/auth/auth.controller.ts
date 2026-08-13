import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME, authCookieOptions } from '../common/auth.config';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { RequestUser } from './auth.types';
import {
  loginRequestSchema,
  resendVerificationRequestSchema,
  signupRequestSchema,
  verifyEmailRequestSchema,
  type LoginRequest,
  type ResendVerificationRequest,
  type SignupRequest,
  type VerifyEmailRequest,
} from './auth.dto';
import { CurrentUser } from './current-user.decorator';

const publicUserExample = {
  id: 1,
  email: 'user@example.com',
  emailVerified: true,
};

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an account and send a verification code' })
  @ApiBody({ schema: { example: { email: 'user@example.com', password: 'password' } } })
  @ApiCreatedResponse({
    description: 'Account created; email verification required',
    schema: { example: { requiresEmailVerification: true } },
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiConflictResponse({ description: 'USER_ALREADY_EXISTS' })
  signup(
    @Body(new ZodValidationPipe(signupRequestSchema)) body: SignupRequest,
  ) {
    return this.auth.signup(body);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with a 4-digit code and start a session' })
  @ApiBody({ schema: { example: { email: 'user@example.com', code: '4821' } } })
  @ApiOkResponse({
    description: 'Email verified; auth_token cookie set',
    schema: { example: publicUserExample },
  })
  @ApiBadRequestResponse({
    description: 'INVALID_VERIFICATION_CODE or VERIFICATION_CODE_EXPIRED',
  })
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailRequestSchema)) body: VerifyEmailRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.verifyEmail(body);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
    return user;
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend the email verification code' })
  @ApiBody({ schema: { example: { email: 'user@example.com' } } })
  @ApiOkResponse({
    description: 'Verification email sent when applicable',
    schema: { example: { requiresEmailVerification: true } },
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  resendVerification(
    @Body(new ZodValidationPipe(resendVerificationRequestSchema))
    body: ResendVerificationRequest,
  ) {
    return this.auth.resendVerification(body.email);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ schema: { example: { email: 'user@example.com', password: 'password' } } })
  @ApiOkResponse({
    description: 'Logged in; auth_token cookie set',
    schema: { example: publicUserExample },
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({ description: 'EMAIL_NOT_VERIFIED' })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.login(body);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiCookieAuth('auth_token')
  @ApiOperation({ summary: 'Clear the auth cookie' })
  @ApiNoContentResponse({ description: 'Logged out' })
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
  logout(@Res({ passthrough: true }) res: Response): void {
    const { httpOnly, secure, sameSite, path } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, { httpOnly, secure, sameSite, path });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiCookieAuth('auth_token')
  @ApiOperation({ summary: 'Return the current user' })
  @ApiOkResponse({
    description: 'Public user',
    schema: { example: publicUserExample },
  })
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }
}

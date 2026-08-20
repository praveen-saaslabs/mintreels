import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME, authCookieOptions } from '../common/auth.config';
import { GUEST_COOKIE_NAME, guestCookieOptions } from '../common/guest.config';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GuestClaimService } from '../guest/guest-claim.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { RequestUser } from './auth.types';
import {
  loginRequestSchema,
  signupRequestSchema,
  type LoginRequest,
  type SignupRequest,
} from './auth.dto';
import { CurrentUser } from './current-user.decorator';

const publicUserExample = {
  id: 1,
  email: 'user@example.com',
};

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly guestClaim: GuestClaimService,
  ) {}

  /**
   * After a session starts, adopt any guest data the browser was carrying and
   * drop the now-defunct guest cookie. Idempotent + best-effort (never blocks login).
   */
  private async claimGuest(req: Request, res: Response, userId: number): Promise<void> {
    const guestToken = req.cookies?.[GUEST_COOKIE_NAME] as string | undefined;
    const claimed = await this.guestClaim.claim(guestToken, userId);
    if (guestToken) {
      const { httpOnly, secure, sameSite, path } = guestCookieOptions(0);
      res.clearCookie(GUEST_COOKIE_NAME, { httpOnly, secure, sameSite, path });
    }
    void claimed;
  }

  @Post('signup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiBody({ schema: { example: { email: 'user@example.com', password: 'password' } } })
  @ApiCreatedResponse({
    description: 'Account created; auth_token cookie set',
    schema: { example: publicUserExample },
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiConflictResponse({ description: 'USER_ALREADY_EXISTS' })
  async signup(
    @Body(new ZodValidationPipe(signupRequestSchema)) body: SignupRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.signup(body);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
    await this.claimGuest(req, res, user.id);
    return user;
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
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.login(body);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
    await this.claimGuest(req, res, user.id);
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

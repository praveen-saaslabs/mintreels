import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { VoicesService } from './voices.service';

@ApiTags('Voices')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/voices')
export class VoicesController {
  constructor(private readonly voicesService: VoicesService) {}

  @ApiOperation({ summary: 'List stock TTS voices for clip voiceover and overdub' })
  @ApiOkResponse({
    description: 'Array of stock voices',
    schema: {
      example: [
        {
          id: 'stock_dorit_en_us',
          name: 'Dorit',
          description: 'Clear US English narrator',
          language: 'en-US',
        },
      ],
    },
  })
  @Get()
  list() {
    return this.voicesService.list();
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Service is up', schema: { example: { status: 'ok' } } })
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

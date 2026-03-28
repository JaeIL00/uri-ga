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
import { buildSessionCookieHeader } from '../common/session/session-cookie';
import { SessionGuard } from '../common/session/session.guard';
import type { Response } from 'express';
import type { RequestWithSession } from '../common/session/request-with-session';
import type {
  SessionBootstrapRequest,
  SessionMeDto,
} from './dto/bootstrap-session.dto';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('bootstrap')
  @HttpCode(200)
  async bootstrap(
    @Body() body: SessionBootstrapRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.sessionService.bootstrap(body);
    response.setHeader('Set-Cookie', buildSessionCookieHeader(result.session));
    return result;
  }

  @Get('me')
  @UseGuards(SessionGuard)
  getMe(@Req() request: RequestWithSession): Promise<SessionMeDto> {
    return this.sessionService.getMe(request.sessionContext);
  }
}

import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../common/session/session.guard';
import type { RequestWithSession } from '../common/session/request-with-session';
import type { AiReportDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(SessionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  generate(
    @Req() request: RequestWithSession,
    @Query('period') period: string,
  ): Promise<AiReportDto> {
    return this.reportsService.generate(request.sessionContext, period);
  }

  @Get(':period')
  get(
    @Req() request: RequestWithSession,
    @Param('period') period: string,
  ): Promise<AiReportDto> {
    return this.reportsService.get(request.sessionContext, period);
  }
}

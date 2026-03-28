import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionGuard } from './common/session/session.guard';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { prismaProvider } from './infrastructure/prisma.provider';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';
import { TransactionsController } from './transactions/transactions.controller';
import { TransactionsService } from './transactions/transactions.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    SessionController,
    TransactionsController,
    EventsController,
    ReportsController,
  ],
  providers: [
    AppService,
    prismaProvider,
    SessionService,
    TransactionsService,
    EventsService,
    ReportsService,
    SessionGuard,
  ],
})
export class AppModule {}

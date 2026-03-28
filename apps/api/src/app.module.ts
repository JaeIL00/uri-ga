import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionGuard } from './common/session/session.guard';
import { EventsService } from './events/events.service';
import { prismaProvider } from './infrastructure/prisma.provider';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';
import { TransactionsController } from './transactions/transactions.controller';
import { TransactionsService } from './transactions/transactions.service';

@Module({
  imports: [],
  controllers: [AppController, SessionController, TransactionsController],
  providers: [
    AppService,
    prismaProvider,
    SessionService,
    TransactionsService,
    EventsService,
    SessionGuard,
  ],
})
export class AppModule {}

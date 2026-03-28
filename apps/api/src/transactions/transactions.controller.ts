import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../common/session/session.guard';
import type { RequestWithSession } from '../common/session/request-with-session';
import type {
  AuditLogDto,
  CreateTransactionRequest,
  QueryTransactionsRequest,
  TransactionDto,
  UpdateTransactionRequest,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(SessionGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  list(
    @Req() request: RequestWithSession,
    @Query() query: QueryTransactionsRequest,
  ): Promise<TransactionDto[]> {
    return this.transactionsService.list(request.sessionContext, query);
  }

  @Post()
  create(
    @Req() request: RequestWithSession,
    @Body() body: CreateTransactionRequest,
  ): Promise<TransactionDto> {
    return this.transactionsService.create(request.sessionContext, body);
  }

  @Patch(':id')
  update(
    @Req() request: RequestWithSession,
    @Param('id') transactionId: string,
    @Body() body: UpdateTransactionRequest,
  ): Promise<TransactionDto> {
    return this.transactionsService.update(
      request.sessionContext,
      transactionId,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Req() request: RequestWithSession,
    @Param('id') transactionId: string,
  ): Promise<TransactionDto> {
    return this.transactionsService.remove(
      request.sessionContext,
      transactionId,
    );
  }

  @Get(':id/audit-logs')
  getAuditLogs(
    @Req() request: RequestWithSession,
    @Param('id') transactionId: string,
  ): Promise<AuditLogDto[]> {
    return this.transactionsService.getAuditLogs(
      request.sessionContext,
      transactionId,
    );
  }
}

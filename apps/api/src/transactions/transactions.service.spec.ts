import { decryptMemoIfPresent } from '@uri-ga/db';
import type { PrismaClient } from '@uri-ga/db';
import { EventsService } from '../events/events.service';
import { TransactionsService } from './transactions.service';
import { Role, TransactionType } from '../domain/models';
import { createFakePrisma } from '../../test/fake-prisma';

describe('TransactionsService', () => {
  let prisma: ReturnType<typeof createFakePrisma>;
  let eventsService: EventsService;
  let service: TransactionsService;

  beforeEach(() => {
    process.env.MEMO_ENCRYPTION_KEY = 'test-secret';
    prisma = createFakePrisma();
    eventsService = new EventsService();
    service = new TransactionsService(
      prisma as unknown as PrismaClient,
      eventsService,
    );
  });

  afterEach(() => {
    delete process.env.MEMO_ENCRYPTION_KEY;
  });

  it('writes an audit log when a transaction is soft deleted', async () => {
    const family = await prisma.family.create({
      data: {
        name: '우리집',
        inviteCode: 'INVITE01',
      },
    });
    const user = await prisma.user.create({
      data: {
        familyId: family.id,
        name: 'Jae',
        role: Role.HEAD,
        email: 'jae@local.uri-ga',
      },
    });
    const session = {
      familyId: family.id,
      userId: user.id,
      displayName: user.name,
    };

    const transaction = await service.create(session, {
      type: TransactionType.EXPENSE,
      amount: 50000,
      category: '식비',
      description: '주말 장보기',
    });

    expect(
      (
        await prisma.transaction.findFirst({
          where: { id: transaction.id, familyId: family.id },
        })
      )?.description,
    ).not.toBe('주말 장보기');
    expect(
      decryptMemoIfPresent(
        (
          await prisma.transaction.findFirst({
            where: { id: transaction.id, familyId: family.id },
          })
        )?.description,
      ),
    ).toBe('주말 장보기');

    await service.remove(session, transaction.id);

    const auditLogs = await service.getAuditLogs(session, transaction.id);
    expect(auditLogs).toHaveLength(2);
    expect(auditLogs[1]?.action).toBe('DELETE');
    expect(
      (auditLogs[1]?.newData as { deletedAt?: string } | null)?.deletedAt,
    ).toBeTruthy();
  });
});

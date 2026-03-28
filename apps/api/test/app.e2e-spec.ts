import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PRISMA_CLIENT } from '../src/infrastructure/prisma.provider';
import { createFakePrisma } from './fake-prisma';

describe('Uri-Ga API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createFakePrisma>;

  beforeEach(async () => {
    process.env.MEMO_ENCRYPTION_KEY = 'test-secret';
    prisma = createFakePrisma();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.MEMO_ENCRYPTION_KEY;
  });

  it('creates a session and performs transparent transaction CRUD', async () => {
    const bootstrapResponse = await request(app.getHttpServer())
      .post('/session/bootstrap')
      .send({
        mode: 'create',
        familyName: '행복한 우리집',
        displayName: 'Jae',
      })
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: { familyName: string; session: { displayName: string } };
        }) => {
          expect(body.familyName).toBe('행복한 우리집');
          expect(body.session.displayName).toBe('Jae');
        },
      );

    const bootstrapBody = bootstrapResponse.body as {
      familyName: string;
      session: { displayName: string };
    };
    const headers = bootstrapResponse.headers as {
      'set-cookie': string[];
    };
    const cookie = headers['set-cookie'][0];
    const sessionMe = await request(app.getHttpServer())
      .get('/session/me')
      .set('Cookie', cookie)
      .expect(200);

    expect((sessionMe.body as { familyName: string }).familyName).toBe(
      '행복한 우리집',
    );
    expect(bootstrapBody.familyName).toBe('행복한 우리집');

    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Cookie', cookie)
      .send({
        type: 'EXPENSE',
        amount: 25000,
        category: '식비',
        description: '점심 식사',
      })
      .expect(201);
    const createdBody = created.body as { id: string };

    await request(app.getHttpServer())
      .delete(`/transactions/${createdBody.id}`)
      .set('Cookie', cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get('/transactions')
      .set('Cookie', cookie)
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get(`/transactions/${createdBody.id}/audit-logs`)
      .set('Cookie', cookie)
      .expect(200)
      .expect(({ body }: { body: Array<{ action: string }> }) => {
        expect(body).toHaveLength(2);
        expect(body[0]?.action).toBe('CREATE');
        expect(body[1]?.action).toBe('DELETE');
      });
  });
});

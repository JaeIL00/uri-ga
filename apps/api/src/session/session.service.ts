import {
  Inject,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@uri-ga/db';
import { randomUUID } from 'crypto';
import { Role, SessionContext } from '../domain/models';
import { PRISMA_CLIENT } from '../infrastructure/prisma.provider';
import {
  SessionBootstrapRequest,
  SessionMeDto,
} from './dto/bootstrap-session.dto';

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

@Injectable()
export class SessionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async bootstrap(input: SessionBootstrapRequest): Promise<{
    session: SessionContext;
    familyName: string;
    inviteCode: string;
  }> {
    if (!input.displayName?.trim()) {
      throw new BadRequestException('displayName is required.');
    }

    if (input.mode === 'create') {
      if (!input.familyName?.trim()) {
        throw new BadRequestException(
          'familyName is required for create mode.',
        );
      }

      const family = await this.prisma.family.create({
        data: {
          name: input.familyName.trim(),
          inviteCode: await this.generateUniqueInviteCode(),
        },
      });
      const user = await this.prisma.user.create({
        data: {
          familyId: family.id,
          name: input.displayName.trim(),
          role: Role.HEAD,
          email: this.generateLocalEmail(input.displayName),
        },
      });

      return {
        session: {
          userId: user.id,
          familyId: family.id,
          displayName: user.name,
        },
        familyName: family.name,
        inviteCode: family.inviteCode,
      };
    }

    if (!input.inviteCode?.trim()) {
      throw new BadRequestException('inviteCode is required for join mode.');
    }

    const family = await this.prisma.family.findUnique({
      where: { inviteCode: input.inviteCode.trim() },
    });
    if (!family) {
      throw new NotFoundException('Family not found for invite code.');
    }

    const user = await this.prisma.user.create({
      data: {
        familyId: family.id,
        name: input.displayName.trim(),
        role: Role.MEMBER,
        email: this.generateLocalEmail(input.displayName),
      },
    });

    return {
      session: {
        userId: user.id,
        familyId: family.id,
        displayName: user.name,
      },
      familyName: family.name,
      inviteCode: family.inviteCode,
    };
  }

  async getMe(session: SessionContext): Promise<SessionMeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { family: true },
    });
    if (!user || !user.family || user.familyId !== session.familyId) {
      throw new NotFoundException('Family not found for current session.');
    }

    return {
      userId: session.userId,
      familyId: session.familyId,
      displayName: session.displayName,
      familyName: user.family.name,
      inviteCode: user.family.inviteCode,
    };
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const inviteCode = generateInviteCode();
      const existing = await this.prisma.family.findUnique({
        where: { inviteCode },
      });
      if (!existing) {
        return inviteCode;
      }
    }

    throw new BadRequestException('Unable to generate a unique invite code.');
  }

  private generateLocalEmail(displayName: string): string {
    const slug = displayName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${slug || 'member'}-${randomUUID()}@local.uri-ga`;
  }
}

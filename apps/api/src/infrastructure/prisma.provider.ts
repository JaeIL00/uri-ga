import { prisma } from '@uri-ga/db';
import type { PrismaClient } from '@uri-ga/db';

export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

export type PrismaClientLike = PrismaClient;

export const prismaProvider: {
  provide: typeof PRISMA_CLIENT;
  useValue: PrismaClient;
} = {
  provide: PRISMA_CLIENT,
  useValue: prisma,
};

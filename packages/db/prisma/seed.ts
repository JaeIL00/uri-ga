import {
  AuditAction,
  Prisma,
  PrismaClient,
  Role,
  TransactionType
} from "@prisma/client";
import { FAMILY_BENCHMARKS } from "../src/benchmarks";
import { encryptMemoIfPresent } from "../src/crypto";

const prisma = new PrismaClient();

type SeedTransaction = {
  userEmail: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  transactionAt: Date;
};

const demoTransactions: SeedTransaction[] = [
  {
    userEmail: "minji@uriga.dev",
    type: TransactionType.INCOME,
    amount: 4200000,
    category: "Salary",
    description: "Monthly salary",
    transactionAt: new Date("2026-03-01T09:00:00.000Z")
  },
  {
    userEmail: "jaeho@uriga.dev",
    type: TransactionType.INCOME,
    amount: 3100000,
    category: "Salary",
    description: "Monthly salary",
    transactionAt: new Date("2026-03-02T09:00:00.000Z")
  },
  {
    userEmail: "minji@uriga.dev",
    type: TransactionType.EXPENSE,
    amount: 184000,
    category: "Groceries",
    description: "Weekend mart restock",
    transactionAt: new Date("2026-03-05T10:20:00.000Z")
  },
  {
    userEmail: "jaeho@uriga.dev",
    type: TransactionType.EXPENSE,
    amount: 62000,
    category: "Transport",
    description: "Fuel top-up",
    transactionAt: new Date("2026-03-07T12:10:00.000Z")
  },
  {
    userEmail: "minji@uriga.dev",
    type: TransactionType.EXPENSE,
    amount: 112000,
    category: "Utilities",
    description: "Mobile and broadband bundle",
    transactionAt: new Date("2026-03-10T03:30:00.000Z")
  },
  {
    userEmail: "jaeho@uriga.dev",
    type: TransactionType.EXPENSE,
    amount: 38000,
    category: "School",
    description: "Field trip lunch",
    transactionAt: new Date("2026-03-14T02:00:00.000Z")
  },
  {
    userEmail: "minji@uriga.dev",
    type: TransactionType.EXPENSE,
    amount: 97000,
    category: "Dining",
    description: "Family dinner after piano recital",
    transactionAt: new Date("2026-03-21T09:40:00.000Z")
  }
];

function buildTransactionSnapshot(transaction: {
  id: string;
  familyId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  transactionAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: transaction.id,
    familyId: transaction.familyId,
    userId: transaction.userId,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description,
    transactionAt: transaction.transactionAt.toISOString(),
    deletedAt: transaction.deletedAt?.toISOString() ?? null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString()
  };
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.aiReport.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();
  await prisma.family.deleteMany();

  const family = await prisma.family.create({
    data: {
      name: "Uri-Ga Demo Family",
      inviteCode: "URI-GA-2026",
      monthlyBudget: 2500000
    }
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "minji@uriga.dev",
        name: "Minji",
        role: Role.HEAD,
        familyId: family.id
      }
    }),
    prisma.user.create({
      data: {
        email: "jaeho@uriga.dev",
        name: "Jaeho",
        role: Role.MEMBER,
        familyId: family.id
      }
    })
  ]);

  const userIdByEmail = new Map(users.map((user) => [user.email, user.id]));
  const createdTransactions = [];

  for (const seedTransaction of demoTransactions) {
    const userId = userIdByEmail.get(seedTransaction.userEmail);

    if (!userId) {
      throw new Error(`Missing seeded user for ${seedTransaction.userEmail}`);
    }

    const transaction = await prisma.transaction.create({
      data: {
        familyId: family.id,
        userId,
        type: seedTransaction.type,
        amount: seedTransaction.amount,
        category: seedTransaction.category,
        description: encryptMemoIfPresent(seedTransaction.description) ?? undefined,
        transactionAt: seedTransaction.transactionAt
      }
    });

    createdTransactions.push(transaction);

    await prisma.auditLog.create({
      data: {
        transactionId: transaction.id,
        userId,
        action: AuditAction.CREATE,
        oldData: Prisma.JsonNull,
        newData: buildTransactionSnapshot(transaction)
      }
    });
  }

  const firstExpense = createdTransactions.find((transaction) => transaction.type === TransactionType.EXPENSE);

  if (firstExpense) {
    const updatedTransaction = await prisma.transaction.update({
      where: { id: firstExpense.id },
      data: {
        amount: firstExpense.amount + 12000
      }
    });

    await prisma.auditLog.create({
      data: {
        transactionId: updatedTransaction.id,
        userId: updatedTransaction.userId,
        action: AuditAction.UPDATE,
        oldData: buildTransactionSnapshot(firstExpense),
        newData: buildTransactionSnapshot(updatedTransaction)
      }
    });
  }

  await prisma.aiReport.create({
    data: {
      familyId: family.id,
      reportPeriod: "2026-03",
      summary: "This month the family spending pace is calm and on-plan, with stronger grocery discipline than last month.",
      feedback:
        "Groceries are still the biggest share, but the family is protecting the monthly budget well. If you repeat the current rhythm, the spring trip fund stays on track.",
      analysisJson: {
        householdSize: users.length,
        benchmarkProfile: FAMILY_BENCHMARKS.filter((entry) => entry.householdSize === 2),
        topCategories: [
          { category: "Groceries", amount: 196000 },
          { category: "Utilities", amount: 112000 },
          { category: "Dining", amount: 97000 }
        ],
        previousMonthDelta: -58000,
        cheerBadge: "5 no-spend days together"
      }
    }
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

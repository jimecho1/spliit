import { restoreExpense } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const restoreGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId, participantId } }) => {
    await restoreExpense(groupId, expenseId, participantId)
    return {}
  })

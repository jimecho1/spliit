/**
 * Turns database records into plain, JSON-safe snapshots for the activity log.
 *
 * Snapshots are deliberately denormalized: they carry participant and category
 * *names*, not only ids, so an old log entry still reads correctly after a
 * participant is renamed or removed.
 */

import type {
  ExpensePaidForSnapshot,
  ExpenseSnapshot,
  GroupSnapshot,
} from './types'

type DecimalLike = { toString(): string }

type ExpenseRecord = {
  title: string
  amount: number
  originalAmount?: number | null
  originalCurrency?: string | null
  conversionRate?: DecimalLike | null
  expenseDate: Date
  categoryId: number
  category?: { id: number; name: string } | null
  paidById: string
  paidBy?: { id: string; name: string } | null
  paidFor: { participantId: string; shares: number }[]
  splitMode: string
  isReimbursement: boolean
  recurrenceRule?: string | null
  notes?: string | null
  documents?: unknown[]
}

type ParticipantRecord = { id: string; name: string }

/** `YYYY-MM-DD` in UTC. Expense dates are stored as dates, not instants. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function nameOf(
  participants: ParticipantRecord[],
  participantId: string,
): string {
  return participants.find((p) => p.id === participantId)?.name ?? participantId
}

export function expenseSnapshotFromRecord(
  expense: ExpenseRecord,
  participants: ParticipantRecord[],
): ExpenseSnapshot {
  const paidFor: ExpensePaidForSnapshot[] = expense.paidFor
    .map((paidFor) => ({
      participantId: paidFor.participantId,
      name: nameOf(participants, paidFor.participantId),
      shares: paidFor.shares,
    }))
    // Stable order, so a reorder alone never shows up as a change.
    .sort((a, b) => a.participantId.localeCompare(b.participantId))

  return {
    title: expense.title,
    amount: expense.amount,
    originalAmount: expense.originalAmount ?? null,
    originalCurrency: expense.originalCurrency ?? null,
    conversionRate:
      expense.conversionRate === null || expense.conversionRate === undefined
        ? null
        : expense.conversionRate.toString(),
    expenseDate: toDateOnly(expense.expenseDate),
    categoryId: expense.categoryId,
    categoryName: expense.category?.name ?? null,
    paidById: expense.paidById,
    paidByName: expense.paidBy?.name ?? nameOf(participants, expense.paidById),
    paidFor,
    splitMode: expense.splitMode,
    isReimbursement: expense.isReimbursement,
    recurrenceRule: expense.recurrenceRule ?? 'NONE',
    notes: expense.notes ?? null,
    documentCount: expense.documents?.length ?? 0,
  }
}

type GroupRecord = {
  name: string
  currency: string
  currencyCode?: string | null
  information?: string | null
  participants: ParticipantRecord[]
}

export function groupSnapshotFromRecord(group: GroupRecord): GroupSnapshot {
  return {
    name: group.name,
    currency: group.currency,
    currencyCode: group.currencyCode ?? null,
    information: group.information ?? null,
    participants: group.participants
      .map((participant) => ({
        participantId: participant.id,
        name: participant.name,
      }))
      .sort((a, b) => a.participantId.localeCompare(b.participantId)),
  }
}

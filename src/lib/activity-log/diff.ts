/**
 * Computes the before -> after field list stored on an activity entry.
 *
 * Only fields that actually changed are kept, so an entry that says "updated"
 * can always show what was updated.
 */

import type {
  ExpenseSnapshot,
  FieldChange,
  GroupSnapshot,
  LoggedValue,
} from './types'

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function compareFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: (keyof T & string)[],
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const field of fields) {
    if (!sameValue(before[field], after[field])) {
      changes.push({
        field,
        before: (before[field] ?? null) as LoggedValue,
        after: (after[field] ?? null) as LoggedValue,
      })
    }
  }
  return changes
}

const EXPENSE_FIELDS: (keyof ExpenseSnapshot & string)[] = [
  'title',
  'amount',
  'originalAmount',
  'originalCurrency',
  'conversionRate',
  'expenseDate',
  'categoryName',
  'paidByName',
  'splitMode',
  'isReimbursement',
  'recurrenceRule',
  'notes',
  'documentCount',
]

export function diffExpenseSnapshots(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
): FieldChange[] {
  const changes = compareFields(
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
    EXPENSE_FIELDS,
  )

  // paidFor is compared as a whole: who is on the expense and with what share.
  if (!sameValue(before.paidFor, after.paidFor)) {
    changes.push({
      field: 'paidFor',
      before: before.paidFor.map(({ name, shares }) => ({
        name,
        shares,
      })) as LoggedValue,
      after: after.paidFor.map(({ name, shares }) => ({
        name,
        shares,
      })) as LoggedValue,
    })
  }

  return changes
}

const GROUP_FIELDS: (keyof GroupSnapshot & string)[] = [
  'name',
  'currency',
  'currencyCode',
  'information',
]

export function diffGroupSnapshots(
  before: GroupSnapshot,
  after: GroupSnapshot,
): FieldChange[] {
  const changes = compareFields(
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
    GROUP_FIELDS,
  )

  const beforeById = new Map(
    before.participants.map((p) => [p.participantId, p.name]),
  )
  const afterById = new Map(
    after.participants.map((p) => [p.participantId, p.name]),
  )

  const added = after.participants
    .filter((p) => !beforeById.has(p.participantId))
    .map((p) => p.name)
  const removed = before.participants
    .filter((p) => !afterById.has(p.participantId))
    .map((p) => p.name)
  const renamed = before.participants
    .filter(
      (p) =>
        afterById.has(p.participantId) &&
        afterById.get(p.participantId) !== p.name,
    )
    .map((p) => ({
      before: p.name,
      after: afterById.get(p.participantId) as string,
    }))

  if (added.length > 0) {
    changes.push({ field: 'participantsAdded', before: null, after: added })
  }
  if (removed.length > 0) {
    changes.push({ field: 'participantsRemoved', before: removed, after: null })
  }
  for (const rename of renamed) {
    changes.push({
      field: 'participantRenamed',
      before: rename.before,
      after: rename.after,
    })
  }

  return changes
}

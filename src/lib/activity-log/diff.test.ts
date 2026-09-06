import { diffExpenseSnapshots, diffGroupSnapshots } from './diff'
import type { ExpenseSnapshot, GroupSnapshot } from './types'

const baseExpense: ExpenseSnapshot = {
  title: 'Dinner',
  amount: 3000,
  originalAmount: null,
  originalCurrency: null,
  conversionRate: null,
  expenseDate: '2026-09-01',
  categoryId: 0,
  categoryName: 'General',
  paidById: 'p1',
  paidByName: 'Ming',
  paidFor: [
    { participantId: 'p1', name: 'Ming', shares: 1 },
    { participantId: 'p2', name: 'Jan', shares: 1 },
  ],
  splitMode: 'EVENLY',
  isReimbursement: false,
  recurrenceRule: 'NONE',
  notes: null,
  documentCount: 0,
}

const baseGroup: GroupSnapshot = {
  name: 'Trip',
  currency: '$',
  currencyCode: 'USD',
  information: null,
  participants: [
    { participantId: 'p1', name: 'Ming' },
    { participantId: 'p2', name: 'Jan' },
  ],
}

describe('diffExpenseSnapshots', () => {
  it('reports nothing when nothing changed', () => {
    expect(diffExpenseSnapshots(baseExpense, { ...baseExpense })).toEqual([])
  })

  it('reports a changed amount with both values', () => {
    const changes = diffExpenseSnapshots(baseExpense, {
      ...baseExpense,
      amount: 4500,
    })
    expect(changes).toEqual([{ field: 'amount', before: 3000, after: 4500 }])
  })

  it('reports several fields at once', () => {
    const changes = diffExpenseSnapshots(baseExpense, {
      ...baseExpense,
      title: 'Lunch',
      notes: 'split later',
    })
    expect(changes.map((c) => c.field).sort()).toEqual(['notes', 'title'])
  })

  it('treats a null and an absent value as the same', () => {
    const changes = diffExpenseSnapshots(baseExpense, {
      ...baseExpense,
      notes: null,
    })
    expect(changes).toEqual([])
  })

  it('reports paidFor as one change carrying names and shares', () => {
    const changes = diffExpenseSnapshots(baseExpense, {
      ...baseExpense,
      paidFor: [{ participantId: 'p1', name: 'Ming', shares: 1 }],
    })
    expect(changes).toEqual([
      {
        field: 'paidFor',
        before: [
          { name: 'Ming', shares: 1 },
          { name: 'Jan', shares: 1 },
        ],
        after: [{ name: 'Ming', shares: 1 }],
      },
    ])
  })

  it('ignores participant ids so a rename shows up once, on the name', () => {
    const changes = diffExpenseSnapshots(baseExpense, {
      ...baseExpense,
      paidById: 'p1',
      paidByName: 'Ming Chan',
    })
    expect(changes).toEqual([
      { field: 'paidByName', before: 'Ming', after: 'Ming Chan' },
    ])
  })
})

describe('diffGroupSnapshots', () => {
  it('reports a renamed group', () => {
    const changes = diffGroupSnapshots(baseGroup, {
      ...baseGroup,
      name: 'Japan trip',
    })
    expect(changes).toEqual([
      { field: 'name', before: 'Trip', after: 'Japan trip' },
    ])
  })

  it('reports added participants', () => {
    const changes = diffGroupSnapshots(baseGroup, {
      ...baseGroup,
      participants: [
        ...baseGroup.participants,
        { participantId: 'p3', name: 'Wing' },
      ],
    })
    expect(changes).toEqual([
      { field: 'participantsAdded', before: null, after: ['Wing'] },
    ])
  })

  it('reports removed participants', () => {
    const changes = diffGroupSnapshots(baseGroup, {
      ...baseGroup,
      participants: [{ participantId: 'p1', name: 'Ming' }],
    })
    expect(changes).toEqual([
      { field: 'participantsRemoved', before: ['Jan'], after: null },
    ])
  })

  it('reports a renamed participant separately from add and remove', () => {
    const changes = diffGroupSnapshots(baseGroup, {
      ...baseGroup,
      participants: [
        { participantId: 'p1', name: 'Ming' },
        { participantId: 'p2', name: 'Janice' },
      ],
    })
    expect(changes).toEqual([
      { field: 'participantRenamed', before: 'Jan', after: 'Janice' },
    ])
  })
})

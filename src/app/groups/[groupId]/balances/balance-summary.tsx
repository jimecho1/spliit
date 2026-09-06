'use client'

import { Money } from '@/components/money'
import { Currency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type Props = {
  amount: number
  currency: Currency
}

export function BalanceSummary({ amount, currency }: Props) {
  const t = useTranslations('Balances.Summary')

  if (amount === 0) {
    return (
      <div className="rounded-3xl px-6 py-8 mb-4 text-center bg-orange-50 dark:bg-orange-950/40">
        <p className="text-lg font-medium">{t('settled')}</p>
      </div>
    )
  }

  const isOwed = amount > 0

  return (
    <div className="rounded-3xl px-6 py-8 mb-4 text-center bg-orange-50 dark:bg-orange-950/40">
      <p className="text-lg">
        {isOwed ? t('youAreOwed') : t('youOwe')}{' '}
        <span
          className={cn(
            'text-3xl font-bold align-middle',
            isOwed
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400',
          )}
        >
          <Money currency={currency} amount={Math.abs(amount)} />
        </span>
      </p>
    </div>
  )
}

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
      <div className="w-fit rounded-3xl px-8 py-10 mb-4 bg-orange-50 dark:bg-orange-950/40">
        <p className="text-lg font-medium">{t('settled')}</p>
      </div>
    )
  }

  const isOwed = amount > 0

  return (
    <div className="w-fit rounded-3xl px-8 py-10 mb-4 bg-orange-50 dark:bg-orange-950/40">
      <p className="text-sm text-muted-foreground mb-2">
        {isOwed ? t('youAreOwed') : t('youOwe')}
      </p>
      <p
        className={cn(
          'text-4xl font-bold',
          isOwed
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400',
        )}
      >
        <Money currency={currency} amount={Math.abs(amount)} />
      </p>
    </div>
  )
}

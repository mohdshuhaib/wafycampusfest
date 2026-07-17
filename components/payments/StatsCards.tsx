import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react"

interface StatsCardsProps {
  stats: {
    credit: number
    debit: number
    balance: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FinanceMetric
        label="Total Credited"
        value={stats.credit}
        helper="Income and receivables"
        icon={ArrowUpCircle}
        tone="success"
      />
      <FinanceMetric
        label="Total Debited"
        value={stats.debit}
        helper="Expenses and payments"
        icon={ArrowDownCircle}
        tone="danger"
      />
      <FinanceMetric
        label="Net Balance"
        value={stats.balance}
        helper="Available funds"
        icon={Wallet}
        tone={stats.balance >= 0 ? "navy" : "danger"}
      />
    </div>
  )
}

function FinanceMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  helper: string
  icon: typeof Wallet
  tone: "success" | "danger" | "navy"
}) {
  const toneClasses = {
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    navy: "bg-navy text-gold",
  }

  return (
    <div className="surface-elevated rounded-[2rem] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-slatebrand">{label}</p>
          <div className="mt-2 text-3xl font-black text-navy">Rs. {value.toLocaleString()}</div>
          <p className="mt-1 text-xs font-semibold text-slatebrand">{helper}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}

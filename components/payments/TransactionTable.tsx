import { format } from "date-fns"
import { Edit2, Filter, Loader2, Minus, MoreVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface Transaction {
  id: string
  name: string
  amount: number
  type: "CREDIT" | "DEBIT"
  method: "LIQUID" | "UPI" | "BANK_TRANSFER"
  details: string
  transaction_date: string
  created_at: string
}

interface TransactionTableProps {
  data: Transaction[]
  loading: boolean
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

export function TransactionTable({ data, loading, onEdit, onDelete }: TransactionTableProps) {
  return (
    <div className="surface-elevated overflow-hidden rounded-[2rem]">
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-gold" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slatebrand">
            <Filter className="mb-2 size-12 opacity-30" />
            <p className="text-sm font-bold text-navy">No transactions found</p>
          </div>
        ) : (
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-navy/10 bg-mist text-slatebrand">
              <tr>
                <th className="px-6 py-4 font-black">Name</th>
                <th className="px-6 py-4 font-black">Date & Time</th>
                <th className="px-6 py-4 font-black">Amount</th>
                <th className="px-6 py-4 font-black">Method</th>
                <th className="px-6 py-4 font-black">Details</th>
                <th className="px-6 py-4 font-black">Status</th>
                <th className="px-6 py-4 text-right font-black">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/8">
              {data.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-gold/6">
                  <td className="px-6 py-4 font-bold text-navy">{tx.name}</td>
                  <td className="px-6 py-4 text-slatebrand">
                    <div className="font-bold text-navy">{format(new Date(tx.transaction_date), "d MMMM yyyy")}</div>
                    <div className="text-xs font-semibold">At {format(new Date(tx.transaction_date), "h:mm a")}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1 font-black ${tx.type === "CREDIT" ? "text-success" : "text-destructive"}`}>
                      {tx.type === "CREDIT" ? <Plus className="size-3" /> : <Minus className="size-3" />}
                      Rs. {tx.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline">{tx.method.replace("_", " ")}</Badge>
                  </td>
                  <td className="max-w-[240px] truncate px-6 py-4 font-medium text-slatebrand" title={tx.details}>
                    {tx.details || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={tx.type === "CREDIT" ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}>
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 rounded-2xl">
                          <MoreVertical className="size-4 text-slatebrand" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
                        <DropdownMenuItem onClick={() => onEdit(tx)} className="rounded-xl">
                          <Edit2 className="mr-2 size-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(tx)} className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive">
                          <Trash2 className="mr-2 size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

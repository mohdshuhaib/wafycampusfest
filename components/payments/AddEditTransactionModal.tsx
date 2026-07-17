import { useEffect, useState } from "react"
import { IndianRupee, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TransactionFormData {
  name: string
  amount: string
  type: string
  method: string
  details: string
  transaction_date: string
}

interface AddEditTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  isEdit: boolean
  initialData?: TransactionFormData
  onSubmit: (data: TransactionFormData) => Promise<void>
  isSubmitting: boolean
}

export function AddEditTransactionModal({
  isOpen,
  onClose,
  isEdit,
  initialData,
  onSubmit,
  isSubmitting,
}: AddEditTransactionModalProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    name: "",
    amount: "",
    type: "CREDIT",
    method: "LIQUID",
    details: "",
    transaction_date: "",
  })

  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialData) {
        setFormData(initialData)
      } else {
        const now = new Date()
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
        const localDateTime = now.toISOString().slice(0, 16)

        setFormData({
          name: "",
          amount: "",
          type: "CREDIT",
          method: "LIQUID",
          details: "",
          transaction_date: localDateTime,
        })
      }
    }
  }, [isOpen, isEdit, initialData])

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2rem] border-navy/10 bg-ivory sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-title text-xl text-navy">{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription className="font-medium text-slatebrand">
            {isEdit ? "Modify existing transaction details." : "Enter the details for the new finance record."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Type">
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className={formData.type === "CREDIT" ? "font-bold text-success" : "font-bold text-destructive"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                  <SelectItem value="CREDIT" className="text-success">CREDIT</SelectItem>
                  <SelectItem value="DEBIT" className="text-destructive">DEBIT</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Method">
              <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                  <SelectItem value="LIQUID">Liquid Cash</SelectItem>
                  <SelectItem value="UPI">UPI Payment</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Name / Party">
            <Input placeholder="e.g. Sponsor, vendor, committee..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </FormField>

          <FormField label="Amount">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slatebrand">
                <IndianRupee className="size-4" />
              </div>
              <Input type="number" placeholder="0.00" className="pl-9" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </FormField>

          <FormField label="Date & Time">
            <Input type="datetime-local" value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} />
          </FormField>

          <FormField label="Details / Note">
            <Textarea placeholder="Description of the transaction..." className="h-24 resize-none rounded-2xl" value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">{label}</label>
      {children}
    </div>
  )
}

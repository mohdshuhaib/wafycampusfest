"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { AlertTriangle, Calendar as CalendarIcon, Plus, Printer, Search, Sparkles, Trash, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { StatsCards } from "@/components/payments/StatsCards"
import { Transaction, TransactionTable } from "@/components/payments/TransactionTable"
import { AddEditTransactionModal } from "@/components/payments/AddEditTransactionModal"

type FilterType = "ALL" | "CREDIT" | "DEBIT"

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [filterType, setFilterType] = useState<FilterType>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      let query = (supabase.from("finance_transactions") as any)
        .select("*")
        .order("transaction_date", { ascending: false })

      if (dateFrom) query = query.gte("transaction_date", new Date(dateFrom).toISOString())
      if (dateTo) query = query.lte("transaction_date", new Date(dateTo).toISOString())

      const { data, error } = await query
      if (error) throw error
      setTransactions(data as Transaction[])
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [dateFrom, dateTo])

  const processedData = useMemo(() => {
    let filtered = transactions

    if (filterType !== "ALL") filtered = filtered.filter((t) => t.type === filterType)

    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(lower) ||
        t.details?.toLowerCase().includes(lower)
      )
    }

    const stats = transactions.reduce((acc, curr) => {
      if (curr.type === "CREDIT") acc.credit += Number(curr.amount)
      else acc.debit += Number(curr.amount)
      return acc
    }, { credit: 0, debit: 0 })

    return {
      data: filtered,
      stats: { ...stats, balance: stats.credit - stats.debit },
    }
  }, [transactions, filterType, searchQuery])

  const handleDeleteConfirm = async () => {
    if (!selectedTx) return
    try {
      const { error } = await (supabase.from("finance_transactions") as any)
        .delete()
        .eq("id", selectedTx.id)

      if (error) throw error

      setTransactions((prev) => prev.filter((t) => t.id !== selectedTx.id))
      toast.success("Transaction deleted")
      setIsDeleteAlertOpen(false)
    } catch (e) {
      toast.error("Failed to delete")
    }
  }

  const handleDeleteAllConfirm = async () => {
    try {
      setIsSubmitting(true)
      const { error } = await (supabase.from("finance_transactions") as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (error) throw error

      setTransactions([])
      toast.success("All transactions cleared successfully")
      setIsDeleteAllOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("Failed to clear transactions")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = async (formData: any) => {
    if (!formData.name || !formData.amount || !formData.transaction_date) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        type: formData.type,
        method: formData.method,
        details: formData.details,
        transaction_date: new Date(formData.transaction_date).toISOString(),
      }

      if (isEditMode && selectedTx) {
        const { error } = await (supabase.from("finance_transactions") as any)
          .update(payload)
          .eq("id", selectedTx.id)
        if (error) throw error
        toast.success("Transaction updated")
      } else {
        const { error } = await (supabase.from("finance_transactions") as any)
          .insert([payload])
        if (error) throw error
        toast.success("Transaction added")
      }

      await fetchTransactions()
      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(isEditMode ? "Update failed" : "Creation failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const generatePDF = (mode: "ALL" | "CREDIT" | "DEBIT") => {
    const doc = new jsPDF()
    const pdfData = processedData.data.filter((t) => mode === "ALL" ? true : t.type === mode)

    if (pdfData.length === 0) {
      toast.warning("No data to print")
      return
    }

    doc.setFontSize(20)
    doc.setTextColor(10, 29, 44)
    doc.text("Financial Transaction Report", 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(90)
    doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 28)
    doc.text(`Category: ${mode}`, 14, 33)

    let totalC = 0
    let totalD = 0
    pdfData.forEach((t) => t.type === "CREDIT" ? totalC += Number(t.amount) : totalD += Number(t.amount))

    doc.setFontSize(10)
    doc.setTextColor(0)
    const startY = 40
    if (mode === "ALL" || mode === "CREDIT") doc.text(`Total Credited: Rs. ${totalC}`, 14, startY)
    if (mode === "ALL" || mode === "DEBIT") doc.text(`Total Debited: Rs. ${totalD}`, 80, startY)
    if (mode === "ALL") doc.text(`Net Balance: Rs. ${totalC - totalD}`, 150, startY)

    autoTable(doc, {
      startY: startY + 10,
      head: [["Date", "Name", "Details", "Method", "Type", "Amount"]],
      body: pdfData.map((t) => [
        format(new Date(t.transaction_date), "dd MMM yyyy, hh:mm a"),
        t.name,
        t.details || "-",
        t.method,
        t.type,
        t.amount,
      ]),
      theme: "grid",
      headStyles: { fillColor: [10, 29, 44] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 5: { halign: "right", fontStyle: "bold" } },
      didParseCell: function(data) {
        if (data.section === "body" && data.column.index === 4) {
          if (data.cell.raw === "CREDIT") data.cell.styles.textColor = [22, 163, 74]
          if (data.cell.raw === "DEBIT") data.cell.styles.textColor = [220, 38, 38]
        }
      },
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" })
      doc.text("Admin Financial System. Confidential.", 14, 285)
    }

    doc.save(`finance_report_${mode.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const getInitialFormData = () => {
    if (!selectedTx) return undefined
    const d = new Date(selectedTx.transaction_date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return {
      name: selectedTx.name,
      amount: String(selectedTx.amount),
      type: selectedTx.type,
      method: selectedTx.method,
      details: selectedTx.details || "",
      transaction_date: d.toISOString().slice(0, 16),
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Finance Ledger
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Control every transaction.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Monitor income, expenses, balance, date-filtered history, and export-ready financial records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button onClick={() => { setIsEditMode(false); setSelectedTx(null); setIsModalOpen(true) }} className="bg-gold text-navy hover:bg-gold/90">
              <Plus className="size-4" /> Add Transaction
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteAllOpen(true)} className="border-destructive/25 bg-destructive/10 text-ivory hover:bg-destructive/15">
              <Trash className="size-4" /> Clear All
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-ivory/15 bg-ivory/8 text-ivory hover:bg-ivory/14">
                  <Printer className="size-4" /> Print
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
                <DropdownMenuItem onClick={() => generatePDF("ALL")}>Print All History</DropdownMenuItem>
                <DropdownMenuItem onClick={() => generatePDF("CREDIT")}>Print Credited Only</DropdownMenuItem>
                <DropdownMenuItem onClick={() => generatePDF("DEBIT")}>Print Debited Only</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      <StatsCards stats={processedData.stats} />

      <section className="surface-panel rounded-[2rem] p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <Input placeholder="Search transactions..." className="h-11 rounded-2xl pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-navy/10 bg-ivory px-3 py-2 shadow-sm">
              <CalendarIcon className="size-4 text-slatebrand" />
              <input type="date" className="w-32 bg-transparent text-sm font-semibold text-navy outline-none" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-slatebrand">-</span>
              <input type="date" className="w-32 bg-transparent text-sm font-semibold text-navy outline-none" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <Tabs defaultValue="ALL" onValueChange={(value) => setFilterType(value as FilterType)}>
            <TabsList className="h-auto rounded-2xl bg-navy/6 p-1">
              <TabsTrigger value="ALL" className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-navy data-[state=active]:text-ivory">All</TabsTrigger>
              <TabsTrigger value="CREDIT" className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-success data-[state=active]:text-ivory">Credited</TabsTrigger>
              <TabsTrigger value="DEBIT" className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-destructive data-[state=active]:text-ivory">Debited</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      <TransactionTable
        data={processedData.data}
        loading={loading}
        onEdit={(tx) => { setSelectedTx(tx); setIsEditMode(true); setIsModalOpen(true) }}
        onDelete={(tx) => { setSelectedTx(tx); setIsDeleteAlertOpen(true) }}
      />

      <AddEditTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEdit={isEditMode}
        initialData={isEditMode ? getInitialFormData() : undefined}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent className="rounded-[2rem] border-navy/10 bg-ivory sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="size-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="py-2 font-medium text-slatebrand">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-navy/10 bg-mist p-3 text-sm">
            <p><strong>Name:</strong> {selectedTx?.name}</p>
            <p><strong>Amount:</strong> Rs. {selectedTx?.amount}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <DialogContent className="rounded-[2rem] border-destructive/20 bg-ivory sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Delete All Transactions
            </DialogTitle>
            <DialogDescription className="py-3 font-bold text-destructive">
              You are about to delete all financial records from the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-2xl border border-destructive/15 bg-destructive/10 p-4 text-sm font-medium text-destructive">
            <p>This action is permanent and cannot be undone.</p>
            <p>All credit and debit history will be lost.</p>
            <p>Generated PDF reports will no longer reflect cleared data.</p>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAllConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Yes, Delete Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

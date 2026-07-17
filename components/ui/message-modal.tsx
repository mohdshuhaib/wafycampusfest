"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

interface MessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  type?: 'error' | 'success' | 'info'
}

export function MessageModal({ open, onOpenChange, title, description, type = 'info' }: MessageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-navy/10 bg-ivory sm:max-w-[400px]">
        <DialogHeader className="flex flex-col items-center justify-center space-y-3 text-center">
          <div className={`rounded-2xl p-3 ${
            type === 'error' ? 'bg-destructive/10 text-destructive' :
            type === 'success' ? 'bg-success/10 text-success' :
            'bg-gold/14 text-navy'
          }`}>
            {type === 'error' ? <AlertCircle className="size-6" /> :
             type === 'success' ? <CheckCircle2 className="size-6" /> :
             <Info className="size-6" />}
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl font-black text-navy">{title}</DialogTitle>
            <DialogDescription className="font-medium text-slatebrand">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-28">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

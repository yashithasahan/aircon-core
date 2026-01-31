"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Loader2, Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { getTransactions, updateTransactionAmount } from "./actions"

interface TransactionHistoryModalProps {
    id: string
    name: string
    type: 'issued_partner' | 'agent'
    children?: React.ReactNode
}

export function TransactionHistoryModal({ id, name, type, children }: TransactionHistoryModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [transactions, setTransactions] = useState<any[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editAmount, setEditAmount] = useState<string>("")
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        if (open) {
            fetchTransactions()
        }
    }, [open])

    async function fetchTransactions() {
        setLoading(true)
        try {
            const data = await getTransactions(id, type)
            setTransactions(data || [])
        } catch (error) {
            toast.error("Failed to load transactions")
        } finally {
            setLoading(false)
        }
    }

    function startEditing(tx: any) {
        setEditingId(tx.id)
        setEditAmount(String(tx.amount))
    }

    function cancelEditing() {
        setEditingId(null)
        setEditAmount("")
    }

    async function saveEdit(txId: string) {
        setUpdating(true)
        try {
            await updateTransactionAmount(txId, Number(editAmount))
            toast.success("Transaction updated")
            setEditingId(null)
            fetchTransactions() // Refresh list and potentially balance (if parent reinforces)
            // Note: Parent balance won't auto-update unless we trigger a refresh there or use context.
            // But revalidatePath in action should handle server component refresh? 
            // Client component state won't update unless parent re-fetches.
            // BalanceCardsView takes items as props. If page revalidates, it should be fine.
        } catch (error: any) {
            toast.error(error.message || "Failed to update")
        } finally {
            setUpdating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button variant="ghost" size="sm">History</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{name} - Transaction History</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="text-center text-muted-foreground p-8">No transactions found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.transaction_type === 'TOPUP'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {tx.transaction_type === 'TOPUP'
                                                    ? (type === 'agent' ? 'PAYMENT' : 'TOP UP')
                                                    : 'BOOKING'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={tx.description}>
                                            {tx.description}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {editingId === tx.id ? (
                                                <Input
                                                    type="number"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                    className="h-8 w-24 text-right ml-auto"
                                                />
                                            ) : (
                                                <span>{Number(tx.amount).toFixed(2)}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tx.transaction_type === 'TOPUP' && (
                                                <div className="flex items-center justify-end gap-1">
                                                    {editingId === tx.id ? (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => saveEdit(tx.id)} disabled={updating}>
                                                                {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={cancelEditing} disabled={updating}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEditing(tx)}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

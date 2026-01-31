"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"

interface EntityDialogProps {
    mode: "create" | "edit"
    entityName: string
    initialName?: string
    entityId?: string
    onSave: (name: string, id?: string) => Promise<any>
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EntityDialog({
    mode,
    entityName,
    initialName = "",
    entityId,
    onSave,
    open,
    onOpenChange
}: EntityDialogProps) {
    const [name, setName] = useState(initialName)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setName(initialName)
        }
    }, [open, initialName])

    async function handleSave() {
        if (!name.trim()) return

        setLoading(true)
        try {
            await onSave(name, entityId)
            toast.success(`${entityName} ${mode === 'create' ? 'created' : 'updated'} successfully`)
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || `Failed to ${mode} ${entityName}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Add New" : "Edit"} {entityName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={`Enter ${entityName.toLowerCase()} name`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave()
                            }}
                        />
                    </div>
                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

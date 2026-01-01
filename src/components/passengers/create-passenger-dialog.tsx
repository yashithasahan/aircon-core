"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { createPassenger } from "@/app/dashboard/passengers/actions"

export function CreatePassengerDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name) return

        setLoading(true)
        const formData = new FormData()
        formData.append("name", name)

        try {
            await createPassenger(formData)
            setOpen(false)
            setName("")
            // Page revalidates automatically via server action
        } catch (error) {
            console.error(error)
            alert("Failed to create passenger")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="premium" className="shadow-lg shadow-blue-500/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Passenger
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Passenger</DialogTitle>
                    <DialogDescription>
                        Create a new passenger profile here.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value.toUpperCase())}
                            placeholder="SURNAME/NAME"
                            className="col-span-3"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Creating..." : "Create Passenger"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

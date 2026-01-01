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
    const [title, setTitle] = useState("")
    const [surname, setSurname] = useState("")
    const [firstName, setFirstName] = useState("")
    const [contact, setContact] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!surname || !firstName) return

        setLoading(true)
        const formData = new FormData()
        formData.append("title", title)
        formData.append("surname", surname)
        formData.append("first_name", firstName)
        formData.append("contact_info", contact)

        try {
            await createPassenger(formData)
            setOpen(false)
            setTitle("")
            setSurname("")
            setFirstName("")
            setContact("")
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
                    <div className="grid gap-2">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-2 col-span-1">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="MR"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="space-y-2 col-span-3">
                                <Label htmlFor="surname">Surname</Label>
                                <Input
                                    id="surname"
                                    placeholder="DOE"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value.toUpperCase())}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                placeholder="JOHN"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact">Email / Contact</Label>
                            <Input
                                id="contact"
                                placeholder="email@example.com"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                            />
                        </div>
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

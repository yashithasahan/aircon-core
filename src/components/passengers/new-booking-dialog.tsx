"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { BookingForm } from "@/components/passengers/booking-form"
import { Passenger, Agent, BookingType } from "@/types"

interface NewBookingDialogProps {
    passengers: Passenger[]
    agents: Agent[]
    bookingTypes: BookingType[]
}

export function NewBookingDialog({ passengers, agents, bookingTypes }: NewBookingDialogProps) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="premium" className="shadow-lg shadow-blue-500/20">
                    <Plus className="mr-2 h-4 w-4" />
                    New Booking
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Booking</DialogTitle>
                    <DialogDescription>
                        Enter the passenger and flight details below.
                    </DialogDescription>
                </DialogHeader>
                <BookingForm
                    passengers={passengers}
                    agents={agents}
                    bookingTypes={bookingTypes}
                    onSuccess={() => setOpen(false)}
                    onCancel={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}

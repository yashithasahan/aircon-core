
import {
    getBookingById,
    getBookingHistory,
    getAgents,
    getIssuedPartners,
    getPlatforms,
    getLinkedBookings
} from '../actions'
import { BookingDetailsView } from '@/components/dashboard/booking-details-view'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function BookingDetailsPage({ params }: PageProps) {
    const { id } = await params

    // Parallel data fetching
    const [booking, history, agents, issuedPartners, platforms, linkedBookings] = await Promise.all([
        getBookingById(id),
        getBookingHistory(id),
        getAgents(),
        getIssuedPartners(),
        getPlatforms(),
        getLinkedBookings(id)
    ]);

    if (!booking) {
        notFound()
    }

    // Ensure passengers is an array (handle legacy data if necessary)
    if (!booking.passengers) {
        booking.passengers = []
    }

    return (
        <BookingDetailsView
            booking={booking}
            history={history}
            agents={agents}
            issuedPartners={issuedPartners}
            platforms={platforms}
            linkedBookings={linkedBookings}
        />
    )
}

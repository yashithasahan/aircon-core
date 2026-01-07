export interface Agent {
    id: string;
    created_at: string;
    name: string;
}

export interface BookingType {
    id: string;
    created_at: string;
    name: string;
}

export interface Booking {
    id: string;
    created_at: string;
    pax_name: string; // Keeping for display, but derived or fallback
    pnr: string;
    ticket_number?: string;
    airline?: string;
    entry_date: string;
    departure_date: string;
    return_date?: string;
    fare: number;
    selling_price: number;
    profit: number;
    payment_status: string;
    passenger_id?: string; // FK

    // New fields
    ticket_status?: 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED';
    ticket_issued_date?: string;
    advance_payment?: number;
    platform?: string;

    // Refund fields
    refund_date?: string;
    actual_refund_amount?: number;
    customer_refund_amount?: number;

    // Existing fields
    origin?: string;
    destination?: string;
    agent_id?: string;
    booking_type_id?: string;

    // Joined fields (optional, depending on query)
    agent?: Agent;
    booking_type?: BookingType;
}

export interface Passenger {
    id: string;
    created_at: string;

    // Split name
    title?: string;
    first_name?: string;
    surname?: string;
    name: string; // Computed or legacy, kept for compatibility

    passport_number?: string;
    contact_info?: string;
    phone_number?: string;
    passenger_type?: 'ADULT' | 'CHILD' | 'INFANT';
}

export type BookingFormData = Omit<Booking, "id" | "created_at" | "profit" | "agent" | "booking_type">;

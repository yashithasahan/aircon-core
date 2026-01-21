export interface Agent {
    id: string;
    created_at: string;
    name: string;
}

export interface BookingType {
    id: string;
    created_at: string;
    name: string;
    balance: number;
    daily_ticket_count: number;
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
    ticket_status?: 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED' | 'CANCELED';
    ticket_issued_date?: string;
    advance_payment?: number;
    platform?: string;
    payment_method?: string; // e.g. 'Easy Pay', 'Credit Card'
    currency?: 'EUR' | 'LKR';

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

export interface BookingHistory {
    id: string;
    booking_id: string;
    action: string;
    previous_status?: string;
    new_status?: string;
    details?: string;
    created_at: string;
}
export interface CreditTransaction {
    id: string;
    booking_type_id: string;
    amount: number;
    transaction_type: 'TOPUP' | 'BOOKING_DEDUCTION' | 'REFUND' | 'ADJUSTMENT';
    reference_id?: string;
    description?: string;
    created_at: string;
}

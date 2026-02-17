export interface Agent {
    id: string;
    created_at: string;
    name: string;
}

export interface Platform {
    id: string;
    created_at: string;
    name: string;
}




export interface IssuedPartner {
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
    parent_booking_id?: string; // For Reissues/Splits
    booking_type?: 'ORIGINAL' | 'REISSUE';
    ticket_status?: 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED' | 'REISSUE';
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
    issued_partner_id?: string;

    // Joined fields (optional, depending on query)
    agent?: Agent;
    issued_partner?: IssuedPartner;

    // New
    booking_source?: 'WALK_IN' | 'FINDYOURFARES' | 'AGENT';
    passengers?: PassengerDetail[];
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
    passport_expiry?: string;
    contact_info?: string;
    phone_number?: string;
    ticket_status?: 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED' | 'REISSUE';
    passenger_type?: 'ADULT' | 'CHILD' | 'INFANT';
}

export interface PassengerDetail {
    id?: string; // If syncing with booking_passengers table
    passenger_id?: string; // Link to passengers table
    pax_type: 'ADULT' | 'CHILD' | 'INFANT';
    title: string;
    first_name: string;
    surname: string;
    ticket_number?: string;
    passport_number?: string;
    passport_expiry?: string;
    sale_price: number;

    cost_price: number;
    ticket_status?: 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED' | 'REISSUE';
    refund_amount_partner?: number;
    refund_amount_customer?: number;
    refund_date?: string;
    phone_number?: string;
    contact_info?: string;
}

export type BookingFormData = Omit<Booking, "id" | "created_at" | "profit" | "agent" | "issued_partner" | "ticket_number" | "passenger_id" | "pax_name"> & {
    pax_name?: string; // Optional legacy or derived
    passenger_id?: string; // Optional legacy
    ticket_number?: string; // Optional legacy helper
    passengers: PassengerDetail[];
};

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
    issued_partner_id?: string;
    agent_id?: string;
    amount: number;
    transaction_type: 'TOPUP' | 'BOOKING_DEDUCTION' | 'REFUND' | 'ADJUSTMENT';
    reference_id?: string;
    description?: string;
    created_at: string;
}

export interface Booking {
    id: string;
    created_at: string;
    pax_name: string;
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
}

export interface Passenger {
    id: string;
    created_at: string;
    name: string;
    passport_number?: string;
    contact_info?: string;
}

export type BookingFormData = Omit<Booking, "id" | "created_at" | "profit">;

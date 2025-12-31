export interface Passenger {
    id: string;
    entryDate: string; // The "Date" column
    paxName: string;
    pnr: string;
    ticketNumber: string;
    departureDate: string;
    returnDate: string; // Can be a date or "ONEWAY"
    airline: string; // e.g. "FZ", "QR"
    fare: number; // Buying price
    sellingPrice: number;
    profit: number;
    paymentStatus?: string; // "DEPOSIT", "REFUND", "PAID" etc.
}

export type PassengerFormData = Omit<Passenger, "id" | "profit">;

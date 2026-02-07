export interface ChangeLogItem {
    version: string;
    date: string;
    changes: string[];
    author?: string; // Optional: "AI" or "Dev"
}

export const changelog: ChangeLogItem[] = [
    {
        version: "1.0.5",
        date: "2026-02-07",
        changes: [
            "Implemented 'Soft Delete' for Bookings, Agents, Partners, and Passengers to preserve historical data.",
            "Added 'Manual Date Selection' for Payments/Top-ups, allowing backdated transactions.",
            "Fixed Dashboard Overview statistics to use 'Entry Date' instead of 'Creation Date' for accurate monthly reporting.",
            "Fixed Payments Tab showing deleted Agents/Partners.",
            "Visual improvements: Removed deleted entities from dropdown selections.",
            "Refined Dashboard Date Logic: Switched to 'Ticket Issued Date' for accurate financial reporting.",
            "Refactored Dashboard Layout: Separated Monthly Performance metrics from Global Financial Status (Total Debt) for clarity.",
        ]
    },
    {
        version: "1.0.4",
        date: "2026-01-11",
        changes: [
            "Fixed 'Cancel' button not working in Booking Form.",
            "Implemented 'Clone on Status Change': Changing status in details now creates a new booking record.",
            "Refined Search: Now searches Airline and Ticket Status, and handles special characters safely.",
            "Enhanced List UI: Added blue hover effect for better row visibility.",
            "Widened Editing Booking Form to match New Booking Form size.",
        ]
    },
    {
        version: "1.0.3",
        date: "2026-01-11",
        changes: [
            "Implemented strict Duplicate Booking Prevention logic (Reuse Ticket Number only if same PNR).",
            "Refactored Duplicate Check: PNR + Ticket Status combination must be unique.",
            "Widened New Booking Form to use 4-column layout.",
            "Fixed Tab Order issues in Booking Form.",
            "Implemented Month Selector for Dashboard Revenue statistics.",
        ]
    },
    {
        version: "1.0.2",
        date: "2026-01-10",
        changes: [
            "Added Booking History tracking structure.",
            "Implemented initial Status Change modal.",
        ]
    }
];

export const currentVersion = changelog[0].version;

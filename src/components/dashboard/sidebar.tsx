"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CreditCard,
    Home,
    LayoutDashboard,
    LogOut,
    Plane,
    Settings,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";

const sidebarItems = [
    {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Passengers",
        href: "/dashboard/passengers",
        icon: Users,
    },
    {
        title: "Bookings",
        href: "/dashboard/bookings", // Placeholder
        icon: Plane,
    },
    {
        title: "Payments",
        href: "/dashboard/payments", // Placeholder
        icon: CreditCard,
    },
    {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-64 border-r border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 lg:flex lg:flex-col">
            <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Plane className="h-6 w-6 text-blue-600" />
                    <span>AirConnect</span>
                </Link>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme</span>
                    <ModeToggle />
                </div>
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </aside>
    );
}

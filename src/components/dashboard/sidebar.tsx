"use client"

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CreditCard,
    Home,
    LayoutDashboard,
    LogOut,
    Plane,
    Settings,
    Users,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { logout } from "@/app/(auth)/logout/actions"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

const sidebarItems = [
    {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Bookings",
        href: "/dashboard/bookings",
        icon: Plane,
    },
    {
        title: "Passengers",
        href: "/dashboard/passengers",
        icon: Users,
    },
    {
        title: "Payments",
        href: "/dashboard/payments",
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
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "group/sidebar relative hidden border-r border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 lg:flex lg:flex-col transition-[width] duration-300 ease-in-out",
                isCollapsed ? "w-[70px]" : "w-64"
            )}
        >
            {/* Toggle Button - Center Right */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                    "absolute -right-3 top-1/2 z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800",
                    "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                )}
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>

            {/* Header */}
            <div className={cn(
                "flex h-16 items-center border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out",
                isCollapsed ? "justify-center px-2" : "px-6"
            )}>
                <Link href="/dashboard" className="flex items-center font-bold text-slate-900 dark:text-white overflow-hidden whitespace-nowrap">
                    <Plane className="h-6 w-6 text-blue-600 shrink-0" />
                    <span className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[200px] opacity-100 ml-2"
                    )}>
                        AirConnect
                    </span>
                </Link>
            </div>

            {/* Nav Items */}
            <div className="flex flex-1 flex-col overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    <TooltipProvider delayDuration={0}>
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors h-10",
                                                isActive
                                                    ? "bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50",
                                                isCollapsed && "justify-center px-2"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            <span className={cn(
                                                "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                                                isCollapsed ? "max-w-0 opacity-0 ml-0 w-0" : "max-w-[200px] opacity-100 ml-3 w-auto"
                                            )}>
                                                {item.title}
                                            </span>
                                        </Link>
                                    </TooltipTrigger>
                                    {isCollapsed && (
                                        <TooltipContent side="right">
                                            {item.title}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 overflow-hidden">
                <div className={cn(
                    "flex items-center transition-all duration-300 ease-in-out",
                    isCollapsed ? "justify-center" : "justify-between px-2"
                )}>
                    <span className={cn(
                        "text-xs font-semibold text-slate-500 dark:text-slate-400 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                        isCollapsed ? "max-w-0 opacity-0 w-0" : "max-w-[100px] opacity-100 w-auto"
                    )}>
                        Theme
                    </span>
                    <ModeToggle />
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-10",
                                isCollapsed ? "justify-center px-2" : "justify-start"
                            )}
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span className={cn(
                                "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                                isCollapsed ? "max-w-0 opacity-0 ml-0 w-0" : "max-w-[200px] opacity-100 ml-2 w-auto"
                            )}>
                                Logout
                            </span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Sign out</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to sign out?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button variant="destructive" onClick={() => logout()}>Sign out</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </aside>
    );
}

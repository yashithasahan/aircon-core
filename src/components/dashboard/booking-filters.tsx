"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, Filter, X, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Platform, Agent, BookingType } from "@/types"
import { Card, CardContent } from "@/components/ui/card"

interface BookingFiltersProps {
    platforms: Platform[]
    agents: Agent[]
    bookingTypes: BookingType[]
    children?: React.ReactNode
}

export function BookingFilters({ platforms, agents, bookingTypes, children }: BookingFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [isOpen, setIsOpen] = React.useState(false)

    // Parse initial date from URL
    const initialDate = {
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    }
    const [date, setDate] = React.useState<DateRange | undefined>(initialDate)

    const [status, setStatus] = React.useState(searchParams.get("status") || "ALL")
    const [platform, setPlatform] = React.useState(searchParams.get("platform") || "ALL")
    const [airline, setAirline] = React.useState(searchParams.get("airline") || "")
    const [agentId, setAgentId] = React.useState(searchParams.get("agentId") || "ALL")
    const [bookingTypeId, setBookingTypeId] = React.useState(searchParams.get("bookingTypeId") || "ALL")

    // Update local state when URL params change (e.g. Back button)
    React.useEffect(() => {
        setStatus(searchParams.get("status") || "ALL")
        setPlatform(searchParams.get("platform") || "ALL")
        setAirline(searchParams.get("airline") || "")
        setAgentId(searchParams.get("agentId") || "ALL")
        setBookingTypeId(searchParams.get("bookingTypeId") || "ALL")
        setDate({
            from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
            to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
        })
    }, [searchParams])

    const activeFilterCount = [
        status !== "ALL",
        platform !== "ALL",
        airline !== "",
        agentId !== "ALL",
        bookingTypeId !== "ALL",
        date?.from
    ].filter(Boolean).length

    const handleApply = () => {
        const params = new URLSearchParams(searchParams.toString())

        if (status && status !== "ALL") params.set("status", status)
        else params.delete("status")

        if (platform && platform !== "ALL") params.set("platform", platform)
        else params.delete("platform")

        if (airline) params.set("airline", airline)
        else params.delete("airline")

        if (agentId && agentId !== "ALL") params.set("agentId", agentId)
        else params.delete("agentId")

        if (bookingTypeId && bookingTypeId !== "ALL") params.set("bookingTypeId", bookingTypeId)
        else params.delete("bookingTypeId")

        if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"))
        else params.delete("from")

        if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"))
        else params.delete("to")

        router.push(`/dashboard/bookings?${params.toString()}`)
        // User might want to keep panel open to tweak, or close it. 
        // For "Apply", closing is standard behavior.
        setIsOpen(false)
    }

    const handleReset = () => {
        // Clear all state
        setStatus("ALL")
        setPlatform("ALL")
        setAirline("")
        setAgentId("ALL")
        setBookingTypeId("ALL")
        setDate(undefined)

        // Clear URL
        const params = new URLSearchParams(searchParams.toString())
        params.delete("status")
        params.delete("platform")
        params.delete("airline")
        params.delete("agentId")
        params.delete("bookingTypeId")
        params.delete("from")
        params.delete("to")

        router.push(`/dashboard/bookings?${params.toString()}`)
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2 w-full">
                {children}
                <Button
                    variant={isOpen ? "secondary" : "outline"}
                    onClick={() => setIsOpen(!isOpen)}
                    className="gap-2 shrink-0"
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] ml-1">
                            {activeFilterCount}
                        </Badge>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
            </div>

            {isOpen && (
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in slide-in-from-top-2">
                    <CardContent className="grid gap-6 p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Status */}
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Statuses</SelectItem>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="ISSUED">Issued</SelectItem>
                                        <SelectItem value="VOID">Void</SelectItem>
                                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                                        <SelectItem value="CANCELED">Canceled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Platform */}
                            <div className="space-y-2">
                                <Label>Platform</Label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Platforms" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Platforms</SelectItem>
                                        {platforms.map(p => (
                                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Airline */}
                            <div className="space-y-2">
                                <Label>Airline</Label>
                                <Input
                                    placeholder="Filter by airline..."
                                    value={airline}
                                    onChange={(e) => setAirline(e.target.value)}
                                />
                            </div>

                            {/* Agent */}
                            <div className="space-y-2">
                                <Label>Agent</Label>
                                <Select value={agentId} onValueChange={setAgentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Agents" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Agents</SelectItem>
                                        {agents.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Issued From */}
                            <div className="space-y-2">
                                <Label>Issued From</Label>
                                <Select value={bookingTypeId} onValueChange={setBookingTypeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Types</SelectItem>
                                        {bookingTypes.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date Range */}
                            <div className="space-y-2">
                                <Label>Entry Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (
                                                date.to ? (
                                                    <>
                                                        {format(date.from, "LLL dd, y")} -{" "}
                                                        {format(date.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(date.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Pick a date range</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                            pagedNavigation
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Button variant="ghost" onClick={handleReset}>Reset</Button>
                            <Button onClick={handleApply} className="min-w-[100px]">Apply</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

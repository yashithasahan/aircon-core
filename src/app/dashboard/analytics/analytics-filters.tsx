'use client'

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { CalendarIcon, Filter, ChevronDown, ChevronUp } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { IssuedPartner, Agent } from "@/types"
import { Card, CardContent } from "@/components/ui/card"

interface AnalyticsFiltersProps {
    agents: Agent[]
    issuedPartners?: IssuedPartner[]
    showAgentFilter?: boolean
    showIssuedPartnerFilter?: boolean
    showDate?: boolean
    showTransactionTypeFilter?: boolean
}

export function AnalyticsFilters({
    agents,
    issuedPartners = [],
    showAgentFilter = true,
    showIssuedPartnerFilter = true,
    showDate = true,
    showTransactionTypeFilter = false,
    showUnifiedEntityFilter = false
}: AnalyticsFiltersProps & { showUnifiedEntityFilter?: boolean }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isOpen, setIsOpen] = React.useState(false)

    // Parse initial date from URL
    const initialDate = {
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    }
    const [date, setDate] = React.useState<DateRange | undefined>(initialDate)
    const [agentId, setAgentId] = React.useState(searchParams.get("agentId") || "ALL")
    const [issuedPartnerId, setIssuedPartnerId] = React.useState(searchParams.get("issuedPartnerId") || "ALL")
    const [transactionType, setTransactionType] = React.useState(searchParams.get("transactionType") || "ALL")

    // Update local state when URL params change
    React.useEffect(() => {
        setAgentId(searchParams.get("agentId") || "ALL")
        setIssuedPartnerId(searchParams.get("issuedPartnerId") || "ALL")
        setTransactionType(searchParams.get("transactionType") || "ALL")
        setDate({
            from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
            to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
        })
    }, [searchParams])

    const activeFilterCount = [
        (showAgentFilter || showUnifiedEntityFilter) && agentId !== "ALL",
        (showIssuedPartnerFilter || showUnifiedEntityFilter) && issuedPartnerId !== "ALL",
        showDate && date?.from,
        showTransactionTypeFilter && transactionType !== "ALL"
    ].filter(Boolean).length

    const handleApply = () => {
        const params = new URLSearchParams(searchParams.toString())

        if (showAgentFilter || showUnifiedEntityFilter) {
            if (agentId && agentId !== "ALL") params.set("agentId", agentId)
            else params.delete("agentId")
        }

        if (showIssuedPartnerFilter || showUnifiedEntityFilter) {
            if (issuedPartnerId && issuedPartnerId !== "ALL") params.set("issuedPartnerId", issuedPartnerId)
            else params.delete("issuedPartnerId")
        }

        if (showTransactionTypeFilter) {
            if (transactionType && transactionType !== "ALL") params.set("transactionType", transactionType)
            else params.delete("transactionType")
        }

        if (showDate) {
            if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"))
            else params.delete("from")

            if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"))
            else params.delete("to")
        }

        router.push(`${pathname}?${params.toString()}`)
        setIsOpen(false)
    }

    const handleReset = () => {
        setAgentId("ALL")
        setIssuedPartnerId("ALL")
        setTransactionType("ALL")
        setDate(undefined)

        const params = new URLSearchParams(searchParams.toString())
        params.delete("agentId")
        params.delete("issuedPartnerId")
        params.delete("transactionType")
        params.delete("from")
        params.delete("to")

        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2 w-full">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Unified Entity Filter */}
                            {showUnifiedEntityFilter && (
                                <div className="space-y-2">
                                    <Label>Entity (Agent / Partner)</Label>
                                    <Select
                                        value={agentId !== "ALL" ? `AGENT:${agentId}` : issuedPartnerId !== "ALL" ? `PARTNER:${issuedPartnerId}` : "ALL"}
                                        onValueChange={(value) => {
                                            if (value === "ALL") {
                                                setAgentId("ALL");
                                                setIssuedPartnerId("ALL");
                                            } else if (value.startsWith("AGENT:")) {
                                                setAgentId(value.split(":")[1]);
                                                setIssuedPartnerId("ALL");
                                            } else if (value.startsWith("PARTNER:")) {
                                                setIssuedPartnerId(value.split(":")[1]);
                                                setAgentId("ALL");
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Entities" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Entities</SelectItem>
                                            {/* Agents Group */}
                                            {agents.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Agents</div>}
                                            {agents.map(a => (
                                                <SelectItem key={`agent-${a.id}`} value={`AGENT:${a.id}`}>{a.name}</SelectItem>
                                            ))}
                                            {/* Partners Group */}
                                            {issuedPartners.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Issued Partners</div>}
                                            {issuedPartners.map(p => (
                                                <SelectItem key={`partner-${p.id}`} value={`PARTNER:${p.id}`}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Agent (Separate) */}
                            {showAgentFilter && !showUnifiedEntityFilter && (
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
                            )}

                            {/* Issued Partner (Separate) */}
                            {showIssuedPartnerFilter && !showUnifiedEntityFilter && (
                                <div className="space-y-2">
                                    <Label>Issued Partner</Label>
                                    <Select value={issuedPartnerId} onValueChange={setIssuedPartnerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Partners" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Partners</SelectItem>
                                            {issuedPartners.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Transaction Type */}
                            {showTransactionTypeFilter && (
                                <div className="space-y-2">
                                    <Label>Transaction Type</Label>
                                    <Select value={transactionType} onValueChange={setTransactionType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Types</SelectItem>
                                            <SelectItem value="TOPUP">Topup</SelectItem>
                                            <SelectItem value="BOOKING_DEDUCTION">Booking</SelectItem>
                                            <SelectItem value="REFUND">Refund</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Date Range */}
                            {showDate && (
                                <div className="space-y-2">
                                    <Label>Date Range</Label>
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
                            )}
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

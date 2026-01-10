"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, subMonths, addMonths } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MonthSelector() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentParam = searchParams.get('date')

    // Parse current date from param or default to now
    const currentDate = React.useMemo(() => {
        if (currentParam) {
            const date = new Date(currentParam + '-01')
            return isNaN(date.getTime()) ? new Date() : date
        }
        return new Date()
    }, [currentParam])

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = direction === 'prev'
            ? subMonths(currentDate, 1)
            : addMonths(currentDate, 1)

        const params = new URLSearchParams(searchParams)
        params.set('date', format(newDate, 'yyyy-MM'))
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8"
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous month</span>
            </Button>

            <div className="min-w-[140px] text-center font-medium">
                {format(currentDate, 'MMMM yyyy')}
            </div>

            <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8"
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next month</span>
            </Button>
        </div>
    )
}

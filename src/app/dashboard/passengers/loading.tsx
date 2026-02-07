import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-40 mb-2" />
                    <Skeleton className="h-5 w-60" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-4 p-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

import { changelog, currentVersion } from "@/lib/changelog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CheckCircle2, GitCommit } from "lucide-react"

export default function VersionPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        Changelog
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Tracking updates, fixes, and improvements.
                    </p>
                    <Badge variant="secondary" className="text-lg px-4 py-1">
                        Current Version: {currentVersion}
                    </Badge>
                </div>

                {/* Timeline */}
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 space-y-12">
                    {changelog.map((item, index) => (
                        <div key={item.version} className="relative pl-8 md:pl-12">
                            {/* Dot */}
                            <div className={`
                                absolute -left-[9px] top-1 h-5 w-5 rounded-full border-4 border-white dark:border-slate-950
                                ${index === 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}
                            `} />

                            {/* Content */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                    v{item.version}
                                    {index === 0 && (
                                        <Badge className="bg-blue-600 hover:bg-blue-700">Latest</Badge>
                                    )}
                                </h2>
                                <span className="text-sm font-medium text-slate-500 font-mono mt-1 sm:mt-0">
                                    {format(new Date(item.date), "MMMM d, yyyy")}
                                </span>
                            </div>

                            <div className="mt-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                                <ul className="space-y-3">
                                    {item.changes.map((change, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                            <GitCommit className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                                            <span className="leading-relaxed">{change}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-400">
                        System automatically tracked. &copy; {new Date().getFullYear()} AirConnect Core.
                    </p>
                </div>

            </div>
        </div>
    )
}

"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
    text?: string
    loadingText?: string
}

export function SubmitButton({
    text = "Submit",
    loadingText = "Loading...",
    className,
    children,
    ...props
}: SubmitButtonProps) {
    const { pending } = useFormStatus()

    return (
        <Button
            disabled={pending}
            type="submit"
            className={cn("w-full", className)}
            {...props}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                </>
            ) : (
                children || text
            )}
        </Button>
    )
}

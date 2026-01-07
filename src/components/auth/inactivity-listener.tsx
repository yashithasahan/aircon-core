"use client"

import { useEffect, useRef } from "react"
import { logout } from "@/app/(auth)/logout/actions"

// 15 minutes in milliseconds
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000

export function InactivityListener() {
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const resetTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(async () => {
            console.log("User inactive. Logging out...")
            await logout()
        }, INACTIVITY_LIMIT_MS)
    }

    useEffect(() => {
        // Initial start
        resetTimer()

        // Events to listen for
        const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress']

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer)
        })

        // Cleanup
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer)
            })
        }
    }, [])

    return null // This component doesn't render anything
}

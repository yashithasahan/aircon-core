import Link from "next/link"
import { Plane, Lock, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SubmitButton } from "@/components/auth/submit-button"

import { login } from "./actions"

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
    const searchParams = await props.searchParams;
    const isError = !!searchParams.error;

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
            {/* Background with abstract shapes/gradients */}
            <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-black opacity-80" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl text-slate-100 shadow-2xl">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-blue-600/20 rounded-full ring-1 ring-blue-500/50">
                                <Plane className="w-8 h-8 text-blue-400 rotate-[-45deg]" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-white">
                            AirConnect
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Enter your credentials to access the flight dashboard
                        </CardDescription>
                    </CardHeader>
                    <form action={login}>
                        <CardContent className="space-y-4">
                            {isError && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-1">
                                    {searchParams.error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email" className={isError ? "text-red-500" : "text-slate-200"}>Email</Label>
                                <div className="relative">
                                    <User className={`absolute left-3 top-2.5 h-4 w-4 ${isError ? "text-red-500" : "text-slate-500"}`} />
                                    <Input
                                        name="email"
                                        id="email"
                                        placeholder="admin@airline.com"
                                        className={`pl-9 bg-slate-950/50 ${isError ? "border-red-500 focus-visible:ring-red-500" : "border-slate-800 focus-visible:ring-blue-500"} text-slate-100 placeholder:text-slate-600`}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className={isError ? "text-red-500" : "text-slate-200"}>Password</Label>
                                <div className="relative">
                                    <Lock className={`absolute left-3 top-2.5 h-4 w-4 ${isError ? "text-red-500" : "text-slate-500"}`} />
                                    <Input
                                        name="password"
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className={`pl-9 bg-slate-950/50 ${isError ? "border-red-500 focus-visible:ring-red-500" : "border-slate-800 focus-visible:ring-blue-500"} text-slate-100 placeholder:text-slate-600`}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <SubmitButton
                                className="w-full"
                                variant={isError ? "destructive" : "premium"}
                                size="lg"
                                text="Sign In"
                                loadingText="Signing In..."
                            />
                            <div className="text-xs text-center text-slate-500">
                                Protected by secure encryption. Authorized personnel only.
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}

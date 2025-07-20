
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.357-11.297-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,35.536,44,30.169,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


export function SettingsPage() {
    const [theme, setTheme] = React.useState("dark");
    const [language, setLanguage] = React.useState("en-us");
    const { toast } = useToast();
    const { user, signIn, signOut, isFirebaseConfigured } = useAuth();

    React.useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
            return;
        }
        root.classList.add(theme);
    }, [theme]);
    
    const handleCloudSync = () => {
        if (!isFirebaseConfigured) {
             toast({
                title: "Configuration Required",
                description: "Please configure Firebase in your .env file to enable cloud features.",
                variant: "destructive"
            });
            return;
        }
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please sign in to enable cloud sync.",
                variant: "destructive"
            });
            return;
        }
        toast({
            title: "Coming Soon!",
            description: "Cloud Storage is not yet configured. Please set up Firebase to enable cloud sync.",
        });
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Settings</h1>
                <p className="text-muted-foreground">Manage your account and application preferences.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="theme-mode" className="flex flex-col space-y-1">
                            <span>Theme</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Select between light and dark mode.
                            </span>
                        </Label>
                        <Switch
                            id="theme-mode"
                            checked={theme === 'dark'}
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            aria-label="Toggle dark mode"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>Manage your account settings and connected services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="google-auth" className="flex flex-col space-y-1">
                            <span>Google Account</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {user ? `Signed in as ${user.email}` : "Sign in to sync your documents across devices."}
                            </span>
                        </Label>
                        {user ? (
                            <Button variant="outline" onClick={signOut}>Sign Out</Button>
                        ) : (
                            <Button variant="outline" id="google-auth" onClick={signIn} disabled={!isFirebaseConfigured}>
                                {!isFirebaseConfigured ? (
                                    "Firebase not configured"
                                ) : (
                                    <>
                                        <GoogleIcon className="mr-2" />
                                        Sign in with Google
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="cloud-storage" className="flex flex-col space-y-1">
                            <span>Cloud Storage</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {isFirebaseConfigured && user ? "Your documents are saved automatically." : "Sign in to enable cloud storage."}
                            </span>
                        </Label>
                        <Button variant="secondary" id="cloud-storage" onClick={handleCloudSync} disabled={!isFirebaseConfigured}>Enable Cloud Sync</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Language & Region</CardTitle>
                    <CardDescription>Set your preferred language for the application.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center justify-between space-x-2">
                         <Label htmlFor="language" className="flex-1">
                            App Language
                        </Label>
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-[200px]" id="language">
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en-us">English (United States)</SelectItem>
                                <SelectItem value="es-es">Español (España)</SelectItem>
                                <SelectItem value="fr-fr">Français (France)</SelectItem>
                                <SelectItem value="de-de">Deutsch (Deutschland)</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>About</CardTitle>
                    <CardDescription>Information about the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="help-center">
                            Help Center
                        </Label>
                        <Button variant="outline" id="help-center" asChild>
                            <a href="#" target="_blank" rel="noopener noreferrer">Visit Help Center</a>
                        </Button>
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="app-version">
                            App Version
                        </Label>
                        <span id="app-version" className="text-sm text-muted-foreground">1.0.0</span>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

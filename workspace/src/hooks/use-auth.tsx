
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut as firebaseSignOut, 
    User 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from './use-toast';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!isFirebaseConfigured || !auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        if (!isFirebaseConfigured || !auth) {
             toast({
                variant: 'destructive',
                title: 'Configuration Error',
                description: 'Firebase is not configured. Please add your API keys to the .env file.',
            });
            return;
        }
        const provider = new GoogleAuthProvider();
        
        try {
            await signInWithPopup(auth, provider);
            toast({
                title: 'Success!',
                description: 'You have successfully signed in.',
            });
        } catch (error) {
            console.error("Sign in error:", error);
            const firebaseError = error as {code?: string, message?: string};
            
            if (firebaseError.code === 'auth/unauthorized-domain') {
                 toast({
                    variant: 'destructive',
                    title: 'Action Required: Authorize this Domain',
                    description: (
                        <div className="text-left text-sm w-full">
                            <p className="mb-2">Firebase is blocking sign-in from this web address for security.</p>
                            <p className="font-bold">1. Copy this domain name:</p>
                            <code className="block bg-muted p-2 rounded-md my-1 text-foreground break-all">{window.location.hostname}</code>
                            <p className="font-bold mt-2">2. Go to your Firebase Project:</p>
                            <p className="text-xs">Authentication {'->'} Settings {'->'} Authorized domains</p>
                            <p className="font-bold mt-2">3. Click "Add domain" and paste it.</p>
                        </div>
                    ),
                    duration: 30000,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Sign In Failed',
                    description: `An unknown error occurred. Code: ${firebaseError.code || 'N/A'}`
                });
            }
        }
    };

    const signOut = async () => {
         if (!isFirebaseConfigured || !auth) {
             toast({
                variant: 'destructive',
                title: 'Configuration Error',
                description: 'Firebase is not configured.',
            });
            return;
        }
        try {
            await firebaseSignOut(auth);
            toast({
                title: 'Signed Out',
                description: 'You have been successfully signed out.',
            });
        } catch (error) {
             console.error("Sign out error:", error);
            toast({
                variant: 'destructive',
                title: 'Sign Out Failed',
                description: 'Could not sign out. Please try again.',
            });
        }
    };

    const value = { user, loading, signIn, signOut, isFirebaseConfigured };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

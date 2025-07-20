
"use client";

import { GenerateDocumentOutput, GenerateDocumentInput } from "@/ai/flows/generate-document";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from "./use-auth";

const MAX_RECENT_ITEMS = 5;

// Define the structure for a generic recent item
export interface RecentGeneration<T_Data = any, T_Form = any> {
    id: string;
    type: 'document' | 'illustration' | 'exam' | 'notes' | 'solver' | 'blueprint' | 'handwriting' | 'editor' | 'resume';
    title: string;
    timestamp: number;
    data: T_Data;
    formValues: T_Form;
}

// Type for a document-specific generation
export type DocumentGeneration = RecentGeneration<GenerateDocumentOutput, GenerateDocumentInput>;

// Union type for all possible generation types in the future
export type AnyRecentGeneration = DocumentGeneration; // Add other types here with |

interface RecentGenerationsContextType {
    recentGenerations: AnyRecentGeneration[];
    addRecentGeneration: (item: Omit<AnyRecentGeneration, 'id' | 'timestamp'>) => void;
    viewingItem: AnyRecentGeneration | null;
    viewGeneration: (item: AnyRecentGeneration | null) => void;
}

const RecentGenerationsContext = createContext<RecentGenerationsContextType | undefined>(undefined);

export const RecentGenerationsProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [recentGenerations, setRecentGenerations] = useState<AnyRecentGeneration[]>([]);
    const [viewingItem, setViewingItem] = useState<AnyRecentGeneration | null>(null);

    const getStorageKey = useCallback(() => {
        return user ? `recentGenerations_${user.uid}` : null;
    }, [user]);

    useEffect(() => {
        const storageKey = getStorageKey();
        if (storageKey) {
            try {
                const storedItems = localStorage.getItem(storageKey);
                if (storedItems) {
                    setRecentGenerations(JSON.parse(storedItems));
                } else {
                    setRecentGenerations([]);
                }
            } catch (error) {
                console.error("Failed to parse recent generations from localStorage", error);
                setRecentGenerations([]);
            }
        } else {
            setRecentGenerations([]);
        }
    }, [user, getStorageKey]);

    const addRecentGeneration = (item: Omit<AnyRecentGeneration, 'id' | 'timestamp'>) => {
        const storageKey = getStorageKey();
        if (!storageKey) return;

        const newItem: AnyRecentGeneration = {
            ...item,
            id: `${item.type}-${Date.now()}`,
            timestamp: Date.now(),
        };

        setRecentGenerations(prev => {
            const updated = [newItem, ...prev].slice(0, MAX_RECENT_ITEMS);
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch (error) {
                console.error("Failed to save recent generations to localStorage", error);
            }
            return updated;
        });
    };
    
    const viewGeneration = (item: AnyRecentGeneration | null) => {
        setViewingItem(item);
    };

    const value = { recentGenerations, addRecentGeneration, viewingItem, viewGeneration };

    return (
        <RecentGenerationsContext.Provider value={value}>
            {children}
        </RecentGenerationsContext.Provider>
    );
};

export const useRecentGenerations = () => {
    const context = useContext(RecentGenerationsContext);
    if (context === undefined) {
        throw new Error('useRecentGenerations must be used within a RecentGenerationsProvider');
    }
    return context;
};

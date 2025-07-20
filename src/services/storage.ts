
'use client';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, listAll, getDownloadURL, getMetadata } from 'firebase/storage';

if (!storage) {
    console.warn("Firebase Storage is not configured. Cloud storage features will be disabled.");
}

export interface DocumentFile {
    name: string;
    url: string;
    createdAt: number;
}

export async function uploadDocument(uid: string, fileName: string, file: Blob): Promise<string> {
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    const docRef = ref(storage, `documents/${uid}/${fileName}`);
    const snapshot = await uploadBytes(docRef, file);
    return getDownloadURL(snapshot.ref);
}

export async function listDocuments(uid: string): Promise<DocumentFile[]> {
    if (!storage) {
        return [];
    }
    const listRef = ref(storage, `documents/${uid}`);
    const res = await listAll(listRef);

    const files: DocumentFile[] = await Promise.all(
        res.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);
            return {
                name: itemRef.name,
                url: url,
                createdAt: new Date(metadata.timeCreated).getTime(),
            };
        })
    );

    return files;
}

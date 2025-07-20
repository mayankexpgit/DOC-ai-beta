
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, User, ScanText, ArrowRight, Download, FolderArchive, BarChartHorizontal, ClipboardPen, FileSignature, BookOpenCheck, DraftingCompass, PenSquare, LucideIcon, FileEdit, RefreshCw, Eye, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listDocuments, DocumentFile } from "@/services/storage";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { RadialMenu } from "./radial-menu";
import { cn } from "@/lib/utils";
import { useRecentGenerations } from "@/hooks/use-recent-generations";
import { RecentGenerationItem } from "./recent-generation-item";

type Tool = 'dashboard' | 'docs' | 'resume' | 'analyzer' | 'illustrations' | 'storage' | 'exam' | 'notes' | 'solver' | 'blueprint' | 'handwriting' | 'editor';

interface DashboardProps {
    setActiveTool: (tool: Tool) => void;
}

export const tools: {
    name: string;
    description: string;
    icon: LucideIcon;
    tool: Tool;
    color: string;
    bgColor: string;
    gradient: string;
}[] = [
    {
        name: "Document",
        description: "Generate essays, reports, and more.",
        icon: FileText,
        tool: "docs" as Tool,
        color: "text-purple-600",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        gradient: "from-purple-500 to-indigo-600",
    },
    {
        name: "Exam Paper",
        description: "Create papers from NCERT books.",
        icon: ClipboardPen,
        tool: "exam" as Tool,
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        gradient: "from-blue-500 to-sky-600",
    },
     {
        name: "Short Notes",
        description: "Generate notes from a chapter.",
        icon: FileSignature,
        tool: "notes" as Tool,
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        gradient: "from-green-500 to-emerald-600",
    },
     {
        name: "Handwritten",
        description: "Convert notes to your handwriting.",
        icon: PenSquare,
        tool: "handwriting" as Tool,
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        gradient: "from-red-500 to-orange-600",
    },
    {
        name: "AI Editor",
        description: "Professionally edit your documents.",
        icon: FileEdit,
        tool: "editor" as Tool,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
        gradient: "from-indigo-500 to-violet-600",
    },
    {
        name: "Booklet Solver",
        description: "Solve any uploaded question paper.",
        icon: BookOpenCheck,
        tool: "solver" as Tool,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        gradient: "from-yellow-500 to-amber-600",
    },
    {
        name: "Blueprint",
        description: "Generate a project design blueprint.",
        icon: DraftingCompass,
        tool: "blueprint" as Tool,
        color: "text-sky-600",
        bgColor: "bg-sky-100 dark:bg-sky-900/30",
        gradient: "from-sky-400 to-blue-500",
    },
    {
        name: "Resume",
        description: "Create a professional resume draft.",
        icon: User,
        tool: "resume" as Tool,
        color: "text-orange-600",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        gradient: "from-orange-400 to-red-500",
    },
    {
        name: "Analyzer",
        description: "Summarize and ask questions.",
        icon: ScanText,
        tool: "analyzer" as Tool,
        color: "text-pink-600",
        bgColor: "bg-pink-100 dark:bg-pink-900/30",
        gradient: "from-pink-500 to-rose-500",
    },
    {
        name: "Illustration",
        description: "Create diagrams and charts.",
        icon: BarChartHorizontal,
        tool: "illustrations" as Tool,
        color: "text-teal-600",
        bgColor: "bg-teal-100 dark:bg-teal-900/30",
        gradient: "from-teal-400 to-cyan-500",
    }
];

export function Dashboard({ setActiveTool }: DashboardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [documents, setDocuments] = React.useState<DocumentFile[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = React.useState(true);
    const { recentGenerations, viewGeneration } = useRecentGenerations();

    const fetchDocuments = React.useCallback(() => {
        if (user) {
            setIsLoadingDocs(true);
            listDocuments(user.uid)
                .then(docs => {
                    const sortedDocs = docs.sort((a, b) => b.createdAt - a.createdAt);
                    setDocuments(sortedDocs);
                })
                .catch(err => {
                    console.error("Error listing documents:", err);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Could not load your saved documents."
                    });
                })
                .finally(() => setIsLoadingDocs(false));
        } else {
            setIsLoadingDocs(false);
            setDocuments([]);
        }
    }, [user, toast]);

    React.useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);


    return (
        <div className="flex flex-col gap-8">
            <div className="text-left">
                <h1 className="text-4xl font-bold font-headline text-foreground">
                    Good morning, {user?.displayName?.split(' ')[0] || 'Guest'}!
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Let's create something amazing today.
                </p>
            </div>
            
            <div className="relative">
                <Card className="lg:col-span-2 bg-gradient-to-br from-primary via-purple-600 to-violet-700 text-white p-8 flex flex-col justify-between rounded-3xl min-h-[200px] shadow-2xl shadow-primary/20">
                   <div>
                     <h2 className="text-3xl font-bold font-headline">AI Content Generator</h2>
                     <p className="mt-2 text-purple-200 max-w-lg">Instantly generate documents, presentations, and more with the power of AI.</p>
                   </div>
                   <div className="mt-8">
                        <Button onClick={() => setActiveTool('docs')} className="bg-white/20 hover:bg-white/30 text-white rounded-full">
                            Get Started <ArrowRight className="ml-2 w-4 h-4"/>
                        </Button>
                   </div>
                </Card>
            </div>

            {user && recentGenerations.length > 0 && (
                 <div className="pt-8">
                    <h2 className="text-2xl font-bold font-headline text-foreground mb-4">Recent Generations</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                         {recentGenerations.map((item) => (
                           <RecentGenerationItem key={item.id} item={item} onSelect={viewGeneration}/>
                        ))}
                    </div>
                 </div>
            )}
            
            <div className="pt-8">
                 <h2 className="text-2xl font-bold font-headline text-foreground mb-4">Quick Tools</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tools.map((tool) => (
                        <Card 
                            key={tool.tool}
                            onClick={() => setActiveTool(tool.tool)}
                            className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        >
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-32">
                                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110", tool.bgColor)}>
                                    <tool.icon className={cn("w-6 h-6", tool.color)} />
                                </div>
                                <h3 className="text-sm font-semibold">{tool.name}</h3>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="pt-8">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold font-headline text-foreground">Your Cloud Documents</h2>
                    <Button variant="ghost" size="icon" onClick={fetchDocuments} disabled={isLoadingDocs || !user}>
                        <RefreshCw className={cn("w-4 h-4", isLoadingDocs && "animate-spin")} />
                    </Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        {isLoadingDocs && (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        )}
                        {!isLoadingDocs && documents.length > 0 && (
                            <ul className="space-y-2">
                                {documents.map((doc) => (
                                    <li key={doc.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span className="font-medium">{doc.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(doc.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {!isLoadingDocs && documents.length === 0 && (
                             <div className="text-center text-muted-foreground py-10">
                                <FolderArchive className="w-12 h-12 mx-auto mb-4" />
                                <h3 className="font-semibold">No Documents Found</h3>
                                <p className="text-sm">
                                    {user ? "Saved documents will appear here. Try saving a generated document!" : "Sign in to view your cloud documents."}
                                </p>
                             </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="pt-8 text-center">
                <div className="flex items-center justify-center min-h-[400px]">
                    <RadialMenu tools={tools} setActiveTool={setActiveTool} />
                </div>
            </div>
        </div>
    )
}

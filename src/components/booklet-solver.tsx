
"use client";

import { useState, ChangeEvent, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BookOpenCheck, Wand2, FileUp, Loader2, Printer, FileDown, CloudUpload } from "lucide-react";
import { marked } from "marked";
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { solveBooklet, SolveBookletInput, SolveBookletOutput } from "@/ai/flows/booklet-solver";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";


const formSchema = z.object({
  documentContent: z.string().min(100, {
    message: "Document content must be at least 100 characters.",
  }),
  detailLevel: z.enum(['short', 'medium', 'detailed']).default('detailed'),
});

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function BookletSolver() {
    const [isLoading, setIsLoading] = useState(false);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<SolveBookletOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const answerKeyRef = useRef<HTMLDivElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            documentContent: "",
            detailLevel: "detailed",
        },
    });

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({
                variant: 'destructive',
                title: 'Invalid File Type',
                description: 'Please upload a PDF file.',
            });
            return;
        }

        setIsParsingPdf(true);
        toast({ title: 'Processing PDF...', description: 'Extracting text from your document.' });

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;
            let fullText = '';

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            
            form.setValue('documentContent', fullText, { shouldValidate: true });
            toast({
                title: 'Success!',
                description: 'PDF content has been extracted and loaded.',
            });
        } catch (error) {
            console.error('Failed to parse PDF:', error);
            toast({
                variant: 'destructive',
                title: 'PDF Parsing Error',
                description: 'Could not read the content from the PDF file. Please try another file.',
            });
        } finally {
            setIsParsingPdf(false);
            event.target.value = '';
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const output = await solveBooklet(values as SolveBookletInput);
            setResult(output);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to solve the booklet. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!answerKeyRef.current) return null;
        const canvas = await html2canvas(answerKeyRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const ratio = imgWidth / imgHeight;
        let newImgHeight = pdfWidth / ratio;
        
        const totalPages = Math.ceil(newImgHeight / pdfHeight);
        
        for (let i = 0; i < totalPages; i++) {
            if (i > 0) pdf.addPage();
            const y = -i * pdfHeight;
            pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, newImgHeight);
        }
        return pdf.output('blob');
    }

    const handleDownload = async () => {
        toast({ title: "Preparing Download...", description: "Your answer key is being converted to PDF." });
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'solved-answer-key.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: "Download Complete!", description: "Your solved answer key has been downloaded." });
        }
    };
    
    const handleSaveToCloud = async () => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Login Required",
                description: "You must be signed in to save documents to the cloud.",
            });
            return;
        }

        setIsUploading(true);
        toast({
            title: "Uploading to Cloud...",
            description: "Your answer key is being saved.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            const fileName = `Solved_Booklet_${new Date().toISOString()}.pdf`;
            await uploadDocument(user.uid, fileName, blob);
            toast({
                title: "Saved to Cloud!",
                description: "Your answer key has been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your answer key. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };


    const handlePrint = () => {
        if (!answerKeyRef.current) return;
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Answer Key</title>');
            printWindow.document.write('<style>body { font-family: sans-serif; } .prose { max-width: 100%; } h2, h3 { margin-top: 1.5em; } </style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(answerKeyRef.current.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const generatedHtml = result ? marked.parse(result.solvedAnswers) : "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Booklet Solver</CardTitle>
                    <CardDescription>
                        Upload any question booklet (PDF) and get a highly detailed, solved answer key.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormItem>
                                <FormLabel>Upload Booklet PDF</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Button asChild variant="outline" className="w-full" disabled={isParsingPdf}>
                                            <label htmlFor="booklet-upload" className="cursor-pointer">
                                                {isParsingPdf ? (
                                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                     <FileUp className="mr-2 h-4 w-4" />
                                                )}
                                                {isParsingPdf ? 'Parsing PDF...' : 'Upload Question Booklet'}
                                            </label>
                                        </Button>
                                        <Input 
                                            id="booklet-upload" 
                                            type="file" 
                                            className="sr-only" 
                                            accept=".pdf" 
                                            onChange={handleFileChange}
                                            disabled={isParsingPdf}
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription>
                                   The extracted text will appear in the text area below.
                                </FormDescription>
                            </FormItem>
                            
                            <FormField
                                control={form.control}
                                name="documentContent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Document Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Paste the full text from your booklet here, or upload a PDF above."
                                                className="min-h-[250px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                           The AI will identify and solve all questions from this content.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="detailLevel"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Answer Key Detail Level</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a detail level" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="short">Short - Final answers only</SelectItem>
                                            <SelectItem value="medium">Medium - Brief explanations</SelectItem>
                                            <SelectItem value="detailed">Detailed - Step-by-step solutions</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose how verbose you want the answer key to be.
                                    </FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit" disabled={isLoading || isParsingPdf} className="w-full">
                                {isLoading ? "Solving..." : "Solve Booklet"}
                                <Wand2 className="ml-2 w-4 h-4" />
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px] flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Solved Answer Key</CardTitle>
                            <CardDescription>A detailed answer key will appear here.</CardDescription>
                        </div>
                        {result && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={handleSaveToCloud} disabled={!user || isUploading}>
                                    <CloudUpload className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handlePrint}><Printer className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={handleDownload}><FileDown className="h-4 w-4" /></Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full w-full rounded-md border">
                        <div className="p-4 bg-white dark:bg-card">
                            <div ref={answerKeyRef} className="p-4">
                                {isLoading && (
                                    <div className="space-y-4">
                                        <Skeleton className="h-6 w-1/3" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <br/>
                                        <Skeleton className="h-6 w-1/2" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-4/5" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                )}
                                {result && (
                                    <div 
                                        className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: generatedHtml }}
                                    />
                                )}
                                {!isLoading && !result && (
                                    <div className="w-full h-full flex items-center justify-center text-center text-muted-foreground p-8">
                                        <div>
                                            <BookOpenCheck className="w-12 h-12 mx-auto mb-4" />
                                            <p>Your solved answer key will be displayed here, ready for review.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}


"use client";

import { useState, ChangeEvent, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FileSignature, Wand2, Upload, FileUp, Loader2, CloudUpload, FileDown } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateShortNotes, GenerateShortNotesInput, GenerateShortNotesOutput } from "@/ai/flows/generate-short-notes";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";


const formSchema = z.object({
  chapterContent: z.string().min(100, {
    message: "Chapter content must be at least 100 characters.",
  }),
  detailLevel: z.enum(['concise', 'detailed', 'comprehensive']).default('detailed'),
});

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function ShortNotesGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<GenerateShortNotesOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const notesRef = useRef<HTMLDivElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            chapterContent: "",
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
            
            form.setValue('chapterContent', fullText, { shouldValidate: true });
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
            // Reset file input
            event.target.value = '';
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const output = await generateShortNotes(values as GenerateShortNotesInput);
            setResult(output);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to generate notes. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!notesRef.current) return null;
        const canvas = await html2canvas(notesRef.current, { scale: 2, backgroundColor: '#ffffff' });
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
    };

    const handleDownload = async () => {
        toast({ title: "Preparing Download...", description: "Your notes are being converted to PDF." });
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'short-notes.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
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
            description: "Your notes are being saved.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            const fileName = `Short_Notes_${new Date().toISOString()}.pdf`;
            await uploadDocument(user.uid, fileName, blob);
            toast({
                title: "Saved to Cloud!",
                description: "Your notes have been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your notes. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };


    const generatedHtml = result ? marked.parse(result.shortNotes) : "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Short Notes Generator</CardTitle>
                    <CardDescription>
                        Upload a PDF or paste chapter content to get well-structured short notes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormItem>
                                <FormLabel>Upload Chapter PDF</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Button asChild variant="outline" className="w-full" disabled={isParsingPdf}>
                                            <label htmlFor="pdf-upload" className="cursor-pointer">
                                                {isParsingPdf ? (
                                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                     <FileUp className="mr-2 h-4 w-4" />
                                                )}
                                                {isParsingPdf ? 'Parsing PDF...' : 'Upload PDF File'}
                                            </label>
                                        </Button>
                                        <Input 
                                            id="pdf-upload" 
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
                                name="chapterContent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chapter / Document Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Paste the full text from your chapter here, or upload a PDF above."
                                                className="min-h-[250px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The better the quality of the source text, the better the notes.
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
                                    <FormLabel>Detail Level</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a detail level" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="concise">Concise - Quick overview</SelectItem>
                                            <SelectItem value="detailed">Detailed - Standard revision notes</SelectItem>
                                            <SelectItem value="comprehensive">Comprehensive - In-depth study notes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose how in-depth you want your notes to be.
                                    </FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading || isParsingPdf} className="w-full">
                                {isLoading ? "Generating..." : "Generate Notes"}
                                <Wand2 className="ml-2 w-4 h-4" />
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px] flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Generated Notes</CardTitle>
                        {result && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={handleSaveToCloud} disabled={!user || isUploading}>
                                    <CloudUpload className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDownload}>
                                    <FileDown className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <CardDescription>Your AI-generated short notes will appear here.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full w-full rounded-md border">
                        <div ref={notesRef} className="p-4 bg-white dark:bg-card">
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
                                        <FileSignature className="w-12 h-12 mx-auto mb-4" />
                                        <p>Your generated notes will be displayed here, perfectly structured for your study needs.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}


"use client";

import { useState, ChangeEvent, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FileEdit, Wand2, FileUp, Loader2, Printer, FileDown, Copy, CloudUpload } from "lucide-react";
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
import { editDocument, ProfessionalDocumentEditorInput, ProfessionalDocumentEditorOutput } from "@/ai/flows/professional-document-editor";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";


const formSchema = z.object({
  documentContent: z.string().min(50, {
    message: "Document content must be at least 50 characters to be edited effectively.",
  }),
});

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function ProfessionalDocumentEditor() {
    const [isLoading, setIsLoading] = useState(false);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<ProfessionalDocumentEditorOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const editedContentRef = useRef<HTMLDivElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            documentContent: "",
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
            const output = await editDocument(values as ProfessionalDocumentEditorInput);
            setResult(output);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to edit the document. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!editedContentRef.current) return null;
        const canvas = await html2canvas(editedContentRef.current, { 
            scale: 2,
            backgroundColor: '#ffffff'
        });
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
        toast({ title: "Preparing Download...", description: "Your document is being converted to PDF." });
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'edited-document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: "Download Complete!", description: "Your edited document has been downloaded." });
        }
    };

    const handlePrint = () => {
        if (!editedContentRef.current) return;
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Document</title>');
            printWindow.document.write('<style>body { font-family: sans-serif; padding: 2rem; } .prose { max-width: 100%; } h1, h2, h3 { margin-top: 1.5em; } </style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(editedContentRef.current.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };
    
     const handleCopy = () => {
        if (!editedContentRef.current) return;
        const textToCopy = editedContentRef.current.innerText;
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Copied!",
            description: "Edited content copied to clipboard.",
        });
    }

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
            description: "Your edited document is being saved.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            const fileName = `Edited_Document_${new Date().toISOString()}.pdf`;
            await uploadDocument(user.uid, fileName, blob);
            toast({
                title: "Saved to Cloud!",
                description: "Your edited document has been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your document. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const generatedHtml = result ? marked.parse(result.editedContent) : "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Professional AI Editor</CardTitle>
                    <CardDescription>
                        Upload or paste your document, and our AI will professionally revise and enhance it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormItem>
                                <FormLabel>Upload Document PDF</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Button asChild variant="outline" className="w-full" disabled={isParsingPdf}>
                                            <label htmlFor="doc-upload" className="cursor-pointer">
                                                {isParsingPdf ? (
                                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                     <FileUp className="mr-2 h-4 w-4" />
                                                )}
                                                {isParsingPdf ? 'Parsing PDF...' : 'Upload Document'}
                                            </label>
                                        </Button>
                                        <Input 
                                            id="doc-upload" 
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
                                        <FormLabel>Original Document Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Paste the plain text from your document here..."
                                                className="min-h-[300px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                           The AI will edit this content for clarity, grammar, and structure.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit" disabled={isLoading || isParsingPdf} className="w-full">
                                {isLoading ? "Editing..." : "Edit with AI"}
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
                            <CardTitle>AI-Edited Document</CardTitle>
                            <CardDescription>Your revised document will appear here.</CardDescription>
                        </div>
                        {result && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={handleSaveToCloud} disabled={!user || isUploading}>
                                    <CloudUpload className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={handlePrint}><Printer className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={handleDownload}><FileDown className="h-4 w-4" /></Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 bg-muted/50 p-4">
                    <ScrollArea className="h-full w-full">
                        <div
                            ref={editedContentRef}
                            className="p-8 bg-white shadow-lg rounded-sm w-full min-h-[29.7cm] aspect-[210/297]"
                            style={{
                                width: '21cm',
                                minHeight: '29.7cm',
                                margin: '0 auto',
                            }}
                        >
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
                                        <FileEdit className="w-12 h-12 mx-auto mb-4" />
                                        <p>Your professionally edited document will be displayed here.</p>
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


"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles, Copy, Printer, Eye, Info, X, FileDown, BookType, StretchHorizontal, FileOutput, Gem, Type, Palette, BookOpen, ImageIcon, Wand2, MonitorPlay, CloudUpload } from "lucide-react";
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
    SelectGroup,
    SelectLabel,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateDocument, GenerateDocumentInput, GenerateDocumentOutput } from "@/ai/flows/generate-document";
import { Slider } from "@/components/ui/slider";
import { PrintingAnimation } from "./printing-animation";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { GeminiIcon } from "@/components/icons";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Switch } from "./ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";
import { useRecentGenerations } from "@/hooks/use-recent-generations";


const standardFonts = [
    { name: 'Roboto', className: 'font-roboto' },
    { name: 'Open Sans', className: 'font-open-sans' },
    { name: 'Lato', className: 'font-lato' },
    { name: 'Montserrat', className: 'font-montserrat' },
    { name: 'Merriweather', className: 'font-merriweather' },
    { name: 'Playfair Display', className: 'font-playfair-display' },
    { name: 'Nunito', className: 'font-nunito' },
    { name: 'Raleway', className: 'font-raleway' },
    { name: 'Source Code Pro', className: 'font-source-code-pro' },
    { name: 'Lora', className: 'font-lora' },
    { name: 'PT Sans', className: 'font-pt-sans' },
    { name: 'Poppins', className: 'font-poppins' }
];

const handwritingFonts = [
    { name: 'Caveat', className: 'font-caveat' },
    { name: 'Dancing Script', className: 'font-dancing-script' },
    { name: 'Patrick Hand', className: 'font-patrick-hand' },
    { name: 'Indie Flower', className: 'font-indie-flower' }
];

const allFonts = [...standardFonts, ...handwritingFonts];

const fontEnum = z.enum([
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Merriweather',
    'Playfair Display',
    'Nunito',
    'Raleway',
    'Source Code Pro',
    'Lora',
    'PT Sans',
    'Poppins',
    'Caveat',
    'Dancing Script',
    'Patrick Hand',
    'Indie Flower'
]);

const formSchema = z.object({
  prompt: z.string().min(10, {
    message: "Prompt must be at least 10 characters.",
  }),
  documentType: z.enum(['essay', 'report', 'letter', 'meeting-agenda', 'project-proposal', 'presentation', 'timetable']).default('essay'),
  format: z.enum(['PDF', 'DOCX', 'TXT']).default('PDF'),
  pageSize: z.enum(['A4', 'A3', 'A5']).default('A4'),
  pageCount: z.number().min(1).max(30),
  qualityLevel: z.enum(['medium', 'high', 'ultra']).default('high'),
  font: fontEnum.default('Roboto'),
  theme: z.enum(['professional', 'creative', 'minimalist']).default('professional'),
  numImages: z.number().min(0).max(15).default(0),
  generateTemplate: z.boolean().default(true),
});

type FormSchemaType = z.infer<typeof formSchema>;

export function DocumentGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("Initializing...");
    const { toast } = useToast();
    const { user } = useAuth();
    const { addRecentGeneration, viewGeneration, viewingItem } = useRecentGenerations();

    const result = viewingItem?.type === 'document' ? viewingItem.data : null;
    const isViewerOpen = viewingItem?.type === 'document';

    const [viewerState, setViewerState] = useState({
        pageSize: 'A4',
        format: 'PDF',
        font: 'Roboto',
    });

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            prompt: "",
            documentType: "essay",
            format: "PDF",
            pageSize: "A4",
            pageCount: 1,
            qualityLevel: "high",
            font: "Roboto",
            theme: "professional",
            numImages: 0,
            generateTemplate: true,
        },
    });

    const selectedFormat = form.watch('format');
    const documentType = form.watch('documentType');
    const isPresentation = documentType === 'presentation';
    const isTimetable = documentType === 'timetable';
    const isRichFormat = selectedFormat !== 'TXT';

    const promptPlaceholders: Record<string, string> = {
        'essay': "e.g., An essay on the impact of AI on modern society...",
        'report': "e.g., A quarterly sales report for Q2 2024, analyzing key metrics...",
        'letter': "e.g., A cover letter for a software engineer position at Google...",
        'meeting-agenda': "e.g., An agenda for the weekly project sync meeting...",
        'project-proposal': "e.g., A project proposal for a new mobile application...",
        'presentation': "e.g., A presentation on the future of renewable energy...",
        'timetable': "e.g., A weekly timetable for a 10th-grade student with subjects: Math, Science, English, History, and Art, from Monday to Friday, 9am to 3pm.",
        'default': "Describe the content you want to create."
    }

    async function onSubmit(values: FormSchemaType) {
        setIsLoading(true);
        viewGeneration(null);
        
        const updateProgress = (value: number, label: string) => {
            setProgress(value);
            setProgressLabel(label);
        };
        
        updateProgress(10, "Warming up the AI...");

        setViewerState({
            pageSize: values.pageSize,
            format: values.format,
            font: values.font,
        });

        try {
            updateProgress(30, "Generating content...");
            const output = await generateDocument(values as GenerateDocumentInput);
            
            updateProgress(100, "Content ready!");

            if (user) {
                addRecentGeneration({
                    type: 'document',
                    title: values.prompt.substring(0, 50) + '...',
                    data: output,
                    formValues: values,
                });
            }

            viewGeneration({
                id: Date.now().toString(),
                type: 'document',
                title: values.prompt.substring(0, 50) + '...',
                data: output,
                timestamp: Date.now(),
                formValues: values,
            })
            
        } catch (error) {
            console.error(error);
            updateProgress(0, "Error!");
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to generate content. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }


    const handleCopy = () => {
        if (!result) return;
        const textContent = result.pages.map(page => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page.content;
            return tempDiv.textContent || tempDiv.innerText || '';
        }).join('\n\n');

        navigator.clipboard.writeText(textContent);
        toast({
            title: "Copied!",
            description: "Content copied to clipboard.",
        });
    }

    const handlePrint = () => {
        const printableArea = document.getElementById('printable-area');
        if (!printableArea) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ title: "Error", description: "Could not open print window. Please disable your pop-up blocker.", variant: "destructive" });
            return;
        }

        const fontName = viewingItem?.formValues?.font || 'Roboto';
        const googleFontLink = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
        
        const contentToPrint = printableArea.innerHTML;
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Document</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link rel="stylesheet" href="${googleFontLink}">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { font-family: '${fontName}', sans-serif; }
                        @page { size: ${viewingItem?.formValues?.pageSize || 'A4'}; margin: 1in; }
                        .page-container {
                            display: flex;
                            flex-direction: column;
                            gap: 2rem;
                        }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid black; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                         img {
                            max-height: 300px;
                            margin: 1rem auto;
                            border-radius: 0.5rem;
                            background-color: white;
                            padding: 0.5rem;
                         }
                    </style>
                </head>
                <body>
                    <div class="page-container">${contentToPrint}</div>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!result) return null;
         const container = document.getElementById('printable-area');
        if (!container) {
            toast({ title: "Error", description: "Could not find content to generate PDF from.", variant: "destructive" });
            return null;
        }

        const pageElements = Array.from(container.children) as HTMLElement[];
        if (pageElements.length === 0) {
            toast({ title: "Error", description: "No pages to convert to PDF.", variant: "destructive" });
            return null;
        }
        
        let orientation: "p" | "l" = 'p';
        if (result.isPresentation) {
                orientation = 'l';
        } else {
                orientation = pageElements[0].clientWidth > pageElements[0].clientHeight ? 'l' : 'p';
        }
        
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'px',
            format: result.isPresentation ? 'a4' : [pageElements[0].clientWidth, pageElements[0].clientHeight],
        });


        for (let i = 0; i < pageElements.length; i++) {
            const page = pageElements[i];
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: result.theme.backgroundColor,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            if (i > 0) {
                pdf.addPage([pdfWidth, pdfHeight], orientation);
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
        
        return pdf.output('blob');
    }
    
    const handleDownload = async () => {
        if (!result) return;

        const selectedFormat = viewingItem?.formValues?.format || 'PDF';
        const documentType = viewingItem?.formValues?.documentType || 'document';

        toast({
            title: "Preparing Download...",
            description: `Your ${documentType} is being prepared as a ${selectedFormat} file.`,
        });

        if (selectedFormat === 'PDF') {
            const blob = await generatePdfBlob();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${documentType}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            return;
        }

        // Fallback for DOCX and TXT
        let fileContent = '';
        let fileType = '';
        let fileExtension = '';

        if (selectedFormat === 'TXT') {
            fileContent = result.pages.map(page => {
                 const tempDiv = document.createElement('div');
                 tempDiv.innerHTML = page.content;
                 return tempDiv.textContent || tempDiv.innerText || '';
            }).join('\n\n---\n\n');
            fileType = 'text/plain;charset=utf-8';
            fileExtension = 'txt';
        } else { // DOCX
             const fontName = viewingItem?.formValues?.font || 'Roboto';
            const googleFontLink = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
            
            const contentHtml = result.pages.map(page => {
                const tempDiv = document.createElement('div');
                Object.assign(tempDiv.style, {
                    width: '100%',
                    maxWidth: '8.5in',
                    margin: '2rem auto',
                    padding: '2rem 2.5rem',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    backgroundColor: result.theme.backgroundColor,
                    color: result.theme.textColor,
                    borderImageSource: result.theme.backgroundImageDataUri ? `url(${result.theme.backgroundImageDataUri})` : 'none',
                    borderImageSlice: '20',
                    borderImageWidth: '20px',
                    borderImageRepeat: 'repeat',
                    borderStyle: 'solid',
                    borderColor: 'transparent',
                    pageBreakAfter: 'always',
                });
                tempDiv.innerHTML = page.content;
                return tempDiv.outerHTML;
            }).join('');

            fileContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${documentType}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link rel="stylesheet" href="${googleFontLink}">
                    <style>
                        body { 
                            font-family: '${fontName}', sans-serif; 
                            font-size: 12pt;
                            background-color: #f0f0f0; 
                            margin: 0; 
                            padding: 1rem;
                        }
                        h1, h2, h3, h4, h5, h6 { font-weight: bold; }
                        h1 { font-size: 22pt; color: ${result.theme.headingColor}; } 
                        h2 { font-size: 18pt; color: ${result.theme.headingColor}; } 
                        h3 { font-size: 14pt; color: ${result.theme.headingColor}; }
                        p { margin: 0 0 1em 0; }
                        table { border-collapse: collapse; width: 100%; }
                        td, th { border: 1px solid #ccc; padding: 8px; }
                        img { max-width: 100%; height: auto; border-radius: 8px; }
                        @page { size: ${viewingItem?.formValues?.pageSize || 'A4'}; }
                    </style>
                </head>
                <body>
                    ${contentHtml}
                </body>
                </html>
            `;
            fileType = 'text/html;charset=utf-8';
            fileExtension = 'doc';
        }

        const blob = new Blob([fileContent], { type: fileType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documentType}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Download Started!",
            description: `Your document is being downloaded as a .${fileExtension} file.`,
        });
    };
    
    const handleSaveToCloud = async () => {
        if (!result) return;
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
            description: "Your document is being saved to your account.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            
            const docType = form.getValues('documentType');
            const promptStart = form.getValues('prompt').substring(0, 20).replace(/\s/g, '_');
            const fileName = `${docType}_${promptStart}_${new Date().toISOString()}.pdf`;
            
            await uploadDocument(user.uid, fileName, blob);
            
            toast({
                title: "Saved to Cloud!",
                description: "Your document has been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your document to the cloud. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };
    const pageSizeClasses = {
        'A4': 'aspect-[1/1.414]',
        'A3': 'aspect-[1.414/1]',
        'A5': 'aspect-[1/1.414]',
    };

    const fontClasses: {[key: string]: string} = allFonts.reduce((acc, font) => {
        acc[font.name] = font.className;
        return acc;
    }, {} as {[key: string]: string});
    
    const pages = result?.pages || [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Content Generator</CardTitle>
                    <CardDescription>
                        Create documents, presentations, and more with the power of AI.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="documentType"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="flex items-center gap-2"><BookType /> Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a document type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="essay">Essay</SelectItem>
                                            <SelectItem value="report">Report</SelectItem>
                                            <SelectItem value="letter">Letter</SelectItem>
                                            <SelectItem value="meeting-agenda">Meeting Agenda</SelectItem>
                                            <SelectItem value="project-proposal">Project Proposal</SelectItem>
                                            <SelectItem value="presentation">Presentation</SelectItem>
                                            <SelectItem value="timetable">Timetable</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the type of content to guide the AI.
                                    </FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="prompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2 relative">
                                            <div className="shooting-stars">
                                                <div className="star"></div>
                                                <div className="star"></div>
                                                <div className="star"></div>
                                            </div>
                                            <GeminiIcon className="w-8 h-8 icon-glow" />
                                            Your Prompt
                                        </FormLabel>
                                        <div className="glowing-border">
                                            <FormControl>
                                                <Textarea
                                                    placeholder={promptPlaceholders[documentType] || promptPlaceholders['default']}
                                                    className="min-h-[120px] bg-background"
                                                    {...field} />
                                            </FormControl>
                                        </div>
                                        <FormDescription>
                                            Describe the content you want to create.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", isTimetable && "hidden")}>
                                <FormField
                                    control={form.control}
                                    name="pageSize"
                                    render={({ field }) => (
                                        <FormItem className={cn((isPresentation || isTimetable) && "hidden")}>
                                        <FormLabel className="flex items-center gap-2"><StretchHorizontal /> Page Size</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isRichFormat}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a page size" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="A4">A4</SelectItem>
                                                <SelectItem value="A3">A3</SelectItem>
                                                <SelectItem value="A5">A5</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="format"
                                    render={({ field }) => (
                                        <FormItem className={cn((isPresentation || isTimetable) && "hidden")}>
                                        <FormLabel className="flex items-center gap-2"><FileOutput /> Format</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a format" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PDF">PDF</SelectItem>
                                                <SelectItem value="DOCX">DOCX</SelectItem>
                                                <SelectItem value="TXT">TXT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="qualityLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Gem /> Quality Level
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs">
                                                            <b>Medium:</b> Good quality, balanced time.<br/>
                                                            <b>High:</b> Better quality, more detailed.<br/>
                                                            <b>Ultra:</b> Best quality, exceptionally detailed, slower.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select quality level" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="ultra">Ultra</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="font"
                                    render={({ field }) => (
                                        <FormItem className={cn((isPresentation || isTimetable) && "hidden")}>
                                        <FormLabel className="flex items-center gap-2"><Type /> Font</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isRichFormat}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a font" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Standard</SelectLabel>
                                                    {standardFonts.map(font => (
                                                        <SelectItem key={font.name} value={font.name} className={font.className}>
                                                            {font.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                                <SelectGroup>
                                                    <SelectLabel>Handwriting</SelectLabel>
                                                    {handwritingFonts.map(font => (
                                                        <SelectItem key={font.name} value={font.name} className={font.className}>
                                                            {font.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <FormField
                                control={form.control}
                                name="theme"
                                render={({ field }) => (
                                    <FormItem className={cn((isPresentation || isTimetable) && "hidden")}>
                                    <FormLabel className="flex items-center gap-2"><Palette /> Theme</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isRichFormat}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a theme" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="professional">Professional</SelectItem>
                                            <SelectItem value="creative">Creative</SelectItem>
                                            <SelectItem value="minimalist">Minimalist</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        AI will generate a visual style based on your choice. Ineligible for TXT.
                                    </FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="pageCount"
                                render={({ field }) => (
                                    <FormItem className={cn(isTimetable && "hidden")}>
                                        <FormLabel className="flex items-center gap-2"><BookOpen /> {isPresentation ? 'Number of Slides' : 'Page Count'}: {field.value}</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={isPresentation ? 1 : 1}
                                                max={isPresentation ? 15 : 30}
                                                step={1}
                                                defaultValue={[field.value]}
                                                onValueChange={(value) => field.onChange(value[0])}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="numImages"
                                render={({ field }) => (
                                    <FormItem className={cn(isTimetable && "hidden")}>
                                        <FormLabel className="flex items-center gap-2"><ImageIcon /> Number of Images: {field.value}</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={0}
                                                max={15}
                                                step={1}
                                                defaultValue={[field.value]}
                                                onValueChange={(value) => field.onChange(value[0])}
                                                disabled={!isRichFormat}
                                            />
                                        </FormControl>
                                         <FormDescription>
                                            Select how many AI-generated illustrations (diagrams, charts, etc.) to include.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {isPresentation && (
                                <FormField
                                    control={form.control}
                                    name="generateTemplate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Generate AI Template</FormLabel>
                                                <FormDescription>
                                                    Create a unique visual theme with AI-generated slide borders.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}
                             
                            <div
                                className={cn("glowing-border", isLoading && "[--animation-play-state:paused]")}
                            >
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full h-12 flex items-center justify-center bg-primary rounded-md text-primary-foreground font-bold text-lg disabled:opacity-100 disabled:bg-primary/80"
                                >
                                    <span className="flex items-center gap-2">
                                        <Wand2 className="h-5 w-5" strokeWidth={2.5} />
                                        {isLoading ? "Generating..." : `Generate ${isPresentation ? 'Presentation' : isTimetable ? 'Timetable' : 'Document'}`}
                                        <Sparkles className="h-5 w-5" strokeWidth={2.5} />
                                    </span>
                                </button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px] flex flex-col bg-muted/30">
                <CardHeader>
                    <CardTitle>Generated Content</CardTitle>
                    <CardDescription>Your AI-generated content will appear here.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 min-h-0 items-center justify-center">
                    {(isLoading || (progress > 0 && !result)) && (
                        <div className="w-full max-w-md text-center">
                            <PrintingAnimation />
                            <Progress value={progress} className="mt-4 w-full" />
                            <p className="mt-2 text-sm text-muted-foreground animate-pulse">
                                {progressLabel}
                            </p>
                        </div>
                    )}
                    {result && !isLoading &&(
                         <div className="text-center">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-float-glow">
                                {result.isPresentation ? <MonitorPlay className="w-12 h-12 text-primary icon-glow" /> : <Sparkles className="w-12 h-12 text-primary icon-glow" />}
                            </div>
                            <h3 className="mt-4 text-lg font-medium">{result.isPresentation ? 'Presentation' : 'Document'} Generated!</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Your content is ready to be viewed.</p>
                             <div className="flex gap-2 justify-center mt-6">
                                <Button onClick={() => viewGeneration(viewingItem)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View {result.isPresentation ? 'Presentation' : 'Document'}
                                </Button>
                                <Button onClick={handleSaveToCloud} disabled={!user || isUploading} variant="secondary">
                                    <CloudUpload className="mr-2 h-4 w-4" />
                                    {isUploading ? "Saving..." : "Save to Cloud"}
                                </Button>
                            </div>
                        </div>
                    )}
                    {!isLoading && !result && (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <p>Your generated content will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {result && (
                <Dialog open={isViewerOpen} onOpenChange={(open) => !open && viewGeneration(null)}>
                    <div className="dialog-content-parent">
                        <DialogContent className="max-w-none w-[95vw] sm:w-[90vw] md:w-[80vw] h-[90vh] flex flex-col p-0">
                            <DialogHeader className="p-4 border-b">
                                <DialogTitle>{result.isPresentation ? 'Presentation' : 'Document'} Viewer</DialogTitle>
                                <DialogDescription>
                                    Here is your generated content. You can copy the text or download it.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="w-full h-full flex flex-col bg-muted/50 flex-1 min-h-0">
                                <div className="flex items-center justify-end gap-2 p-2 border-b bg-background rounded-t-lg">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleDownload}>
                                                    <FileDown className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Download ({viewingItem?.formValues?.format || 'PDF'})</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handleCopy}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Copy Text</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={handlePrint}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Print</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DialogClose asChild>
                                        <Button variant="ghost" size="icon" aria-label="Close" onClick={() => viewGeneration(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </DialogClose>
                                </div>
                                <ScrollArea className="flex-1 bg-muted/20" id="printable-area-wrapper">
                                <div id="printable-area" className={cn("flex items-center justify-center p-4 sm:p-8", result.isPresentation ? "" : "flex-col gap-8")}>
                                {result.isPresentation ? (
                                     <Carousel className="w-full max-w-4xl">
                                        <CarouselContent>
                                            {pages.map((page, index) => (
                                                <CarouselItem key={index}>
                                                    <div className="p-1">
                                                        <Card 
                                                            id={`page-${index}`}
                                                            className="aspect-video flex items-center justify-center relative overflow-hidden text-white p-8"
                                                            style={{
                                                                backgroundColor: result.theme.backgroundColor,
                                                                '--border-image-source': result.theme.backgroundImageDataUri ? `url(${result.theme.backgroundImageDataUri})` : 'none',
                                                                borderImageSource: 'var(--border-image-source)',
                                                                borderImageSlice: 20,
                                                                borderImageWidth: '20px',
                                                                borderImageRepeat: 'repeat',
                                                                borderStyle: 'solid',
                                                                borderColor: 'transparent',
                                                            } as React.CSSProperties}
                                                        >
                                                            <div 
                                                                className="relative z-10 w-full h-full flex flex-col justify-center text-center prose-invert prose-sm sm:prose-base md:prose-lg prose-h1:text-5xl prose-h2:text-4xl prose-img:max-h-60 prose-img:mx-auto prose-img:rounded-lg"
                                                                style={{
                                                                    '--tw-prose-body': result.theme.textColor,
                                                                    '--tw-prose-headings': result.theme.headingColor,
                                                                } as React.CSSProperties}
                                                                 dangerouslySetInnerHTML={{ __html: page.content }} 
                                                            />
                                                        </Card>
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselPrevious className="text-white bg-black/50 hover:bg-black/80 -left-8" />
                                        <CarouselNext className="text-white bg-black/50 hover:bg-black/80 -right-8" />
                                    </Carousel>
                                ) : (
                                    <>
                                    {pages.map((page, index) => (
                                        <div 
                                            key={index} 
                                            id={`page-${index}`}
                                            className={cn(
                                                "w-full max-w-4xl shadow-lg relative bg-white print:shadow-none print:border",
                                                pageSizeClasses[viewingItem?.formValues?.pageSize as keyof typeof pageSizeClasses]
                                            )}
                                            style={{
                                                padding: '2rem 2.5rem',
                                                backgroundColor: result.theme.backgroundColor,
                                                color: result.theme.textColor,
                                                '--border-image-source': result.theme.backgroundImageDataUri ? `url(${result.theme.backgroundImageDataUri})` : 'none',
                                                borderImageSource: 'var(--border-image-source)',
                                                borderImageSlice: 20,
                                                borderImageWidth: '20px',
                                                borderImageRepeat: 'repeat',
                                                borderStyle: 'solid',
                                                borderColor: 'transparent',
                                            } as React.CSSProperties}
                                        >
                                            <div className={cn(
                                                "relative z-10 whitespace-pre-wrap prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-table:w-full",
                                                fontClasses[viewingItem?.formValues?.font as keyof typeof fontClasses]
                                            )}
                                            style={{
                                                '--tw-prose-body': result.theme.textColor,
                                                '--tw-prose-headings': result.theme.headingColor,
                                                '--tw-prose-lead': result.theme.textColor,
                                                '--tw-prose-links': result.theme.textColor,
                                                '--tw-prose-bold': result.theme.textColor,
                                                '--tw-prose-counters': result.theme.textColor,
                                                '--tw-prose-bullets': result.theme.textColor,
                                                '--tw-prose-hr': result.theme.textColor,
                                                '--tw-prose-quotes': result.theme.textColor,
                                                '--tw-prose-quote-borders': result.theme.textColor,
                                                '--tw-prose-captions': result.theme.textColor,
                                                '--tw-prose-code': result.theme.textColor,
                                                '--tw-prose-pre-code': result.theme.textColor,
                                                '--tw-prose-pre-bg': 'rgba(0,0,0,0.05)',
                                                '--tw-prose-th-borders': result.theme.headingColor,
                                                '--tw-prose-td-borders': result.theme.textColor,
                                                '--tw-prose-invert-body': result.theme.textColor,
                                                '--tw-prose-invert-headings': result.theme.headingColor,
                                            } as React.CSSProperties}
                                             dangerouslySetInnerHTML={{ __html: page.content }} 
                                            >
                                            </div>
                                        </div>
                                    ))}
                                    </>
                                )}
                                </div>
                                </ScrollArea>
                            </div>
                        </DialogContent>
                    </div>
                </Dialog>
            )}
        </div>
    );
}

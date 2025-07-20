
"use client";

import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ClipboardPen, Sparkles, Copy, Printer, FileDown, Settings, ChevronDown, LayoutGrid, AlertTriangle, CloudUpload } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { marked } from "marked";


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
import { generateExamPaper, GenerateExamPaperInput, GenerateExamPaperOutput } from "@/ai/flows/exam-paper-generator";
import { Slider } from "@/components/ui/slider";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Separator } from "./ui/separator";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { PrintingAnimation } from "./printing-animation";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";

const formSchema = z.object({
  examTitle: z.string().min(5, { message: "Title must be at least 5 characters." }),
  standard: z.string().min(1, { message: "Please enter a standard or grade." }),
  subject: z.string().min(3, { message: "Please enter a subject." }),
  curriculum: z.enum(['ncert', 'nios', 'board']).default('ncert'),
  syllabus: z.string().min(10, { message: "Syllabus must be at least 10 characters." }),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  numQuestions: z.number().min(1).max(200).default(10),
  totalMarks: z.string().min(1, { message: "Please enter total marks." }).regex(/^\d+$/, { message: "Marks must be a number."}),
  timeAllotted: z.string().min(3, { message: "Please enter time allotted." }),
  includePYQs: z.boolean().default(false),
  addAnswerKey: z.boolean().default(true),
  isMCQOnly: z.boolean().default(false),
  competencyPercentage: z.number().min(0).max(100).default(50).optional(),
  useOriginalQuestions: z.boolean().default(false),
  generateBlueprint: z.boolean().default(true),
  isSectionWise: z.boolean().default(false),
  numMCQs: z.number().optional(),
  num1Mark: z.number().optional(),
  num2Mark: z.number().optional(),
  num3Mark: z.number().optional(),
  num4Mark: z.number().optional(),
}).refine(data => {
    if (!data.isSectionWise) return true;
    const { totalMarks, numMCQs = 0, num1Mark = 0, num2Mark = 0, num3Mark = 0, num4Mark = 0 } = data;
    const sectionMarks = (numMCQs * 1) + (num1Mark * 1) + (num2Mark * 2) + (num3Mark * 3) + (num4Mark * 4);
    return sectionMarks === parseInt(totalMarks);
}, {
    message: "The sum of marks from all sections must equal the Total Marks for the paper.",
    path: ["isSectionWise"],
});

type FormSchemaType = z.infer<typeof formSchema>;

interface Question {
    number: string;
    text: string;
    marks: string;
}

const parseExamPaper = (content: string): { header: string; instructions: string; questions: Question[] } => {
    if (!content) return { header: '', instructions: '', questions: [] };

    const lines = content.split('\n');
    
    // Find the separator for General Instructions
    const instructionSeparatorIndex = lines.findIndex(line => line.trim() === '---' || line.includes('**General Instructions**'));
    
    let headerLines: string[];
    let instructionLines: string[] = [];
    let questionLines: string[];

    if (instructionSeparatorIndex !== -1) {
        headerLines = lines.slice(0, instructionSeparatorIndex);
        
        // Find where questions start after instructions
        const questionStartIndex = lines.findIndex((line, index) => index > instructionSeparatorIndex && /^\s*(\d+\.|\*\*?Section)/.test(line));

        if (questionStartIndex !== -1) {
            instructionLines = lines.slice(instructionSeparatorIndex, questionStartIndex);
            questionLines = lines.slice(questionStartIndex);
        } else {
            // No questions found after instructions
            instructionLines = lines.slice(instructionSeparatorIndex);
            questionLines = [];
        }
    } else {
        // Fallback if no instruction separator is found
        const firstQuestionIndex = lines.findIndex(line => /^\s*(\d+\.|\*\*?Section)/.test(line));
        if (firstQuestionIndex !== -1) {
            headerLines = lines.slice(0, firstQuestionIndex);
            questionLines = lines.slice(firstQuestionIndex);
        } else {
            // No questions found at all
            headerLines = lines;
            questionLines = [];
        }
    }

    const headerHtml = marked.parse(headerLines.join('\n'));
    const instructionsHtml = marked.parse(instructionLines.join('\n').replace('---', ''));

    const consolidatedLines: string[] = [];
    if (questionLines.length > 0) {
        let currentQuestion = '';
        for (const line of questionLines) {
            if (line.trim() === '') continue;
            const isNewQuestion = /^\s*(\d+\.|\*\*?Section)/.test(line);
            if (isNewQuestion && currentQuestion) {
                consolidatedLines.push(currentQuestion.trim());
            }
            currentQuestion = isNewQuestion ? line : currentQuestion + '\n' + line;
        }
        if (currentQuestion) consolidatedLines.push(currentQuestion.trim());
    }
    
    const questions: Question[] = consolidatedLines.map(line => {
        if (!line || line.trim() === '') return null;
        
        if (/^\s*\*\*?Section/.test(line)) {
            return { number: '', text: marked.parse(line), marks: '' };
        }
        
        const numberMatch = line.match(/^\s*(\d+)\.\s/);
        const number = numberMatch ? numberMatch[1] : '';
        
        const marksMatch = line.match(/\[(.*?)\]\s*$/);
        const marks = marksMatch ? marksMatch[0] : '';
        
        let questionText = line.replace(/^\s*\d+\.\s/, '').replace(/\[(.*?)\]\s*$/, '').trim();
        const textHtml = marked.parse(questionText || '');

        return { number, text: textHtml, marks };
    }).filter((q): q is Question => q !== null);

    return { header: headerHtml, instructions: instructionsHtml, questions };
};


export function ExamPaperGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<GenerateExamPaperOutput | null>(null);
    const [activeTab, setActiveTab] = useState("paper");
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            examTitle: "Mid-Term Examination",
            standard: "10th",
            subject: "Science",
            curriculum: "ncert",
            syllabus: "Chapter 1: Chemical Reactions and Equations\nChapter 2: Acids, Bases and Salts\nChapter 6: Life Processes",
            difficulty: 'medium',
            numQuestions: 10,
            totalMarks: "70",
            timeAllotted: "3 Hours",
            includePYQs: false,
            addAnswerKey: true,
            isMCQOnly: false,
            competencyPercentage: 50,
            useOriginalQuestions: false,
            generateBlueprint: true,
            isSectionWise: false,
            numMCQs: 0,
            num1Mark: 0,
            num2Mark: 0,
            num3Mark: 0,
            num4Mark: 0,
        },
    });

    const isMCQOnly = form.watch('isMCQOnly');
    const totalMarks = form.watch('totalMarks');
    const isSectionWise = form.watch('isSectionWise');
    
    const { numMCQs = 0, num1Mark = 0, num2Mark = 0, num3Mark = 0, num4Mark = 0 } = form.watch();
    const accountedMarks = (numMCQs * 1) + (num1Mark * 1) + (num2Mark * 2) + (num3Mark * 3) + (num4Mark * 4);
    const remainingMarks = (parseInt(totalMarks) || 0) - accountedMarks;

    async function onSubmit(values: FormSchemaType) {
        setIsLoading(true);
        setResult(null);
        try {
            const output = await generateExamPaper(values as GenerateExamPaperInput);
            setResult(output);
            setActiveTab("paper");
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to generate exam paper. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleCopy = () => {
        if (!result) return;
        
        const contentContainer = document.getElementById(activeTab === 'paper' ? 'printable-exam' : activeTab === 'key' ? 'printable-key' : 'printable-blueprint');
        if (!contentContainer) return;
        
        const textToCopy = contentContainer.innerText;
        navigator.clipboard.writeText(textToCopy);

        toast({
            title: "Copied!",
            description: `${activeTab === 'paper' ? 'Question paper' : activeTab === 'key' ? 'Answer key' : 'Blueprint'} content copied to clipboard.`,
        });
    }

    const handlePrint = () => {
        const printableArea = document.getElementById(activeTab === 'paper' ? 'printable-exam' : activeTab === 'key' ? 'printable-key' : 'printable-blueprint');
        if (!printableArea) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ title: "Error", description: "Could not open print window. Please disable your pop-up blocker.", variant: "destructive" });
            return;
        }
        
        const contentToPrint = printableArea.innerHTML;
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print ${activeTab === 'paper' ? 'Exam Paper' : 'Answer Key'}</title>
                    <style>
                        body { 
                            font-family: 'Times New Roman', Times, serif; 
                            line-height: 1.6;
                            margin: 0;
                            color: black;
                            background-color: white;
                        }
                        .printable-content {
                            max-width: 8.5in;
                            margin: auto;
                            padding: 1in;
                        }
                        .prose {
                            max-width: none;
                        }
                        .prose .header-content {
                            text-align: center;
                        }
                        .prose .header-details { 
                            display: flex; 
                            justify-content: space-between; 
                            font-weight: bold; 
                            margin-top: 1rem;
                            padding-bottom: 0.5rem;
                            border-bottom: 1px solid black;
                        }
                        .prose .instructions-block {
                            font-weight: bold;
                            margin-top: 1.5rem;
                            margin-bottom: 2rem;
                            padding: 1rem;
                            border: 1px solid #ccc;
                            border-radius: 8px;
                        }
                        .prose .instructions-block, .prose .instructions-block * {
                           font-weight: bold !important;
                        }
                        .prose ol, .prose ul {
                           padding-left: 20px;
                        }
                        .question-list {
                            list-style: none;
                            padding-left: 0;
                        }
                        .question-item {
                           margin-top: 1.5rem;
                           display: flex;
                           justify-content: space-between;
                           align-items: flex-start;
                           gap: 1rem;
                           border-top: 1px solid #eee;
                           padding-top: 1rem;
                        }
                        .question-item-text {
                           flex-grow: 1;
                        }
                         .question-item-text p, .question-item-text ol, .question-item-text ul {
                           margin-top: 0;
                           margin-bottom: 0;
                        }
                        .question-item-marks {
                            font-weight: bold;
                        }
                        .prose table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                        .prose th, .prose td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                        .prose th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <div class="printable-content prose">${contentToPrint}</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 250)
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!result) return null;
        const contentContainer = document.getElementById(activeTab === 'paper' ? 'printable-exam' : activeTab === 'key' ? 'printable-key' : 'printable-blueprint');
        if (!contentContainer) {
            toast({ title: "Error", description: "Could not find content to generate PDF from.", variant: "destructive" });
            return null;
        }

        const canvas = await html2canvas(contentContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'px', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        let canvasHeightInPdf = pdfWidth / ratio;
        let totalPages = Math.ceil(canvasHeightInPdf / pdfHeight);

        for (let i = 0; i < totalPages; i++) {
            if (i > 0) pdf.addPage();
            let yPos = -i * pdfHeight;
            pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, canvasHeightInPdf);
        }
        return pdf.output('blob');
    }

    const handleDownload = async () => {
        if (!result) return;
    
        toast({
            title: "Preparing Download...",
            description: `Your ${activeTab === 'paper' ? 'exam paper' : activeTab === 'key' ? 'answer key' : 'blueprint'} is being converted to PDF.`,
        });
    
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${activeTab === 'paper' ? 'exam-paper' : activeTab === 'key' ? 'answer-key' : 'blueprint'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
    
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
            description: "Your exam paper is being saved to your account.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            
            const examTitle = form.getValues('examTitle').replace(/\s/g, '_');
            const subject = form.getValues('subject');
            const fileName = `ExamPaper_${subject}_${examTitle}.pdf`;
            
            await uploadDocument(user.uid, fileName, blob);
            
            toast({
                title: "Saved to Cloud!",
                description: "Your exam paper has been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your exam paper. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };


    const { header, instructions, questions } = result?.examPaperContent ? parseExamPaper(result.examPaperContent) : { header: '', instructions: '', questions: [] };
    const keyHtml = result?.answerKeyContent ? marked.parse(result.answerKeyContent) : '';
    const blueprintHtml = result?.blueprintContent ? marked.parse(result.blueprintContent) : '';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Exam Paper Generator</CardTitle>
                    <CardDescription>
                        Create high-quality exam papers based on modern curriculum patterns.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="examTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Final Term Physics" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="standard"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Standard / Grade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., 12th" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Mathematics" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                             <FormField
                                control={form.control}
                                name="curriculum"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Curriculum / Board</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select curriculum" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ncert">NCERT</SelectItem>
                                            <SelectItem value="nios">NIOS</SelectItem>
                                            <SelectItem value="board">Standard Board Pattern</SelectItem>
                                        </SelectContent>
                                     </Select>
                                     <FormDescription>
                                        The AI will generate questions based on the selected pattern.
                                    </FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="totalMarks"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total Marks</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., 70" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="timeAllotted"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Time Allotted</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., 3 Hours" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="syllabus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Syllabus / Topics</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Paste the syllabus or list the topics to be covered. e.g., Chapter 1: Chemical Reactions, Chapter 2: Acids, Bases and Salts"
                                                className="min-h-[120px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Be specific for the best results.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="isMCQOnly"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>MCQ Only Mode</FormLabel>
                                            <FormDescription>
                                                Generate a paper with only multiple-choice questions.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                if (checked) form.setValue('isSectionWise', false);
                                            }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Difficulty Level</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {isMCQOnly && (
                                <FormField
                                    control={form.control}
                                    name="numQuestions"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of Questions: {field.value}</FormLabel>
                                            <FormControl>
                                                <Slider
                                                    min={1}
                                                    max={Math.min(parseInt(totalMarks) || 200, 200)}
                                                    step={1}
                                                    value={[field.value]}
                                                    onValueChange={(value) => field.onChange(value[0])}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                 Max questions is limited by Total Marks.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start px-0">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Advanced Settings
                                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isAdvancedOpen && "rotate-180")} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-6 pt-4">
                                     <FormField
                                        control={form.control}
                                        name="isSectionWise"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/50">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">Section Wise Generation</FormLabel>
                                                    <FormDescription>
                                                        Manually define the number of questions for each section.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                    checked={field.value}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked);
                                                        if (checked) form.setValue('isMCQOnly', false);
                                                    }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    {isSectionWise && (
                                        <div className="p-4 border rounded-lg space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="numMCQs" render={({ field }) => (<FormItem><FormLabel>No. of MCQs (1 Mark)</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 10" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name="num1Mark" render={({ field }) => (<FormItem><FormLabel>No. of 1-Mark Qs</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 5" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name="num2Mark" render={({ field }) => (<FormItem><FormLabel>No. of 2-Mark Qs</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 5" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name="num3Mark" render={({ field }) => (<FormItem><FormLabel>No. of 3-Mark Qs</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 5" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name="num4Mark" render={({ field }) => (<FormItem><FormLabel>No. of 4-Mark Qs</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 5" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>)} />
                                            </div>
                                             <Separator />
                                            <div className="flex justify-between items-center text-sm font-medium">
                                                <span>Marks Accounted For:</span>
                                                <span className={cn(remainingMarks < 0 ? "text-destructive" : "text-primary")}>{accountedMarks}</span>
                                            </div>
                                             <div className="flex justify-between items-center text-sm font-medium">
                                                <span>Remaining Marks:</span>
                                                <span className={cn(remainingMarks < 0 ? "text-destructive" : "")}>{remainingMarks}</span>
                                            </div>
                                            {form.formState.errors.isSectionWise && (
                                                <Alert variant="destructive">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle>Marks Mismatch</AlertTitle>
                                                    <AlertDescription>
                                                        {form.formState.errors.isSectionWise.message}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    )}

                                     <FormField
                                        control={form.control}
                                        name="includePYQs"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Include PYQs</FormLabel>
                                                    <FormDescription>
                                                        Incorporate Previous Year Questions and competitive patterns.
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
                                    <FormField
                                        control={form.control}
                                        name="useOriginalQuestions"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Use AI-Generated Original Questions</FormLabel>
                                                    <FormDescription>
                                                        Create new practice questions that follow the curriculum.
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
                                    <FormField
                                        control={form.control}
                                        name="competencyPercentage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Competency-Based Questions: {field.value || 0}%</FormLabel>
                                                <FormControl>
                                                    <Slider
                                                        min={0}
                                                        max={100}
                                                        step={10}
                                                        defaultValue={[field.value || 50]}
                                                        onValueChange={(value) => field.onChange(value[0])}
                                                        disabled={isMCQOnly}
                                                    />
                                                </FormControl>
                                                <FormDescription>Set the percentage of competency-based questions in the paper.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="generateBlueprint"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Generate Exam Blueprint</FormLabel>
                                                    <FormDescription>
                                                        Create a blueprint table of the exam structure.
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
                                </CollapsibleContent>
                            </Collapsible>
                            
                             <FormField
                                control={form.control}
                                name="addAnswerKey"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Add Detailed Answer Key</FormLabel>
                                            <FormDescription>
                                                Generate a "topper-style" solved answer sheet.
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
                            
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? "Generating..." : "Generate Exam Paper"}
                                <ClipboardPen className="ml-2 w-4 h-4" />
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px] flex flex-col bg-muted/30">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Generated Content</CardTitle>
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
                     <CardDescription>
                        {result ? "Your AI-generated paper is ready." : "Your paper will appear here."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 min-h-0 items-center justify-center">
                    {isLoading && (
                        <div className="w-full max-w-md text-center">
                            <PrintingAnimation />
                            <p className="mt-2 text-sm text-muted-foreground animate-pulse">
                                AI is creating your exam paper...
                            </p>
                        </div>
                    )}
                    {result && !isLoading && (
                        <Tabs defaultValue="paper" onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="paper">Question Paper</TabsTrigger>
                                <TabsTrigger value="key" disabled={!result.answerKeyContent}>Answer Key</TabsTrigger>
                                <TabsTrigger value="blueprint" disabled={!result.blueprintContent}><LayoutGrid className="mr-2 h-4 w-4" />Blueprint</TabsTrigger>
                            </TabsList>
                            <TabsContent value="paper" className="flex-1 mt-2 min-h-0">
                                <ScrollArea className="h-full w-full rounded-md border">
                                    <style>
                                        {`
                                        .instructions-block, .instructions-block * {
                                            font-weight: bold !important;
                                        }
                                        `}
                                    </style>
                                    <div 
                                        id="printable-exam" 
                                        className="prose prose-sm sm:prose-base max-w-none font-serif p-8 bg-white text-black"
                                    >
                                        <div className="header-content" dangerouslySetInnerHTML={{ __html: header.replace(/<p>----------<\/p>/gi, '') }}></div>
                                        {instructions && (
                                            <div className="instructions-block my-12" dangerouslySetInnerHTML={{ __html: instructions }}></div>
                                        )}
                                        <div className="question-list space-y-2 divide-y divide-dashed">
                                            {questions.map((q, index) => (
                                                <div key={index} className="question-item flex justify-between items-start gap-4 pt-4">
                                                    {q.number ? (
                                                        <>
                                                            <div className="question-item-text flex-grow flex gap-2">
                                                              <span className="font-bold">{q.number}.</span>
                                                              <div className="inline" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                            </div>
                                                            <div className="question-item-marks font-bold shrink-0">
                                                                {q.marks}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full font-bold" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="key" className="flex-1 mt-2 min-h-0">
                                 <ScrollArea className="h-full w-full rounded-md border">
                                    <div
                                        id="printable-key" 
                                        className={cn("prose prose-sm sm:prose-base max-w-none p-8 bg-white text-black font-patrick-hand")}
                                        dangerouslySetInnerHTML={{ __html: keyHtml }}
                                    >
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                             <TabsContent value="blueprint" className="flex-1 mt-2 min-h-0">
                                 <ScrollArea className="h-full w-full rounded-md border">
                                    <div
                                        id="printable-blueprint" 
                                        className="prose prose-sm sm:prose-base max-w-none p-8 bg-white text-black"
                                        dangerouslySetInnerHTML={{ __html: blueprintHtml }}
                                    >
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    )}
                    {!isLoading && !result && (
                        <div className="w-full h-full flex items-center justify-center text-center text-muted-foreground p-8 rounded-md border bg-background">
                            <p>Fill in the details to generate a custom exam paper based on your selected curriculum.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

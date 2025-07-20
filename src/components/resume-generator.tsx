
"use client";

import { useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles, CloudUpload, FileDown } from "lucide-react";
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
import { generateResume, GenerateResumeInput, GenerateResumeOutput } from "@/ai/flows/generate-resume";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";


const formSchema = z.object({
  skills: z.string().min(10, {
    message: "Skills section must not be empty.",
  }),
  experience: z.string().min(20, {
    message: "Experience section must not be empty.",
  }),
});

export function ResumeGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<GenerateResumeOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const resumeRef = useRef<HTMLDivElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            skills: "",
            experience: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const output = await generateResume(values as GenerateResumeInput);
            setResult(output);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to generate resume. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!resumeRef.current) return null;
        const canvas = await html2canvas(resumeRef.current, { scale: 2, backgroundColor: '#ffffff' });
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
        toast({ title: "Preparing Download...", description: "Your resume is being converted to PDF." });
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'resume.pdf';
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
            description: "Your resume is being saved.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            const fileName = `Resume_${new Date().toISOString()}.pdf`;
            await uploadDocument(user.uid, fileName, blob);
            toast({
                title: "Saved to Cloud!",
                description: "Your resume has been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your resume. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Resume Generator</CardTitle>
                    <CardDescription>
                        Create a professional resume tailored to your skills and experience.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="skills"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Skills</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="e.g., JavaScript, React, Node.js, Project Management, Public Speaking..."
                                                className="min-h-[120px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            List your skills, separated by commas.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="experience"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Experience</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe your work experience, projects, and achievements..."
                                                className="min-h-[150px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Provide details about your professional background.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? "Generating..." : "Generate Resume"}
                                <Sparkles className="ml-2 w-4 h-4" />
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px] flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Generated Resume Draft</CardTitle>
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
                    <CardDescription>Your AI-generated resume will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                         <div className="space-y-4">
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/2" />
                            <br/>
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <br/>
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    )}
                    {result && (
                        <div ref={resumeRef} className="prose prose-sm sm:prose-base dark:prose-invert max-w-none whitespace-pre-wrap bg-white dark:bg-card p-4 rounded-md">
                            {result.resumeDraft}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

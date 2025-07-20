
"use client";

import { useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DraftingCompass, Wand2, Sparkles, List, Lightbulb, Settings, Image as ImageIcon, Download, AlertTriangle, Cog, FileDown, Gem, CloudUpload } from "lucide-react";
import { marked } from "marked";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateProjectBlueprint, GenerateProjectBlueprintInput, GenerateProjectBlueprintOutput } from "@/ai/flows/generate-project-blueprint";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Slider } from "./ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";

const qualityLevels = ['medium', 'high', 'ultra', 'max'] as const;
const qualityLevelEnum = z.enum(qualityLevels);

const formSchema = z.object({
  projectPrompt: z.string().min(10, {
    message: "Project description must be at least 10 characters.",
  }),
  qualityLevel: qualityLevelEnum.default('high'),
});

function EngineeringAnimation() {
    return (
        <div className="relative w-64 h-48 flex items-center justify-center">
            {/* Gears */}
            <Cog className="absolute w-16 h-16 text-muted-foreground/50 animate-spin" style={{ animationDuration: '10s' }} />
            <Cog className="absolute w-12 h-12 top-8 left-16 text-muted-foreground/40 animate-spin-reverse" style={{ animationDuration: '8s' }} />
            <Cog className="absolute w-10 h-10 bottom-10 right-16 text-muted-foreground/30 animate-spin" style={{ animationDuration: '12s' }} />
            
            {/* Blueprint Paper */}
             <div className="relative w-56 h-40 bg-card rounded-md shadow-lg overflow-hidden border">
                <div className="absolute inset-0 bg-blue-500/10 grid grid-cols-10 grid-rows-10">
                    {Array.from({ length: 100 }).map((_, i) => (
                        <div key={i} className="border-r border-b border-blue-500/10"></div>
                    ))}
                </div>
                 <div className="absolute inset-0 p-4 space-y-2">
                    <div className="h-4 w-3/4 bg-primary/50 rounded-sm animate-print-lines" style={{ animationDelay: '0.5s' }} />
                    <div className="h-3 w-1/2 bg-muted-foreground/30 rounded-sm animate-print-lines" style={{ animationDelay: '1s' }} />
                    <div className="h-10 w-full bg-muted-foreground/20 rounded-sm animate-print-lines" style={{ animationDelay: '1.2s' }} />
                </div>
            </div>
        </div>
    );
}


export function ProjectBlueprintGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [result, setResult] = useState<GenerateProjectBlueprintOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const blueprintContentRef = useRef<HTMLDivElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectPrompt: "",
            qualityLevel: "high",
        },
    });

    const qualityValue = form.watch('qualityLevel');

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        setProgress(0);
        setProgressLabel("Initializing...");

        try {
            // Simulate staged progress
            setProgress(10);
            setProgressLabel("Warming up the engineering AI...");

            const generationPromise = generateProjectBlueprint(values as GenerateProjectBlueprintInput);

            const progressInterval = setInterval(() => {
                setProgress(p => {
                    if (p >= 90) { 
                        clearInterval(progressInterval);
                        return p;
                    }
                     if (p < 50) setProgressLabel("Generating textual content...");
                     else setProgressLabel("Creating SVG blueprint...");
                    return p + 7;
                });
            }, 800);

            const output = await generationPromise;
            clearInterval(progressInterval);

            setProgress(100);
            setProgressLabel("Blueprint generated!");
            setResult(output);

        } catch (error) {
            console.error(error);
            setProgress(0);
            setProgressLabel("Error!");
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to generate project blueprint. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleDownloadSvg = () => {
        if (!result?.svgBlueprint) return;
        const blob = new Blob([result.svgBlueprint], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'project-blueprint.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Your blueprint is being downloaded as an SVG." });
    }

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (!blueprintContentRef.current) return null;
        const canvas = await html2canvas(blueprintContentRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: null, // Use element's background
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

    const handleDownloadPdf = async () => {
        toast({ title: "Preparing PDF...", description: "Please wait while we generate your document." });
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'project-blueprint.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: "Download Complete!", description: "Your blueprint has been saved as a PDF." });
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
            description: "Your project blueprint is being saved.",
        });

        try {
            const blob = await generatePdfBlob();
            if (!blob) {
                 throw new Error("Failed to generate PDF blob for upload.");
            }
            const projectName = form.getValues('projectPrompt').substring(0, 30).replace(/\s/g, '_');
            const fileName = `Blueprint_${projectName}.pdf`;
            await uploadDocument(user.uid, fileName, blob);
            toast({
                title: "Saved to Cloud!",
                description: "Your blueprint has been successfully saved.",
            });
        } catch (error) {
             console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your blueprint. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };


    const materialsHtml = result ? marked.parse(result.materials) : "";
    const usesHtml = result ? marked.parse(result.uses) : "";
    const functionsHtml = result ? marked.parse(result.functions) : "";

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle>Project Blueprint Generator</CardTitle>
                    <CardDescription>
                        Describe any project, and the AI will generate a detailed plan, component list, and a 2D blueprint.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="projectPrompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project Idea</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., A simple rainwater harvesting system for a small garden" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Be as descriptive as you can for the best results.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="qualityLevel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <span className="flex items-center gap-2"><Gem /> Quality Level: <span className="font-bold capitalize">{qualityValue}</span></span>
                                        </FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={0}
                                                max={qualityLevels.length - 1}
                                                step={1}
                                                defaultValue={[qualityLevels.indexOf(field.value)]}
                                                onValueChange={(value) => field.onChange(qualityLevels[value[0]])}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Higher quality levels generate more detailed plans but take longer.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? (
                                    <>
                                        <Sparkles className="mr-2 w-4 h-4 animate-spin" />
                                        Engineering...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 w-4 h-4" />
                                        Generate Blueprint
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Generated Blueprint</CardTitle>
                        <CardDescription>A detailed project plan, including materials, uses, functions, and a 2D diagram.</CardDescription>
                    </div>
                    {result && !isLoading && (
                        <div className="flex gap-2">
                             <Button onClick={handleSaveToCloud} variant="secondary" disabled={!user || isUploading}>
                                <CloudUpload className="mr-2 h-4 w-4" />
                                {isUploading ? "Saving..." : "Save to Cloud"}
                            </Button>
                             <Button onClick={handleDownloadPdf}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6 min-h-[500px]">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 p-8">
                            <EngineeringAnimation />
                            <Progress value={progress} className="w-full max-w-sm" />
                            <p className="text-sm text-muted-foreground animate-pulse">{progressLabel} ({progress}%)</p>
                        </div>
                    )}
                    {result && !isLoading && (
                        <div ref={blueprintContentRef} className="bg-background p-4 rounded-lg">
                            <Accordion type="multiple" defaultValue={['materials', 'uses', 'functions']} className="w-full">
                                <AccordionItem value="materials">
                                    <AccordionTrigger className="font-headline text-lg"><List className="w-5 h-5 mr-2" /> Materials Required</AccordionTrigger>
                                    <AccordionContent>
                                        <div 
                                            className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                                            dangerouslySetInnerHTML={{ __html: materialsHtml }}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="uses">
                                    <AccordionTrigger className="font-headline text-lg"><Lightbulb className="w-5 h-5 mr-2" /> Uses & Applications</AccordionTrigger>
                                    <AccordionContent>
                                        <div 
                                            className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                                            dangerouslySetInnerHTML={{ __html: usesHtml }}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="functions">
                                    <AccordionTrigger className="font-headline text-lg"><Settings className="w-5 h-5 mr-2" /> How it Works</AccordionTrigger>
                                    <AccordionContent>
                                        <div 
                                            className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                                            dangerouslySetInnerHTML={{ __html: functionsHtml }}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                            <div className="space-y-4 pt-6">
                                 <h3 className="font-headline text-lg flex items-center"><ImageIcon className="w-5 h-5 mr-2" /> 2D Blueprint</h3>
                                 {result.svgBlueprint ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div 
                                            className="w-full max-w-3xl aspect-video rounded-lg overflow-hidden shadow-lg border bg-white p-4"
                                            dangerouslySetInnerHTML={{ __html: result.svgBlueprint }}
                                        />
                                        <Button onClick={handleDownloadSvg} variant="secondary">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Blueprint (SVG)
                                        </Button>
                                    </div>
                                 ) : (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Blueprint Generation Failed</AlertTitle>
                                        <AlertDescription>
                                            The AI was unable to generate a visual blueprint for this project. This can sometimes happen due to content safety filters or model limitations. Please try a different or more specific project idea.
                                        </AlertDescription>
                                    </Alert>
                                 )}
                            </div>
                        </div>
                    )}
                    {!isLoading && !result && (
                        <div className="w-full h-full flex items-center justify-center text-center text-muted-foreground p-8 rounded-md border-2 border-dashed min-h-[400px]">
                            <div>
                                <DraftingCompass className="w-16 h-16 mx-auto mb-4 text-primary/70" />
                                <h3 className="text-xl font-semibold mb-2">Your Project Blueprint Awaits</h3>
                                <p>Enter your project idea above, and the AI will generate a complete guide and a 2D diagram.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

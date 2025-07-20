
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Wand2, Sparkles, Download, Palette, Type, List, Info, CloudUpload } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { generateIllustration, GenerateIllustrationInput, GenerateIllustrationOutput } from "@/ai/flows/generate-illustration";
import { Slider } from "@/components/ui/slider";
import { PrintingAnimation } from "./printing-animation";
import { Input } from "./ui/input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { uploadDocument } from "@/services/storage";


const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  numItems: z.number().min(2).max(10).default(4),
  colorPalette: z.enum(['vibrant', 'professional', 'pastel', 'monochromatic']).default('vibrant'),
});

type FormSchemaType = z.infer<typeof formSchema>;

export function IllustrationGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<GenerateIllustrationOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            numItems: 4,
            colorPalette: 'vibrant',
        },
    });

    async function onSubmit(values: FormSchemaType) {
        setIsLoading(true);
        setResult(null);
        try {
            const output = await generateIllustration(values as GenerateIllustrationInput);
            setResult(output);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to generate illustration. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleDownload = () => {
        if (!result?.imageDataUri) return;
        const link = document.createElement('a');
        link.href = result.imageDataUri;
        link.download = 'illustration.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Download Started", description: "Your illustration is being downloaded." });
    }

    const dataUriToBlob = (dataURI: string): Blob => {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    const handleSaveToCloud = async () => {
        if (!result?.imageDataUri) return;
        if (!user) {
            toast({
                variant: "destructive",
                title: "Login Required",
                description: "You must be signed in to save illustrations to the cloud.",
            });
            return;
        }

        setIsUploading(true);
        toast({
            title: "Uploading to Cloud...",
            description: "Your illustration is being saved.",
        });

        try {
            const blob = dataUriToBlob(result.imageDataUri);
            const title = form.getValues('title').replace(/\s/g, '_');
            const fileName = `illustration_${title}_${new Date().toISOString()}.png`;
            
            await uploadDocument(user.uid, fileName, blob);
            
            toast({
                title: "Saved to Cloud!",
                description: "Your illustration has been successfully saved.",
            });
        } catch (error) {
            console.error("Cloud upload failed:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Could not save your illustration. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Illustration Studio</CardTitle>
                    <CardDescription>
                        Create beautiful diagrams and infographics with AI.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Type /> Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 4 Steps to Success" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                           Description
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs">
                                                            Describe the process or data you want to visualize. 
                                                            Be specific! For example: "A roadmap showing the 4 stages of our project: Discovery, Design, Development, and Deployment."
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe the process or data to visualize..."
                                                className="min-h-[120px]"
                                                {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="colorPalette"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Palette /> Color Palette</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a palette" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="vibrant">Vibrant</SelectItem>
                                                <SelectItem value="professional">Professional</SelectItem>
                                                <SelectItem value="pastel">Pastel</SelectItem>
                                                <SelectItem value="monochromatic">Monochromatic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="numItems"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><List /> Number of Items: {field.value}</FormLabel>
                                            <FormControl>
                                                <Slider
                                                    min={2}
                                                    max={10}
                                                    step={1}
                                                    defaultValue={[field.value]}
                                                    onValueChange={(value) => field.onChange(value[0])}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                             
                            <div className="glowing-border">
                                <Button type="submit" disabled={isLoading} className="w-full p-0" variant="ghost">
                                    <div className="w-full h-full flex items-center justify-center bg-background rounded-md">
                                        <span className="flex items-center gap-2 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 text-transparent bg-clip-text font-bold text-lg">
                                            <Wand2 className="h-5 w-5" strokeWidth={2.5} />
                                            {isLoading ? "Generating..." : "Generate Illustration"}
                                            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
                                        </span>
                                    </div>
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px] flex flex-col bg-muted/30">
                <CardHeader>
                    <CardTitle>Generated Illustration</CardTitle>
                    <CardDescription>Your AI-generated illustration will appear here.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 min-h-0 items-center justify-center">
                    {isLoading && (
                        <div className="w-full max-w-md text-center">
                            <PrintingAnimation />
                            <p className="mt-2 text-sm text-muted-foreground animate-pulse">
                                The AI is designing your illustration...
                            </p>
                        </div>
                    )}
                    {result && result.imageDataUri && !isLoading && (
                         <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg border bg-background">
                                <Image
                                    src={result.imageDataUri}
                                    alt="Generated Illustration"
                                    layout="fill"
                                    objectFit="contain"
                                    data-ai-hint="infographic diagram"
                                />
                            </div>
                             <div className="flex gap-2 justify-center">
                                <Button onClick={handleDownload}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PNG
                                </Button>
                                <Button onClick={handleSaveToCloud} disabled={!user || isUploading} variant="secondary">
                                    <CloudUpload className="mr-2 h-4 w-4" />
                                    {isUploading ? "Saving..." : "Save to Cloud"}
                                </Button>
                            </div>
                        </div>
                    )}
                    {!isLoading && !result && (
                        <div className="w-full h-full flex items-center justify-center text-center text-muted-foreground p-8">
                            <p>Describe your data or process, and the AI will create a beautiful visualization for you.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

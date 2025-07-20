"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles } from "lucide-react";

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
import { analyzeDocument, AnalyzeDocumentInput, AnalyzeDocumentOutput } from "@/ai/flows/analyze-document";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";


const formSchema = z.object({
  documentContent: z.string().min(50, {
    message: "Document content must be at least 50 characters.",
  }),
  userQuestion: z.string().min(5, {
    message: "Question must be at least 5 characters.",
  }),
});

export function DocumentAnalyzer() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AnalyzeDocumentOutput | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            documentContent: "",
            userQuestion: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const output = await analyzeDocument(values as AnalyzeDocumentInput);
            setResult(output);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to analyze document. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Document Analyzer</CardTitle>
                    <CardDescription>
                        Get summaries and answers from your documents instantly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="documentContent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Document Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Paste the text from your document here..."
                                                className="min-h-[200px]"
                                                {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            You can paste content from TXT, DOCX, or PDF files.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="userQuestion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Question</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., What are the main conclusions?" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Ask something specific about the document.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? "Analyzing..." : "Analyze Document"}
                                <Sparkles className="ml-2 w-4 h-4" />
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card className="min-h-[600px]">
                <CardHeader>
                    <CardTitle>Analysis Result</CardTitle>
                    <CardDescription>The summary and answer will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="space-y-6">
                            <div>
                                <Skeleton className="h-5 w-1/3 mb-2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full mt-2" />
                            </div>
                             <div>
                                <Skeleton className="h-5 w-1/3 mb-2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3 mt-2" />
                            </div>
                        </div>
                    )}
                    {result && (
                       <Accordion type="single" collapsible defaultValue="summary" className="w-full">
                            <AccordionItem value="summary">
                                <AccordionTrigger className="font-headline">Summary</AccordionTrigger>
                                <AccordionContent>
                                    <p className="whitespace-pre-wrap">{result.summary}</p>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="answer">
                                <AccordionTrigger className="font-headline">Answer to your Question</AccordionTrigger>
                                <AccordionContent>
                                    <p className="whitespace-pre-wrap">{result.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

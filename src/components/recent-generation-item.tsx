
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnyRecentGeneration } from "@/hooks/use-recent-generations";
import { formatDistanceToNow } from 'date-fns';
import { FileText, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentGenerationItemProps {
    item: AnyRecentGeneration;
    onSelect: (item: AnyRecentGeneration) => void;
}

const getIcon = (type: AnyRecentGeneration['type']) => {
    switch (type) {
        case 'document':
            return <FileText className="w-6 h-6 text-purple-500" />;
        // Add other cases here for other generation types
        default:
            return <FileText className="w-6 h-6 text-gray-500" />;
    }
}

export function RecentGenerationItem({ item, onSelect }: RecentGenerationItemProps) {
    const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        // This is a placeholder. The actual download logic is in the viewer dialog
        // to ensure the content is rendered for PDF generation.
        // We open the viewer, and the user can download from there.
        onSelect(item);
    };

    return (
        <Card 
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col"
            onClick={() => onSelect(item)}
        >
            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    {getIcon(item.type)}
                </div>
                <div className="flex-1">
                    <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                    <CardDescription className="text-xs">{timeAgo}</CardDescription>
                </div>
            </CardHeader>
            <CardFooter className="mt-auto flex justify-end gap-2 p-2 pt-0">
                <Button size="sm" variant="ghost" onClick={() => onSelect(item)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Download
                </Button>
            </CardFooter>
        </Card>
    )
}

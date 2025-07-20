import { FileText } from 'lucide-react';

export function PrintingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <div className="w-64 h-48 bg-card-foreground/10 rounded-lg p-4 flex flex-col items-center">
        {/* Printer body */}
        <div className="w-full h-8 bg-muted rounded-t-md border-b-4 border-muted-foreground/50"></div>
        <div className="w-5/6 h-4 bg-muted-foreground/20 rounded-b-md"></div>
        
        {/* Paper slot */}
        <div className="w-4/5 h-2 bg-background mt-2"></div>

        {/* Animated Paper */}
        <div className="w-4/5 h-32 mt-[-1rem] overflow-hidden">
          <div className="w-full h-full bg-card rounded-md shadow-lg animate-print-paper p-2">
            <div className="space-y-1.5">
              <div className="h-2 w-1/3 bg-primary/50 rounded-sm animate-print-lines" style={{ animationDelay: '0.5s' }} />
              <div className="h-1.5 w-full bg-muted-foreground/30 rounded-sm animate-print-lines" style={{ animationDelay: '1s' }} />
              <div className="h-1.5 w-5/6 bg-muted-foreground/30 rounded-sm animate-print-lines" style={{ animationDelay: '1.2s' }} />
              <div className="h-1.5 w-full bg-muted-foreground/30 rounded-sm animate-print-lines" style={{ animationDelay: '1.4s' }} />
              <div className="h-1.5 w-3/4 bg-muted-foreground/30 rounded-sm animate-print-lines" style={{ animationDelay: '1.6s' }} />
              <div className="h-1.5 w-full bg-muted-foreground/30 rounded-sm animate-print-lines" style={{ animationDelay: '1.8s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

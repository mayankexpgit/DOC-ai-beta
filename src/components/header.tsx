
"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Menu, UserCircle, HelpCircle, Bot, Info, Settings, LogIn, ArrowLeft, LogOut } from "lucide-react";

type Tool = 'dashboard' | 'docs' | 'slides' | 'resume' | 'analyzer' | 'settings' | 'illustrations' | 'exam' | 'notes' | 'solver' | 'blueprint' | 'handwriting' | 'editor';

interface AppHeaderProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

export function AppHeader({ activeTool, setActiveTool }: AppHeaderProps) {
  const { user, signIn, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader className="text-left">
            <SheetTitle>DOC AI</SheetTitle>
            <SheetDescription>
              Your intelligent assistant for documents and presentations.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <Button variant="ghost" className="justify-start gap-2">
              <HelpCircle className="h-4 w-4" />
              How to use
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Bot className="h-4 w-4" />
              Tools Introduction
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Info className="h-4 w-4" />
              Feedback
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      
      <div className="flex-1">
        {activeTool !== 'dashboard' && (
            <Button variant="ghost" onClick={() => setActiveTool('dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user ? user.displayName : "Guest Account"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveTool('settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={signIn}>
              <LogIn className="mr-2 h-4 w-4" />
              <span>Login</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

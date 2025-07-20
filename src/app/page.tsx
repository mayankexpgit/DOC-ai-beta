
"use client";

import { useState } from 'react';
import {
  FileText,
  ScanText,
  User,
  Home as HomeIcon,
  Cog,
  BarChartHorizontal,
  LogOut,
  FolderArchive,
  ClipboardPen,
  FileSignature,
  BookOpenCheck,
  DraftingCompass,
  PenSquare,
  FileEdit,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import { Logo } from '@/components/icons';
import { Dashboard } from '@/components/dashboard';
import { DocumentGenerator } from '@/components/document-generator';
import { ResumeGenerator } from '@/components/resume-generator';
import { DocumentAnalyzer } from '@/components/document-analyzer';
import { IllustrationGenerator } from '@/components/illustration-generator';
import { ExamPaperGenerator } from '@/components/exam-paper-generator';
import { ShortNotesGenerator } from '@/components/short-notes-generator';
import { BookletSolver } from '@/components/booklet-solver';
import { AppHeader } from '@/components/header';
import { SettingsPage } from '@/components/settings';
import { AiAssistant } from '@/components/ai-assistant';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ProjectBlueprintGenerator } from '@/components/project-blueprint-generator';
import { HandwritingConverter } from '@/components/handwriting-converter';
import { ProfessionalDocumentEditor } from '@/components/professional-document-editor';

type Tool = 'dashboard' | 'docs' | 'resume' | 'analyzer' | 'settings' | 'illustrations' | 'storage' | 'exam' | 'notes' | 'solver' | 'blueprint' | 'handwriting' | 'editor';

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>('dashboard');
  const { user, signOut } = useAuth();

  const renderTool = () => {
    switch (activeTool) {
      case 'dashboard':
        return <Dashboard setActiveTool={setActiveTool} />;
      case 'docs':
        return <DocumentGenerator />;
      case 'resume':
        return <ResumeGenerator />;
      case 'analyzer':
        return <DocumentAnalyzer />;
      case 'illustrations':
        return <IllustrationGenerator />;
      case 'exam':
        return <ExamPaperGenerator />;
      case 'notes':
        return <ShortNotesGenerator />;
      case 'solver':
        return <BookletSolver />;
      case 'blueprint':
        return <ProjectBlueprintGenerator />;
      case 'handwriting':
        return <HandwritingConverter />;
      case 'editor':
        return <ProfessionalDocumentEditor />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard setActiveTool={setActiveTool} />;
    }
  };

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">DOC AI</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('dashboard')}
                isActive={activeTool === 'dashboard'}
                tooltip="Dashboard"
              >
                <HomeIcon/>
                <span className='font-headline'>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('docs')}
                isActive={activeTool === 'docs'}
                tooltip="Document Generator"
              >
                <FileText />
                <span className='font-headline'>Documents</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('exam')}
                isActive={activeTool === 'exam'}
                tooltip="Exam Paper Generator"
              >
                <ClipboardPen />
                <span className='font-headline'>Exam Papers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('notes')}
                isActive={activeTool === 'notes'}
                tooltip="Short Notes Generator"
              >
                <FileSignature />
                <span className='font-headline'>Short Notes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('handwriting')}
                isActive={activeTool === 'handwriting'}
                tooltip="AI Handwritten Notes"
              >
                <PenSquare />
                <span className='font-headline'>Handwritten</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('editor')}
                isActive={activeTool === 'editor'}
                tooltip="AI Document Editor"
              >
                <FileEdit />
                <span className='font-headline'>AI Editor</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('solver')}
                isActive={activeTool === 'solver'}
                tooltip="Booklet Solver"
              >
                <BookOpenCheck />
                <span className='font-headline'>Booklet Solver</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('blueprint')}
                isActive={activeTool === 'blueprint'}
                tooltip="Project Blueprints"
              >
                <DraftingCompass />
                <span className='font-headline'>Blueprints</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('resume')}
                isActive={activeTool === 'resume'}
                tooltip="Resume Generator"
              >
                <User />
                <span className='font-headline'>Resumes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('analyzer')}
                isActive={activeTool === 'analyzer'}
                tooltip="Document Analyzer"
              >
                <ScanText />
                <span className='font-headline'>Analyzer</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton
                onClick={() => setActiveTool('illustrations')}
                isActive={activeTool === 'illustrations'}
                tooltip="Illustration Studio"
              >
                <BarChartHorizontal />
                <span className='font-headline'>Illustrations</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveTool('storage')}
                isActive={activeTool === 'storage'}
                tooltip="Cloud Storage"
                disabled
              >
                <FolderArchive />
                <span className='font-headline'>Storage</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <Separator />
        <SidebarContent>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => setActiveTool('settings')}
                        isActive={activeTool === 'settings'}
                        tooltip="Settings"
                    >
                        <Cog />
                        <span className="font-headline">Settings</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 p-3">
            <Avatar>
              <AvatarImage src={user?.photoURL || "https://placehold.co/40x40"} data-ai-hint="user avatar" />
              <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm truncate">{user?.displayName || "Guest"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email || "user@doc.ai"}</span>
            </div>
            {user && (
              <Button variant="ghost" size="icon" onClick={signOut} className="ml-auto shrink-0">
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="min-h-svh flex flex-col">
          <AppHeader activeTool={activeTool} setActiveTool={setActiveTool} />
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {renderTool()}
          </div>
        </main>
      </SidebarInset>
      <AiAssistant />
    </SidebarProvider>
  );
}

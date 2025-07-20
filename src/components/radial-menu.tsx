
"use client";

import { useState } from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type Tool = 'dashboard' | 'docs' | 'resume' | 'analyzer' | 'illustrations' | 'storage' | 'exam' | 'notes' | 'solver' | 'blueprint' | 'handwriting';

interface ToolDefinition {
  name: string;
  description: string;
  icon: LucideIcon;
  tool: Tool;
  color: string;
  bgColor: string;
  gradient: string;
}

interface RadialMenuProps {
  tools: ToolDefinition[];
  setActiveTool: (tool: Tool) => void;
}

export function RadialMenu({ tools, setActiveTool }: RadialMenuProps) {
    const [rotation] = useState(0);

    const radius = 160; // in pixels
    const numTools = tools.length;
    const angleStep = (2 * Math.PI) / numTools;

    return (
        <div 
            className="relative w-96 h-96 flex items-center justify-center"
        >
            <div 
                className="absolute w-full h-full animate-radial-spin"
                style={{
                    transform: `rotate(${rotation}deg)`,
                    animationDuration: '80s'
                }}
            >
                {tools.map((tool, index) => {
                    const angle = index * angleStep;
                    const x = radius * Math.cos(angle);
                    const y = radius * Math.sin(angle);

                    return (
                        <TooltipProvider key={tool.tool} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setActiveTool(tool.tool)}
                                        className={cn(
                                            "absolute w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out cursor-pointer",
                                            "shadow-lg z-10 hover:scale-110 hover:z-20",
                                            tool.bgColor
                                        )}
                                        style={{
                                            top: `calc(50% - 40px)`,
                                            left: `calc(50% - 40px)`,
                                            transform: `translate(${x}px, ${y}px) rotate(${-rotation}deg)`,
                                        }}
                                        aria-label={tool.name}
                                    >
                                        <tool.icon className={cn("w-10 h-10", tool.color)} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                    <p>{tool.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>

            {/* Central Decorative Element */}
            <div className="absolute w-40 h-40 bg-card rounded-full flex flex-col items-center justify-center text-center p-4 shadow-inner border animate-create-glow group">
                 <div className="absolute inset-0 rounded-full bg-primary/10 transition-opacity opacity-0 group-hover:opacity-100 duration-500"></div>
                 <div className="relative z-10 flex flex-col items-center">
                    <Sparkles className="w-12 h-12 text-primary icon-glow transition-transform duration-500 group-hover:scale-110" />
                </div>
            </div>

            {/* Decorative Rings */}
            <div 
                className="absolute w-80 h-80 rounded-full border border-dashed border-primary/20 animate-spin-reverse [animation-duration:60s]"
            ></div>
            <div 
                className="absolute w-[26rem] h-[26rem] rounded-full border border-dotted border-secondary/20 animate-radial-spin [animation-duration:80s]"
            ></div>
        </div>
    );
}

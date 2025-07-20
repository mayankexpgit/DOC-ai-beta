
'use server';
/**
 * @fileOverview An AI-powered project blueprint generator.
 *
 * - generateProjectBlueprint - A function that handles the blueprint generation process.
 * - GenerateProjectBlueprintInput - The input type for the generateProjectBlueprint function.
 * - GenerateProjectBlueprintOutput - The return type for the generateProjectBlueprint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateBlueprintSvg } from './generate-blueprint-svg';

const GenerateProjectBlueprintInputSchema = z.object({
  projectPrompt: z.string().describe("A description of the project idea, e.g., 'a solar-powered street light' or 'a simple rainwater harvesting system'."),
  qualityLevel: z.enum(['medium', 'high', 'ultra', 'max']).default('high').describe('The quality level for the document generation.'),
});
export type GenerateProjectBlueprintInput = z.infer<typeof GenerateProjectBlueprintInputSchema>;

const GenerateProjectBlueprintOutputSchema = z.object({
  materials: z.string().describe("A comprehensive, A-to-Z list of all materials and components required for the project. Format as a markdown bulleted list."),
  uses: z.string().describe("A paragraph describing the uses, applications, and benefits of the project."),
  functions: z.string().describe("A detailed, step-by-step explanation of how the project works, from start to finish. Format as a markdown numbered list."),
  svgBlueprint: z.string().optional().describe("The SVG code for the generated 2D blueprint diagram."),
});
export type GenerateProjectBlueprintOutput = z.infer<typeof GenerateProjectBlueprintOutputSchema>;

export async function generateProjectBlueprint(input: GenerateProjectBlueprintInput): Promise<GenerateProjectBlueprintOutput> {
  // We are not creating a flow here because we want to stream progress back to the client.
  // This function will be called directly.
  // For a real implementation, you would use a streaming API (e.g., WebSockets, Server-Sent Events)
  // to send progress updates. Here, we simulate it with stages.
  return generateProjectBlueprintFlow(input);
}

const textGenerationPrompt = ai.definePrompt({
  name: 'generateProjectBlueprintTextPrompt',
  input: {schema: GenerateProjectBlueprintInputSchema},
  output: {schema: z.object({
      materials: GenerateProjectBlueprintOutputSchema.shape.materials,
      uses: GenerateProjectBlueprintOutputSchema.shape.uses,
      functions: GenerateProjectBlueprintOutputSchema.shape.functions,
  })},
  prompt: `You are a senior project engineer and technical writer. A user wants to build a project. Your task is to provide a complete guide with structured data. Use clear and basic names for all components.

The requested quality level for this generation is '{{{qualityLevel}}}'. You MUST adhere to this level.
- **Medium**: Generate a standard, useful plan. The materials list should be detailed, and the functions should cover the main operational steps. Good for a quick overview.
- **High**: Generate a very comprehensive and detailed plan. The materials list should include some specifications (e.g., voltage for electronics, dimensions for parts). The functional description should be more elaborate.
- **Ultra**: Generate an exhaustive, professional-grade plan. The materials list must be exceptionally detailed, including potential part numbers, material types (e.g., "304 Stainless Steel Screws"), and specific component ratings. The functional description must be a fine-grained, step-by-step guide covering every aspect of the project's operation from start to finish.
- **Max**: Generate an exceptionally detailed, manufacturing-level plan. This is the highest level of detail possible. The materials list should be near-BOM (Bill of Materials) quality. The functional description should be a meticulous, multi-stage explanation covering assembly, operation, and maintenance. The plan should anticipate potential issues and provide solutions.

**User's Project Idea:** {{{projectPrompt}}}
**Quality Level:** {{{qualityLevel}}}

**Your Instructions:**

1.  **Materials List:** Based on the quality level, create a detailed, A-to-Z list of every single component and material required.
2.  **Uses Section:** Write a clear paragraph explaining the practical uses and benefits of this project.
3.  **Functions Section:** Based on the quality level, write a detailed, step-by-step numbered list explaining exactly how the project functions.

Generate the content for these three sections with maximum precision and high detail according to the specified quality level.
`,
});


const generateProjectBlueprintFlow = ai.defineFlow(
  {
    name: 'generateProjectBlueprintFlow',
    inputSchema: GenerateProjectBlueprintInputSchema,
    outputSchema: GenerateProjectBlueprintOutputSchema,
  },
  async (input) => {
    // Stage 1: Generate the textual content
    const {output: textOutput} = await textGenerationPrompt(input);
    if (!textOutput) {
      throw new Error('Failed to generate project blueprint content.');
    }

    // Stage 2: Generate the SVG blueprint based on the text content
    let svgBlueprint: string | undefined;
    try {
      const svgOutput = await generateBlueprintSvg({
        projectPrompt: input.projectPrompt,
        materials: textOutput.materials,
        functions: textOutput.functions,
        qualityLevel: input.qualityLevel,
      });
      svgBlueprint = svgOutput.svgCode;
    } catch(e) {
      console.error("SVG blueprint generation failed:", e);
      // Non-fatal, we can still return the text content.
    }
    
    return {
      ...textOutput,
      svgBlueprint: svgBlueprint,
    };
  }
);

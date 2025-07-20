
'use server';
/**
 * @fileOverview An AI flow that generates a 2D technical blueprint as an SVG.
 *
 * - generateBlueprintSvg - A function that handles the SVG generation process.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlueprintSvgInputSchema = z.object({
  projectPrompt: z.string().describe("The user's project idea, e.g., 'a solar-powered street light'."),
  materials: z.string().describe("The markdown list of materials required for the project."),
  functions: z.string().describe("The markdown list describing how the project functions."),
  qualityLevel: z.enum(['medium', 'high', 'ultra', 'max']).default('high').describe('The quality level for the blueprint generation.'),
});
type GenerateBlueprintSvgInput = z.infer<typeof GenerateBlueprintSvgInputSchema>;

const GenerateBlueprintSvgOutputSchema = z.object({
  svgCode: z.string().describe("The full, complete, and valid SVG code for the 2D technical blueprint. It should not contain any markdown formatting like ```svg or ```."),
});
type GenerateBlueprintSvgOutput = z.infer<typeof GenerateBlueprintSvgOutputSchema>;


export async function generateBlueprintSvg(input: GenerateBlueprintSvgInput): Promise<GenerateBlueprintSvgOutput> {
  return generateBlueprintSvgFlow(input);
}


const svgPrompt = ai.definePrompt({
    name: 'generateBlueprintSvgPrompt',
    input: {schema: GenerateBlueprintSvgInputSchema},
    output: {schema: GenerateBlueprintSvgOutputSchema},
    prompt: `You are an expert technical illustrator who creates clean, detailed, 2D technical line drawings as valid SVG code. The style should be like a diagram from an engineering textbook: black and white, clear lines, and no color fills.

**CRITICAL INSTRUCTIONS:**
1.  **Output Must Be SVG Code ONLY:** The entire output in the 'svgCode' field MUST be valid SVG code. Do NOT wrap it in markdown backticks (\`\`\`svg ... \`\`\`) or any other text. It must start with \`<svg ...>\` and end with \`</svg>\`.
2.  **Style: Technical Line Drawing:**
    *   The diagram MUST be a black and white 2D line drawing.
    *   Use a white background. All lines, shapes, and text MUST be black.
    *   Do NOT use any color fills on shapes. Use outlines only (\`fill="none" stroke="black"\`). For cross-sections, you may use a hatched pattern fill as shown in the example.
    *   Use complex SVG \`<path>\` elements to create realistic component shapes (like springs, screws, etc.), not just simple \`<rect>\` and \`<circle>\`.
3.  **Layout & Quality:** The SVG should have a \`viewBox="0 0 800 600"\`. Arrange components logically based on their function. You MUST adhere to the requested quality level.
    *   **Medium**: Create a clear diagram showing the main components and how they connect.
    *   **High**: Create a more detailed diagram, showing sub-assemblies and more intricate connections.
    *   **Ultra**: Generate an exhaustive schematic. Illustrate the fine-grained details of components, wiring, and assembly logic.
    *   **Max**: Generate a manufacturing-level diagram. Show every component from the materials list, including fasteners, with extreme detail in connections and internal workings.
4.  **Labeling (VERY IMPORTANT):**
    *   You MUST add clear text labels for the most important components from the materials list.
    *   Each label MUST have a pointer line with an arrowhead pointing from the text to the corresponding component.
    *   This is the most critical part of the blueprint.

**Example of desired style:**
\`\`\`xml
<svg width="100%" height="100%" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="black" />
        </marker>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8">
            <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="black" stroke-width="1" />
        </pattern>
    </defs>
    <style>
        .component { fill: none; stroke: black; stroke-width: 2; }
        .label-text { font-family: Arial, sans-serif; font-size: 16px; fill: black; }
        .pointer-line { stroke: black; stroke-width: 1.5; marker-end: url(#arrow); }
    </style>
    <rect x="0" y="0" width="800" height="600" fill="white" />
    <text x="400" y="40" font-size="20" font-weight="bold" text-anchor="middle" class="label-text">Figure 1: {{{projectPrompt}}}</text>

    <!-- Components -->
    <rect x="100" y="100" width="50" height="400" class="component" />
    <path d="M 150 150 H 450 V 200 H 450" class="component" />
    <rect x="175" y="170" width="250" height="30" fill="url(#hatch)" stroke="black" stroke-width="1" />

    <!-- Labels with Pointers -->
    <path class="pointer-line" d="M 500 185 L 450 185" />
    <text x="510" y="190" class="label-text">Support Arm</text>

    <path class="pointer-line" d="M 100 300 L 50 300" />
    <text x="0" y="305" class="label-text">Main Frame</text>
</svg>
\`\`\`

**PROJECT DETAILS:**
- **Project Idea:** {{{projectPrompt}}}
- **Quality Level:** {{{qualityLevel}}}
- **Functions:** {{{functions}}}
- **Materials:** {{{materials}}}

Now, generate the complete and valid SVG code for the detailed, black and white technical line drawing, ensuring it is well-labeled with pointers and uses complex paths to create representative shapes according to the specified quality level.
`,
});


const generateBlueprintSvgFlow = ai.defineFlow(
  {
    name: 'generateBlueprintSvgFlow',
    inputSchema: GenerateBlueprintSvgInputSchema,
    outputSchema: GenerateBlueprintSvgOutputSchema,
  },
  async (input) => {
    const {output} = await svgPrompt(input);
    if (!output?.svgCode) {
        throw new Error('Failed to generate SVG blueprint code.');
    }
    // Simple validation to remove markdown fences if the model adds them
    let svgCode = output.svgCode.trim();
    if (svgCode.startsWith('```svg')) {
      svgCode = svgCode.substring(5).trim();
    }
    if (svgCode.startsWith('```xml')) {
      svgCode = svgCode.substring(5).trim();
    }
    if (svgCode.endsWith('```')) {
      svgCode = svgCode.substring(0, svgCode.length - 3).trim();
    }
    return { svgCode: svgCode };
  }
);

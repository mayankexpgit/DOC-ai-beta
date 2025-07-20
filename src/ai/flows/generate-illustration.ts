
'use server';
/**
 * @fileOverview An AI illustration and diagram generator.
 *
 * - generateIllustration - A function that handles the illustration generation process.
 * - GenerateIllustrationInput - The input type for the generateIllustration function.
 * - GenerateIllustrationOutput - The return type for the generateIllustration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIllustrationInputSchema = z.object({
  title: z.string().describe("The title of the illustration."),
  description: z.string().describe("A detailed description of the process, data, or concept to be visualized. Should include the text for each item or step."),
  numItems: z.number().describe("The number of distinct items or steps in the illustration."),
  colorPalette: z.enum(['vibrant', 'professional', 'pastel', 'monochromatic']).describe("The desired color palette for the illustration."),
});
export type GenerateIllustrationInput = z.infer<typeof GenerateIllustrationInputSchema>;


const GenerateIllustrationOutputSchema = z.object({
  imageDataUri: z.string().describe("The base64 encoded data URI of the generated illustration."),
});
export type GenerateIllustrationOutput = z.infer<typeof GenerateIllustrationOutputSchema>;

export async function generateIllustration(input: GenerateIllustrationInput): Promise<GenerateIllustrationOutput> {
  return generateIllustrationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateIllustrationPrompt',
  input: {schema: GenerateIllustrationInputSchema},
  output: {schema: z.object({ imagePrompt: z.string() })},
  prompt: `You are an expert graphic designer who creates beautiful, clean, and modern infographics and diagrams.
Your task is to convert a user's request into a perfect, detailed prompt for an image generation model (like DALL-E or Midjourney) to create the illustration.

**Key Instructions:**
1.  **Style:** The output image MUST be a vector-style illustration or infographic. It should be clean, with clear lines, and presented on a plain white background. It should NOT be a photograph or a realistic rendering. Use terms like "infographic," "diagram," "vector illustration," "flat design."
2.  **Content:** The generated prompt must instruct the image model to include the title: '{{{title}}}'. It must also visually represent the user's description and include exactly {{{numItems}}} distinct steps or items.
3.  **Color:** The prompt must specify the color palette. For '{{{colorPalette}}}', use corresponding descriptive terms (e.g., for 'vibrant', use 'a vibrant and dynamic color palette of blue, orange, and green'; for 'professional', use 'a professional and corporate color scheme of navy blue, grey, and teal').
4.  **Clarity:** The final image should be easy to understand, with clear iconography and text placeholders if necessary. The prompt should explicitly ask for a "clean layout" and "easy-to-read".
5.  **Example:** If the user asks for a 4-step roadmap, the prompt should be something like: "A clean infographic diagram titled 'Our Project Roadmap' on a white background. It shows a winding road with 4 numbered map pin markers, each in a different color. The illustration should be in a modern flat design style using a vibrant and professional color palette. The layout must be clear and easy to understand."

**User Request:**
- Title: {{{title}}}
- Description: {{{description}}}
- Number of Items: {{{numItems}}}
- Color Palette: {{{colorPalette}}}

Based on this, generate the perfect image prompt.
`,
});

const generateIllustrationFlow = ai.defineFlow(
  {
    name: 'generateIllustrationFlow',
    inputSchema: GenerateIllustrationInputSchema,
    outputSchema: GenerateIllustrationOutputSchema,
  },
  async (input) => {

    const {output} = await prompt(input);
    if (!output?.imagePrompt) {
        throw new Error('Failed to generate an image prompt.');
    }

    try {
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt: output.imagePrompt,
            config: { responseModalities: ['TEXT', 'IMAGE'] },
        });

        if (!media?.url) {
            throw new Error('Image generation failed to return an image.');
        }

        return { imageDataUri: media.url };

    } catch (e) {
        console.error("Illustration image generation failed for prompt:", output.imagePrompt, e);
        throw new Error('Failed to generate the illustration image.');
    }
  }
);

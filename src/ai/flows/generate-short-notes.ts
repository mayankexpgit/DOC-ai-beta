
'use server';
/**
 * @fileOverview An AI-powered short notes generator.
 *
 * - generateShortNotes - A function that handles the note generation process.
 * - GenerateShortNotesInput - The input type for the generateShortNotes function.
 * - GenerateShortNotesOutput - The return type for the generateShortNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateShortNotesInputSchema = z.object({
  chapterContent: z.string().describe('The full text content of the chapter or document to be summarized into notes.'),
  detailLevel: z.enum(['concise', 'detailed', 'comprehensive']).describe("The desired level of detail for the notes. 'concise' for a brief overview, 'detailed' for main points with explanations, 'comprehensive' for an in-depth summary with examples."),
});
export type GenerateShortNotesInput = z.infer<typeof GenerateShortNotesInputSchema>;

const GenerateShortNotesOutputSchema = z.object({
  shortNotes: z.string().describe('The generated short notes in a well-structured markdown format, including headings, bullet points, and bold text for key terms.'),
});
export type GenerateShortNotesOutput = z.infer<typeof GenerateShortNotesOutputSchema>;

export async function generateShortNotes(input: GenerateShortNotesInput): Promise<GenerateShortNotesOutput> {
  return generateShortNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateShortNotesPrompt',
  input: {schema: GenerateShortNotesInputSchema},
  output: {schema: GenerateShortNotesOutputSchema},
  prompt: `You are an expert academic assistant specializing in creating high-quality, structured short notes from text. Your task is to read the provided chapter content and generate notes based on the user's desired level of detail.

**Key Instructions:**
1.  **Structure:** The notes MUST be well-structured. Use markdown formatting extensively:
    *   Use headings (\`#\`, \`##\`, \`###\`) for main topics and sub-topics.
    *   Use bullet points (\`-\` or \`*\`) for key information.
    *   Use nested bullet points for hierarchical information.
    *   Use bold text (\`**key term**\`) to highlight important keywords, definitions, and concepts.
2.  **Clarity and Conciseness:** The language should be clear and easy to understand. Avoid jargon where possible or explain it briefly.
3.  **Detail Level Adherence:** You must strictly adhere to the requested '{{{detailLevel}}}'.
    *   **concise:** Generate a brief, high-level summary. Focus only on the main headings and most critical points. The output should be very short.
    *   **detailed:** Provide a balanced summary. Cover all main topics with key supporting points and definitions. This should be a solid summary for revision.
    *   **comprehensive:** Create an in-depth set of notes. Include main topics, sub-topics, detailed explanations, definitions, and even examples mentioned in the text. This should be thorough enough for deep study.

**User Request:**
*   **Detail Level:** {{{detailLevel}}}
*   **Chapter Content to Summarize:**
    {{{chapterContent}}}

Now, generate the short notes following all instructions precisely.
`,
});

const generateShortNotesFlow = ai.defineFlow(
  {
    name: 'generateShortNotesFlow',
    inputSchema: GenerateShortNotesInputSchema,
    outputSchema: GenerateShortNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

'use server';
/**
 * @fileOverview An AI-powered booklet and question paper solver.
 *
 * - solveBooklet - A function that handles the solving process.
 * - SolveBookletInput - The input type for the solveBooklet function.
 * - SolveBookletOutput - The return type for the solveBooklet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SolveBookletInputSchema = z.object({
  documentContent: z.string().describe('The full text content of the question paper or booklet to be solved.'),
  detailLevel: z.enum(['short', 'medium', 'detailed']).describe("The desired level of detail for the answer key. 'short' for just the answer, 'medium' for a brief explanation, 'detailed' for a full step-by-step solution."),
});
export type SolveBookletInput = z.infer<typeof SolveBookletInputSchema>;

const SolveBookletOutputSchema = z.object({
  solvedAnswers: z.string().describe('The fully solved answer key in a well-structured markdown format. Each answer should be detailed and provide step-by-step explanations where applicable.'),
});
export type SolveBookletOutput = z.infer<typeof SolveBookletOutputSchema>;

export async function solveBooklet(input: SolveBookletInput): Promise<SolveBookletOutput> {
  return solveBookletFlow(input);
}

const prompt = ai.definePrompt({
  name: 'solveBookletPrompt',
  input: {schema: SolveBookletInputSchema},
  output: {schema: SolveBookletOutputSchema},
  prompt: `You are an expert tutor and problem solver. Your task is to read the provided content from a booklet or question paper, identify every single question, and provide a solution for each one based on the requested detail level.

**Key Instructions:**
1.  **Identify All Questions:** Carefully parse the entire document content to find all questions. This includes Multiple Choice Questions (MCQs), short answer, long answer, fill-in-the-blanks, matching, and complex, multi-part problems.
2.  **Adhere to Detail Level:** You MUST provide solutions that match the user's requested detail level: '{{{detailLevel}}}'.
    *   **short:** Provide only the final, concise answer. For MCQs, give just the option (e.g., "(B)"). For problems, give only the final numerical or text answer. No explanations.
    *   **medium:** State the correct answer and provide a brief, one or two-sentence explanation. For problems, show the main formula used and the final answer.
    *   **detailed:** Provide a comprehensive, step-by-step solution.
        *   For **MCQs**, state the correct option and provide a clear explanation for why it is correct and why the other options are incorrect.
        *   For **math or science problems**, show the complete step-by-step derivation, including formulas used and calculations.
        *   For **theory questions**, provide a detailed, well-structured answer as if you were writing an exam for top marks.
3.  **Structure and Formatting:** The output MUST be well-structured in markdown format.
    *   Use headings (\`##\`, \`###\`) for question numbers (e.g., \`## Question 1\`, \`## Question 2\`).
    *   Use bold text (\`**Answer:**\`) to clearly indicate the final answer.
    *   Use bullet points, numbered lists, and code blocks for clarity where appropriate.
    *   Maintain the original question numbering.

**User Request:**
*   **Detail Level:** {{{detailLevel}}}
*   **Document Content to Solve:**
    {{{documentContent}}}

Now, generate the detailed, solved answer key following all instructions precisely.
`,
});

const solveBookletFlow = ai.defineFlow(
  {
    name: 'solveBookletFlow',
    inputSchema: SolveBookletInputSchema,
    outputSchema: SolveBookletOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

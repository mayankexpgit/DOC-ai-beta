
'use server';
/**
 * @fileOverview An advanced AI document editor.
 *
 * - editDocument - A function that handles the document revision process.
 * - ProfessionalDocumentEditorInput - The input type for the editDocument function.
 * - ProfessionalDocumentEditorOutput - The return type for the editDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProfessionalDocumentEditorInputSchema = z.object({
  documentContent: z.string().describe('The raw, plain text content of the document to be edited and enhanced.'),
});
export type ProfessionalDocumentEditorInput = z.infer<typeof ProfessionalDocumentEditorInputSchema>;

const ProfessionalDocumentEditorOutputSchema = z.object({
  editedContent: z.string().describe('The professionally revised and formatted document content in clean markdown.'),
});
export type ProfessionalDocumentEditorOutput = z.infer<typeof ProfessionalDocumentEditorOutputSchema>;

export async function editDocument(input: ProfessionalDocumentEditorInput): Promise<ProfessionalDocumentEditorOutput> {
  return professionalDocumentEditorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'professionalDocumentEditorPrompt',
  input: {schema: ProfessionalDocumentEditorInputSchema},
  output: {schema: ProfessionalDocumentEditorOutputSchema},
  prompt: `You are an advanced professional document editor AI. Your task is to revise and enhance the following document text.

### Goals:

1.  **Tone & Clarity**:
    *   Maintain a formal, engaging, and clear tone suitable for academic or professional audiences.
    *   Use active voice where possible.
    *   Remove filler words and redundancy.

2.  **Grammar & Spelling**:
    *   Correct all grammatical errors, punctuation mistakes, and spelling issues.

3.  **Structure & Flow**:
    *   Improve the logical flow of paragraphs and sentences.
    *   Merge or split paragraphs where needed for clarity.
    *   Ensure consistent terminology throughout.

4.  **Headings & Subheadings**:
    *   Add clear, logical headings and subheadings throughout the document for readability.

5.  **Executive Summary**:
    *   Create a clear executive summary of 3-6 lines at the top summarizing the core content.

6.  **Content Enhancement**:
    *   Preserve technical accuracy while improving clarity.
    *   Add transitional phrases for smooth reading.
    *   Enhance weak statements with precise, professional language.

7.  **Return Format**:
    *   Return the revised document in clean markdown format using:
        *   \`#\` for main headings,
        *   \`##\` for subheadings,
        *   Bullet points where necessary.
    *   Do not add unnecessary commentary; return only the revised document content in the 'editedContent' field.

---

### Document to Edit:

"""
{{{documentContent}}}
"""
`,
});

const professionalDocumentEditorFlow = ai.defineFlow(
  {
    name: 'professionalDocumentEditorFlow',
    inputSchema: ProfessionalDocumentEditorInputSchema,
    outputSchema: ProfessionalDocumentEditorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

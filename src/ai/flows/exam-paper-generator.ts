
'use server';
/**
 * @fileOverview An AI-powered exam paper generator.
 *
 * - generateExamPaper - A function that handles the exam paper generation process.
 * - GenerateExamPaperInput - The input type for the generateExamPaper function.
 * - GenerateExamPaperOutput - The return type for the generateExamPaper function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExamPaperInputSchema = z.object({
  examTitle: z.string().describe("The main title for the exam paper."),
  standard: z.string().describe("The standard or grade level for the exam (e.g., 10th, 12th)."),
  subject: z.string().describe("The subject of the exam (e.g., Physics, History)."),
  curriculum: z.enum(['ncert', 'nios', 'board']).describe("The educational board or curriculum to follow (e.g., NCERT, NIOS)."),
  syllabus: z.string().describe("A detailed list of chapters, topics, or concepts to be included in the exam."),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("The difficulty level of the questions."),
  numQuestions: z.number().int().min(1).describe("The exact number of questions to generate. This is ONLY used if isMCQOnly is true."),
  totalMarks: z.string().describe("The total marks for the exam (e.g., '100')."),
  timeAllotted: z.string().describe("The time duration for the exam (e.g., '3 Hours')."),
  includePYQs: z.boolean().describe("Whether to include questions based on Previous Year Questions (PYQs) and competitive exam patterns."),
  addAnswerKey: z.boolean().describe("Whether to generate a detailed, solved answer key for the paper."),
  isMCQOnly: z.boolean().optional().describe("Whether to generate only Multiple Choice Questions."),
  competencyPercentage: z.number().min(0).max(100).optional().describe("The percentage of competency-based questions."),
  useOriginalQuestions: z.boolean().optional().describe("Whether to generate new, original AI-created practice questions."),
  generateBlueprint: z.boolean().optional().describe("Whether to generate a blueprint of the exam paper."),
  isSectionWise: z.boolean().optional().describe("Whether to use the section-wise question generation mode."),
  numMCQs: z.number().optional().describe("Number of Multiple Choice Questions (1 mark each)."),
  num1Mark: z.number().optional().describe("Number of 1-mark questions."),
  num2Mark: z.number().optional().describe("Number of 2-mark questions."),
  num3Mark: z.number().optional().describe("Number of 3-mark questions."),
  num4Mark: z.number().optional().describe("Number of 4-mark questions."),
});
export type GenerateExamPaperInput = z.infer<typeof GenerateExamPaperInputSchema>;

const GenerateExamPaperOutputSchema = z.object({
  examPaperContent: z.string().describe("The fully generated exam paper content, formatted and ready to be displayed. It should contain the header and a numbered list of questions."),
  answerKeyContent: z.string().optional().describe("The detailed, solved answer key content, if requested. Formatted and ready to be displayed."),
  blueprintContent: z.string().optional().describe("The generated blueprint of the exam, showing the distribution of marks across chapters and question types in a markdown table."),
});
export type GenerateExamPaperOutput = z.infer<typeof GenerateExamPaperOutputSchema>;

export async function generateExamPaper(input: GenerateExamPaperInput): Promise<GenerateExamPaperOutput> {
  return generateExamPaperFlow(input);
}

const validateExamMarks = ai.defineTool(
  {
    name: 'validateExamMarks',
    description: 'Validates if the sum of marks for all proposed questions equals the total marks. For non-MCQ papers, it also validates the question count if provided.',
    inputSchema: z.object({
      proposedMarks: z.array(z.number()).describe('An array of numbers, where each number is the mark for a single question.'),
      totalMarks: z.number().describe('The total marks the exam paper should have.'),
      numQuestions: z.number().optional().describe('The total number of questions the exam paper should have (if specified).'),
    }),
    outputSchema: z.boolean(),
  },
  async ({ proposedMarks, totalMarks, numQuestions }) => {
    const sum = proposedMarks.reduce((a, b) => a + b, 0);
    const count = proposedMarks.length;
    // If numQuestions is provided, both count and sum must match. Otherwise, just the sum.
    const countMatches = numQuestions ? count === numQuestions : true;
    return sum === totalMarks && countMatches;
  }
);


const textGenerationPrompt = ai.definePrompt({
  name: 'generateExamPaperTextPrompt',
  tools: [validateExamMarks],
  input: {schema: GenerateExamPaperInputSchema.extend({
    isNcert: z.boolean(),
    isNios: z.boolean(),
  })},
  output: {schema: z.object({
    examPaperContent: GenerateExamPaperOutputSchema.shape.examPaperContent,
    answerKeyContent: GenerateExamPaperOutputSchema.shape.answerKeyContent,
    blueprintContent: GenerateExamPaperOutputSchema.shape.blueprintContent,
  })},
  prompt: `You are an expert educator and question paper creator. Your task is to create a high-quality, official-looking exam paper, an answer key, and optionally a blueprint based on the user's specifications. The final output must look exactly like a real exam paper.

**CRITICAL TWO-STEP PROCESS: You MUST follow this procedure.**
1.  **PROPOSE & VALIDATE (MANDATORY FIRST STEP):** First, you MUST decide on a list of marks for all questions. Then, you MUST use the \`validateExamMarks\` tool to confirm that your proposed marks distribution is valid.
    {{#if isSectionWise}}
    *   **SECTION WISE MODE:** The user has provided the exact number of questions for each mark type. You MUST use this structure. The paper will have sections. You MUST use the \`validateExamMarks\` tool with the corresponding total marks to confirm validity. If the tool returns \`false\`, you MUST inform the user of the error and stop.
    {{else if isMCQOnly}}
    *   **MCQ MODE:** You MUST create a list of marks for **exactly {{{numQuestions}}}** questions. Then, you MUST use the \`validateExamMarks\` tool to confirm that **(A) the sum of your proposed marks equals the user's requested \`totalMarks\`** AND **(B) the total number of items in your list is exactly equal to \`numQuestions\`**. If the tool returns \`false\`, you MUST revise and call the tool again until it returns \`true\`.
    {{else}}
    *   **STANDARD MODE:** You MUST decide on a balanced list of marks for a variety of question types (MCQs, Short, Long, etc.) that adds up to the \`totalMarks\`. The number of questions is up to you to decide based on the subject and difficulty. You MUST use the \`validateExamMarks\` tool to confirm that the sum of your proposed marks equals the user's requested \`totalMarks\`. **Do not use the \`numQuestions\` parameter in the tool.**
    {{/if}}
    You cannot proceed to step 2 until the validation is successful.
2.  **GENERATE CONTENT (ONLY AFTER VALIDATION):** Once validation is successful, you will then generate the full exam paper content, the answer key (if requested), and the blueprint (if requested) using that validated list of marks.

**Key Instructions for Generation:**
1.  **Question Quality & Pattern:**
    {{#if isMCQOnly}}
    *   **MCQ Only:** Generate ONLY Multiple Choice Questions (MCQs). Each question must have four options: (A), (B), (C), and (D). The layout must be clean and well-formatted.
    {{else}}
    *   **Modern Question Types:** The paper must include a mix of modern question patterns: MCQs, Assertion-Reason, Case-Study based questions, Short Answer, and Long Answer questions. Create a balanced and comprehensive paper.
    {{/if}}
2.  **Question Style (CRITICAL):**
    *   {{#if competencyPercentage}}
        **Competency-Based Questions:** You MUST ensure that approximately **{{{competencyPercentage}}}%** of the questions are competency-based. These questions should not be simple recall, but require application, analysis, and critical thinking skills. This applies to all modes, including section-wise.
    {{/if}}
    *   {{#if includePYQs}}
        **Previous Year Questions (PYQs) Pattern:** You MUST generate questions that are similar in style, pattern, and difficulty to Previous Year Questions for competitive exams related to this subject and standard.
    {{/if}}
    *   {{#if useOriginalQuestions}}
        **Original Questions:** You MUST generate new, original AI-created practice questions. Do not use common textbook examples. The questions should be unique and creative while strictly adhering to the syllabus and curriculum.
    {{/if}}
3.  **Formatting (VERY IMPORTANT):**
    *   The document must be formatted perfectly in markdown.
    *   **Header:** Start with the exam title, standard, and subject at the top, each on a new line and centered (e.g., using \`# \`, \`## \`, \`### \`). Below this, add a single line with "**Time Allotted: {{{timeAllotted}}}**" and "**Maximum Marks: {{{totalMarks}}}**" separated by a placeholder ('----------') to be flexed apart. The header is NOT part of the question list and should NOT be numbered.
    *   **Instructions:** After the header, you MUST include a section titled "**General Instructions**" followed by a numbered list of instructions. This section must be separate from the questions and should have a clear visual separation (e.g., a horizontal rule \`---\` before it). The entire instructions block should be bold.
    *   **Structure:**
        {{#if isSectionWise}}
        *   **Section-Based Layout:** The paper MUST be divided into sections (e.g., Section A, Section B). Each section should contain questions of a specific mark value as requested by the user.
        {{else}}
        *   **Simple List Layout:** Provide a simple, continuous numbered list of questions (e.g., \`1. ...\`, \`2. ...\`). **Do NOT use sections (e.g., Section A, B, C).**
        {{/if}}
4.  **Marks Allocation (CRITICAL):**
    *   You MUST allocate the exact marks from your validated list to every single question.
    *   The marks for each question must be displayed at the **end of the question line**, enclosed in square brackets, e.g., \`[1]\`, \`[2]\`, \`[5]\`.
5.  **Answer Key (CRITICAL REQUIREMENT):**
    *   {{#if addAnswerKey}}
        You MUST generate a detailed, solved answer key for **every single question** in the 'answerKeyContent' field.
        *   **Style:** For non-MCQ papers, the answers should be written as if by a top-scoring student—clear, comprehensive, and well-explained. The answer key MUST be well-structured. Use markdown headings for each answer number (e.g., \`### Answer 1\`, \`### Answer 2\`) and use bullet points and bold text for clarity. Start the answer key with a title "**Answer Key**".
        *   **MCQ Answer Key:** For MCQ-only papers, the answer key MUST be in a single, compact block of text (e.g., \`1-B, 2-C, 3-A, ...\`).
    *   {{else}}
        Do NOT include an answer key. The 'answerKeyContent' field should be left empty.
    {{/if}}
6. **Blueprint (If Requested):** 
    * {{#if generateBlueprint}}You MUST create a detailed blueprint in the 'blueprintContent' field. The blueprint MUST be a markdown table with the following columns: \`| Chapter/Topic | Question Types (e.g., MCQ, Short Answer) | Total Marks |\`. It should summarize the paper structure, showing the distribution of marks across the syllabus topics.{{else}}Do NOT generate a blueprint. The 'blueprintContent' field should be left empty.{{/if}}

**User Specifications:**
*   **Exam Title:** {{{examTitle}}}
*   **Standard/Grade:** {{{standard}}}
*   **Subject:** {{{subject}}}
*   **Curriculum:** {{{curriculum}}}
*   **Syllabus to Cover:** {{{syllabus}}}
*   **Difficulty Level:** {{{difficulty}}}
*   **Total Marks (Strict Rule):** {{{totalMarks}}}
*   **Time Allotted:** {{{timeAllotted}}}
{{#if isSectionWise}}
*   **Generation Mode:** Section Wise
*   **Section Breakdown:**
    *   MCQs (1 Mark): {{{numMCQs}}} questions
    *   1-Mark Questions: {{{num1Mark}}} questions
    *   2-Mark Questions: {{{num2Mark}}} questions
    *   3-Mark Questions: {{{num3Mark}}} questions
    *   4-Mark Questions: {{{num4Mark}}} questions
{{else if isMCQOnly}}
*   **Generation Mode:** MCQ Only
*   **Number of Questions (Strict Rule):** {{{numQuestions}}}
{{else}}
*   **Generation Mode:** Standard (Mixed Questions)
{{/if}}
*   **Question Style Preferences:**
    *   Competency-Based Questions Percentage: {{#if competencyPercentage}}{{{competencyPercentage}}}%{{else}}Not specified{{/if}}
    *   Use PYQ Pattern: {{#if includePYQs}}Yes{{else}}No{{/if}}
    *   Generate Original Questions: {{#if useOriginalQuestions}}Yes{{else}}No{{/if}}
*   **Generate Answer Key:** {{#if addAnswerKey}}Yes{{else}}No{{/if}}
*   **Generate Blueprint:** {{#if generateBlueprint}}Yes{{else}}No{{/if}}

Now, follow the two-step process: First, propose and validate the marks distribution. Second, generate all requested content, ensuring you follow all Question Style preferences.
`,
});

const generateExamPaperFlow = ai.defineFlow(
  {
    name: 'generateExamPaperFlow',
    inputSchema: GenerateExamPaperInputSchema,
    outputSchema: GenerateExamPaperOutputSchema,
  },
  async input => {
    let finalInput = { ...input };

    if (input.isSectionWise) {
        const numMCQs = input.numMCQs || 0;
        const num1Mark = input.num1Mark || 0;
        const num2Mark = input.num2Mark || 0;
        const num3Mark = input.num3Mark || 0;
        const num4Mark = input.num4Mark || 0;
        
        const totalQuestions = numMCQs + num1Mark + num2Mark + num3Mark + num4Mark;
        finalInput.numQuestions = totalQuestions;
    }
    
    const {output} = await textGenerationPrompt({
        ...finalInput,
        isNcert: input.curriculum === 'ncert',
        isNios: input.curriculum === 'nios',
    });
    if (!output || !output.examPaperContent) {
      throw new Error('Failed to generate exam paper content.');
    }

    return {
        examPaperContent: output.examPaperContent,
        answerKeyContent: output.answerKeyContent,
        blueprintContent: output.blueprintContent,
    };
  }
);

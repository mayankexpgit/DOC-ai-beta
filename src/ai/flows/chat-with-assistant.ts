'use server';
/**
 * @fileOverview An AI assistant chatbot flow.
 *
 * - chatWithAssistant - A function that handles a conversational turn.
 * - ChatWithAssistantInput - The input type for the chatWithAssistant function.
 * - ChatWithAssistantOutput - The return type for the chatWithAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ChatWithAssistantInputSchema = z.object({
  question: z.string().describe("The user's question for the assistant."),
});
export type ChatWithAssistantInput = z.infer<typeof ChatWithAssistantInputSchema>;

const ChatWithAssistantOutputSchema = z.object({
  answer: z.string().describe("The AI's response to the user's question."),
});
export type ChatWithAssistantOutput = z.infer<typeof ChatWithAssistantOutputSchema>;

export async function chatWithAssistant(
  input: ChatWithAssistantInput
): Promise<ChatWithAssistantOutput> {
  return chatWithAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithAssistantPrompt',
  input: {schema: ChatWithAssistantInputSchema},
  output: {schema: ChatWithAssistantOutputSchema},
  prompt: `You are a helpful AI assistant integrated into a document creation application. Your goal is to assist users with problem-solving, educational questions, and other general inquiries. Be concise and helpful.

User's question: {{{question}}}

Your answer:`,
});

const chatWithAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithAssistantFlow',
    inputSchema: ChatWithAssistantInputSchema,
    outputSchema: ChatWithAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

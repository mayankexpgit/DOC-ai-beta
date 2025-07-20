
'use server';
/**
 * @fileOverview An AI flow that converts a source text into a styled HTML document that looks like the user's handwriting on a notebook page.
 *
 * - convertToHandwriting - The main function that handles the conversion process.
 * - HandwritingConverterInput - The input type for the function.
 * - HandwritingConverterOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { CaveatFont } from '@/lib/fonts/Caveat-Regular-normal';
import { DancingScriptFont } from '@/lib/fonts/DancingScript-Regular-normal';
import { IndieFlowerFont } from '@/lib/fonts/IndieFlower-Regular-normal';
import { PatrickHandFont } from '@/lib/fonts/PatrickHand-Regular-normal';
import { KalamFont } from '@/lib/fonts/Kalam-Regular-normal';
import { ReenieBeanieFont } from '@/lib/fonts/ReenieBeanie-Regular-normal';
import { RockSaltFont } from '@/lib/fonts/RockSalt-Regular-normal';

const humanizeLevels = ['none', 'medium', 'high', 'ultra', 'max'] as const;
const humanizeLevelEnum = z.enum(humanizeLevels);
const fontNameEnum = z.enum(['Caveat', 'Dancing Script', 'Patrick Hand', 'Indie Flower', 'Kalam', 'Reenie Beanie', 'Rock Salt']);

const HandwritingConverterInputSchema = z.object({
  sourceText: z
    .string()
    .describe(
      "The user's notes as a block of text."
    ),
  fontName: fontNameEnum.describe("The Google Font to use for the handwriting style."),
  humanizeLevel: humanizeLevelEnum.default('high').describe("The level of human-like variation to apply to the handwriting."),
});
export type HandwritingConverterInput = z.infer<typeof HandwritingConverterInputSchema>;

const HandwritingConverterOutputSchema = z.object({
  handwrittenNoteHtml: z.string().describe("The generated A4-styled page as a complete HTML string, ready for client-side rendering into a PDF."),
});
export type HandwritingConverterOutput = z.infer<typeof HandwritingConverterOutputSchema>;


const humanizeTextPrompt = ai.definePrompt({
    name: 'humanizeTextPrompt',
    input: { schema: z.object({
        sourceText: z.string(),
        humanizeLevel: humanizeLevelEnum,
        fontName: z.string(),
        fontDescription: z.string(),
    }) },
    output: { schema: z.object({ humanizedText: z.string() }) },
    prompt: `You are a handwriting simulation expert. Your task is to subtly modify a given text to make it look more like natural, human handwriting when rendered. You must ONLY return the modified text.

**Font Style:** The target font is '{{{fontName}}}'. This is a {{{fontDescription}}}. Your modifications should be consistent with this style.

**Humanization Level:** {{{humanizeLevel}}}

**Instructions:**
- **none:** Do not change the text at all. Return the original text.
- **medium:** Keep the text as is. No changes needed. The rendering engine will add minor jitter.
- **high:** Introduce very subtle, natural-looking "errors" or variations. Maybe connect a few common letter pairs with a ligature if appropriate for the font (e.g., 'th', 'ou'). Do this sparingly.
- **ultra:** Increase the frequency of ligatures and natural connections between letters. Slightly vary the spacing between some words. The output should look very natural and flowing, like someone writing quickly but neatly.
- **max:** Go for maximum realism. Introduce more complex ligatures, slight variations in letter forms (without changing the letter itself), and make the connections look very fluid. For example, you could write "and" as "an∂" or similar constructs if it fits the font style.

**CRITICAL:** Only output the modified text in the 'humanizedText' field. Do NOT add explanations or apologies.

**Source Text:**
{{{sourceText}}}
`,
});

function getFontDescription(fontName: z.infer<typeof fontNameEnum>): string {
    switch (fontName) {
        case 'Dancing Script': return 'flowing, elegant script';
        case 'Caveat': return 'casual, looping script';
        case 'Patrick Hand': return 'friendly, neat script';
        case 'Indie Flower': return 'bubbly, rounded script';
        case 'Kalam': return 'natural, slightly slanted Devanagari-style script';
        case 'Reenie Beanie': return 'thin, scratchy, high-school-notebook script';
        case 'Rock Salt': return 'bold, marker-like, expressive script';
        default: return 'friendly, neat script';
    }
}

function getFontData(fontName: string): string {
    switch (fontName) {
        case 'Caveat': return CaveatFont;
        case 'Dancing Script': return DancingScriptFont;
        case 'Indie Flower': return IndieFlowerFont;
        case 'Patrick Hand': return PatrickHandFont;
        case 'Kalam': return KalamFont;
        case 'Reenie Beanie': return ReenieBeanieFont;
        case 'Rock Salt': return RockSaltFont;
        default: return PatrickHandFont; // Failsafe
    }
}


export async function convertToHandwriting(input: HandwritingConverterInput): Promise<HandwritingConverterOutput> {
  return handwritingConverterFlow(input);
}


function generateHtmlForPdf(text: string, fontName: string, humanizeLevel: (typeof humanizeLevels)[number]): string {
    const fontData = getFontData(fontName);

    const intensityMap = { none: 0, medium: 0.8, high: 1.5, ultra: 2.0, max: 2.5 };
    const intensity = intensityMap[humanizeLevel] || 0;
    
    let renderedText = '';
    if (intensity > 0) {
        for (const char of text) {
            if (char === ' ') {
                renderedText += '&nbsp;';
                continue;
            }
            if (char === '\n') {
                renderedText += '<br/>';
                continue;
            }
            const rotation = (Math.random() - 0.5) * (intensity * 0.75);
            const yOffset = (Math.random() - 0.5) * (intensity * 0.4);
            renderedText += `<span style="display: inline-block; transform: translateY(${yOffset}px) rotate(${rotation}deg);">${char}</span>`;
        }
    } else {
        renderedText = text.replace(/\n/g, '<br/>').replace(/ /g, '&nbsp;');
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @font-face {
                    font-family: '${fontName}';
                    src: url(data:font/truetype;charset=utf-8;base64,${fontData}) format('truetype');
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: '${fontName}', sans-serif;
                    font-size: 20px;
                    color: #000080; /* Dark blue ink */
                    line-height: 32px;
                    width: 210mm;
                    min-height: 297mm;
                    box-sizing: border-box;
                    background-color: white;
                    padding: 40px 40px 40px 65px; /* Margins */
                    background-image:
                        repeating-linear-gradient(white 0px, white 31px, #d3d3d3 32px),
                        linear-gradient(to right, white 60px, red 61px, red 62px, white 63px);
                    background-size: 100% 32px, 100% 100%;
                    background-repeat: repeat-y, no-repeat;
                }
                .content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
            </style>
        </head>
        <body>
            <div class="content">${renderedText}</div>
        </body>
        </html>
    `;
}

const handwritingConverterFlow = ai.defineFlow(
  {
    name: 'handwritingConverterFlow',
    inputSchema: HandwritingConverterInputSchema,
    outputSchema: HandwritingConverterOutputSchema,
  },
  async (input) => {
    let textToRender = input.sourceText;
    
    if (input.humanizeLevel !== 'none' && input.humanizeLevel !== 'medium') {
        const fontDescription = getFontDescription(input.fontName);
        const { output } = await humanizeTextPrompt({
            sourceText: input.sourceText,
            humanizeLevel: input.humanizeLevel,
            fontName: input.fontName,
            fontDescription: fontDescription,
        });
        if (output?.humanizedText) {
            textToRender = output.humanizedText;
        }
    }
    
    const htmlContent = generateHtmlForPdf(textToRender, input.fontName, input.humanizeLevel);

    return { handwrittenNoteHtml: htmlContent };
  }
);

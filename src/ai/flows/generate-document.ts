
'use server';
/**
 * @fileOverview A document generation AI agent.
 *
 * - generateDocument - A function that handles the document generation process.
 * - GenerateDocumentInput - The input type for the generateDocument function.
 * - GenerateDocumentOutput - The return type for the generateDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentInputSchema = z.object({
  prompt: z.string().describe('The prompt for generating the document.'),
  documentType: z.enum(['essay', 'report', 'letter', 'meeting-agenda', 'project-proposal', 'presentation', 'timetable']).default('essay').describe('The type of document to generate.'),
  format: z.enum(['DOCX', 'PDF', 'TXT']).default('PDF').describe('The format of the document to generate.'),
  pageSize: z.enum(['A4', 'A3', 'A5']).default('A4').describe('The page size for the document.'),
  pageCount: z.number().min(1).max(30).default(1).describe('The number of pages for the document.'),
  qualityLevel: z.enum(['medium', 'high', 'ultra']).default('high').describe('The quality level for the document generation. "Ultra" will be more detailed and take longer.'),
  numImages: z.number().min(0).max(15).default(0).describe('The number of AI-generated images to include in the document.'),
  theme: z.enum(['professional', 'creative', 'minimalist']).default('professional').describe('The overall theme and style of the document.'),
  font: z.enum([
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Merriweather',
    'Playfair Display',
    'Nunito',
    'Raleway',
    'Source Code Pro',
    'Lora',
    'PT Sans',
    'Poppins',
    'Caveat',
    'Dancing Script',
    'Patrick Hand',
    'Indie Flower'
  ]).default('Roboto').describe('The font family for the document.'),
  generateTemplate: z.boolean().default(true).describe('For presentations, whether to generate an AI template with background images.'),
});
export type GenerateDocumentInput = z.infer<typeof GenerateDocumentInputSchema>;

const PageSchema = z.object({
  title: z.string().optional().describe("For presentations, the title of the slide. For other documents, this can be empty."),
  content: z.string().describe("The text content for this page. This should be well-written and relevant to the user's prompt and theme. Use markdown for formatting like headings, bold text, and lists. If a content image is requested, include an image tag like `![Alt text](placeholder)` where it should appear."),
  imagePrompt: z.string().optional().describe("If an image is relevant for this page, provide a concise, descriptive prompt for an image generation model that matches the document's theme. For example: 'A clean infographic diagram of the 4-step process.' or 'A vector illustration of a bar chart showing growth.'")
});

const DocumentThemeSchema = z.object({
    backgroundColor: z.string().describe("A CSS background color for the main content area of the page (e.g., '#ffffff'). For presentations, this should be dark (e.g., '#111827')"),
    textColor: z.string().describe("A CSS color value for the main text (e.g., '#333333'). For presentations, this should be light (e.g., '#F9FAFB')"),
    headingColor: z.string().describe("A CSS color value for headings (e.g., '#111111'). For presentations, this should be a vibrant accent color."),
    backgroundPrompt: z.string().describe("A creative prompt for an image generation model to create a decorative border or frame for the document. The design should stay on the edges and not interfere with text readability. For example: 'A soft, abstract watercolor wash as a page border', or 'A minimalist geometric pattern with thin gold lines to frame the page'. For presentations, this should be abstract and visually consistent for a template.")
});

const GenerateDocumentOutputSchema = z.object({
  pages: z.array(z.object({
    content: z.string().describe("The text content for this page, formatted as an HTML string."),
    markdownContent: z.string().describe("The raw markdown content for this page."),
    imageDataUri: z.string().optional().describe("The base64 encoded data URI of the generated image for this page, if any."),
  })).describe('An array of pages, each containing content and an optional image.'),
  theme: z.object({
    backgroundColor: z.string(),
    textColor: z.string(),
    headingColor: z.string(),
    backgroundImageDataUri: z.string().optional().describe("The base64 encoded data URI of the generated background/border image for the document theme."),
  }).describe("The generated visual theme for the document."),
  isPresentation: z.boolean().optional().describe("A flag to indicate if the output is a presentation."),
});
export type GenerateDocumentOutput = z.infer<typeof GenerateDocumentOutputSchema>;

export async function generateDocument(input: GenerateDocumentInput): Promise<GenerateDocumentOutput> {
  return generateDocumentFlow(input);
}

const textGenerationPrompt = ai.definePrompt({
    name: 'generateDocumentTextPrompt',
    input: {schema: GenerateDocumentInputSchema.extend({ isPresentation: z.boolean(), isTimetable: z.boolean() })},
    output: {schema: z.object({ pages: z.array(PageSchema), theme: DocumentThemeSchema })},
    prompt: `You are an AI document and art director. Generate a '{{{documentType}}}' and a visual theme based on the user's request.
The document must have exactly {{{pageCount}}} pages (or slides).

{{#if isPresentation}}
The structure should be: A Title Slide (content is a short, catchy title, title field is empty), {{{pageCount}}} Content Slides (each with a title and content), and a Closing Slide ("Thank You" or "Q&A").
The total number of slides will be {{{pageCount}}} + 2. Adjust the page array accordingly.
For presentation themes, ALWAYS use a dark background color (e.g., '#111827', '#000000'), a light text color, and a vibrant heading color.
The 'backgroundPrompt' for presentations should create a visually consistent, abstract, and professional design suitable for a slide template border.
{{else if isTimetable}}
You are an expert scheduler. Generate a timetable based on the user's prompt. The output MUST be a single page containing a markdown table with the schedule. The table should be well-structured and easy to read.
Use the user's prompt to determine the days, times, subjects, or activities. The 'content' field should contain ONLY the markdown table.
For the theme, use a 'professional' style with a white background and dark text.
{{else}}
For the '{{{theme}}}' theme, define a visual style in the 'theme' output field.
- professional: Use clean, classic styles. A white background ('#ffffff') with dark text. The background prompt should be for something subtle and professional, like 'a simple thin-line border in dark grey'.
- creative: Use vibrant colors and interesting designs. The background color can be slightly off-white. The background prompt should be imaginative and artistic, like 'abstract watercolor flower borders'.
- minimalist: Use simple, elegant styles. An off-white background like '#f8f8f8' with dark grey text. The background prompt should be for a very simple frame, like 'a single, delicate painted line as a border'.
The 'backgroundPrompt' should be for a decorative page border or frame that does not interfere with the text. The 'backgroundColor' should be for the content area behind the text.
{{/if}}

The quality level for this generation is '{{{qualityLevel}}}'. This applies to both the written content and the image prompts. The content should be in markdown format.
- 'medium': Generate a detailed and polished document.
- 'high': Generate a well-structured, comprehensive document.
- 'ultra': Generate an exceptionally detailed, professional, and in-depth document.

You have a budget to generate exactly {{{numImages}}} images.
Distribute these images across the pages/slides where they would be most effective by generating an 'imagePrompt' for that page.
The 'imagePrompt' should be for a clean, vector-style illustration, diagram, or infographic on a white background. It should NOT be a photograph. For example: "A clean infographic diagram of the 4-step process.", "A vector illustration of a bar chart showing growth."
If a page does not get an image, leave its 'imagePrompt' field empty. Do not generate more or fewer than {{{numImages}}} image prompts in total.

User Prompt: {{{prompt}}}
`,
});

const generateImage = async (prompt: string): Promise<string | undefined> => {
    if (!prompt) return undefined;
    try {
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt,
            config: { responseModalities: ['TEXT', 'IMAGE'] },
        });
        return media?.url;
    } catch (e) {
        console.error("Image generation failed for prompt:", prompt, e);
        return undefined;
    }
};

const generateDocumentFlow = ai.defineFlow(
  {
    name: 'generateDocumentFlow',
    inputSchema: GenerateDocumentInputSchema,
    outputSchema: GenerateDocumentOutputSchema,
  },
  async (input) => {
    const { marked } = await import('marked');

    const isPresentation = input.documentType === 'presentation';
    const isTimetable = input.documentType === 'timetable';

    // Step 1: Generate all text content and image prompts
    const {output: textOutput} = await textGenerationPrompt({
        ...input,
        isPresentation,
        isTimetable,
    });
    if (!textOutput?.pages || !textOutput?.theme) {
      throw new Error('Failed to generate document content or theme from the model.');
    }

    // Step 2: Generate all images in parallel
    const allImagePrompts: (string | undefined)[] = [
        (isPresentation && input.generateTemplate) ? textOutput.theme.backgroundPrompt : undefined,
        ...textOutput.pages.map(p => p.imagePrompt)
    ];
    
    const generationPromises = allImagePrompts.map(prompt => generateImage(prompt || ''));
    const generatedImages = await Promise.all(generationPromises);

    const backgroundImageDataUri = generatedImages[0];
    const pageImageUris = generatedImages.slice(1);

    // Step 3: Combine text and generated images
    const finalPages = textOutput.pages.map((page, index) => {
        const titleHtml = page.title ? `<h1>${page.title}</h1>` : '';
        const titleMarkdown = page.title ? `# ${page.title}\n\n` : '';
        let contentHtml = marked.parse(page.content) as string;
        
        const imageDataUri = pageImageUris[index];
        if (imageDataUri) {
            const imageHtml = `<img src="${imageDataUri}" alt="Generated content image" style="max-height: 300px; margin: 1rem auto; border-radius: 0.5rem; background-color: white; padding: 0.5rem;" data-ai-hint="infographic diagram" />`;
            // More robust replacement: replace placeholder or just append if placeholder is missing/malformed.
            if (contentHtml.includes('(placeholder)')) {
                 contentHtml = contentHtml.replace(/<p>!\[.*?\]\(placeholder\)<\/p>/, imageHtml);
            } else {
                contentHtml += imageHtml;
            }
        }
        
        return {
            content: titleHtml + contentHtml,
            markdownContent: titleMarkdown + page.content,
            imageDataUri: imageDataUri,
        };
    });

    return {
        pages: finalPages,
        theme: {
            backgroundColor: textOutput.theme.backgroundColor,
            textColor: textOutput.theme.textColor,
            headingColor: textOutput.theme.headingColor,
            backgroundImageDataUri: backgroundImageDataUri,
        },
        isPresentation: isPresentation,
    };
  }
);

    
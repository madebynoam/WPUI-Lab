/**
 * AI Helper Functions
 *
 * Provides focused AI functions for the 30% of requests that need custom content:
 * 1. generateTableData() - Uses claude-haiku-4-5 to create custom table data
 * 2. generateCopy() - Uses claude-haiku-4-5 for simple text/copy generation
 *
 * These are called ONLY when deterministic templates don't match the user's request.
 */

import { createLLMProvider } from '../llm/factory';
import { MODEL_PRICING } from './types';
import { getAgentModel } from '../agentConfig';

// Token estimation utility
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate custom table data using claude-haiku-4-5
 *
 * Use this when user requests a table that doesn't match any template
 * (e.g., "flower bundles", "pokemon", "recipes", etc.)
 *
 * Returns DataView-compatible data structure with columns and rows.
 */
export async function generateTableData(params: {
  topic: string;
  rowCount?: number;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{
  data: Array<Record<string, any>>;
  columns: Array<{ id: string; label: string }>;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  const { topic, rowCount = 5, apiKey, signal } = params;

  console.log(`[AI Helper] Generating ${rowCount} rows of table data for: ${topic}`);

  // Create LLM provider
  const config = getAgentModel('orchestrator');
  const llm = createLLMProvider({
    provider: config.provider,
    apiKey,
    model: config.model,
  });

  // System prompt for structured data generation
  const systemPrompt = `You are a data generator for table interfaces. Generate realistic, structured data.

Output ONLY valid JSON with this structure:
{
  "columns": [
    { "id": "field_name", "label": "Display Name" },
    ...
  ],
  "data": [
    { "id": 1, "field_name": "value", ... },
    ...
  ]
}

Rules:
- Include 4-6 relevant columns for the topic
- Generate exactly ${rowCount} rows
- Use realistic, varied data
- Include an "id" field (1, 2, 3...)
- Use appropriate field types (strings, numbers, dates)
- NO markdown formatting, ONLY raw JSON`;

  const userPrompt = `Generate table data for: ${topic}

Include ${rowCount} rows with relevant columns.`;

  // Call LLM - provider will handle model-specific parameter constraints
  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
    signal,
  });

  // Calculate costs
  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  const outputTokens = estimateTokens(response.content || '');
  const pricing = MODEL_PRICING[config.model as keyof typeof MODEL_PRICING];
  const cost = (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output;

  // Parse response
  try {
    const content = response.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const result = JSON.parse(jsonStr);

    console.log(`[AI Helper] Generated ${result.data.length} rows with ${result.columns.length} columns`);
    console.log(`[AI Helper] Cost: $${cost.toFixed(6)}, Tokens: ${inputTokens + outputTokens}`);

    return {
      data: result.data || [],
      columns: result.columns || [],
      inputTokens,
      outputTokens,
      cost,
    };
  } catch (error) {
    console.error('[AI Helper] Failed to parse table data:', error);
    throw new Error('Failed to generate table data');
  }
}

/**
 * Generate copy/text content using claude-haiku-4-5
 *
 * Use this for simple text generation (headlines, button labels, descriptions, etc.)
 * when templates have placeholder text that needs customization.
 */
export async function generateCopy(params: {
  request: string;
  context?: string;
  tone?: 'professional' | 'casual' | 'playful';
  maxLength?: number;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  const { request, context, tone = 'professional', maxLength = 200, apiKey, signal } = params;

  console.log(`[AI Helper] Generating ${tone} copy for: ${request}`);

  // Create LLM provider
  const config = getAgentModel('orchestrator');
  const llm = createLLMProvider({
    provider: config.provider,
    apiKey,
    model: config.model,
  });

  // System prompt for copy generation
  const systemPrompt = `You are a copywriter. Generate concise, engaging text.

Tone: ${tone}
Max length: ${maxLength} characters

Output ONLY the text content, no quotes, no formatting, no explanations.`;

  const userPrompt = context
    ? `${request}\n\nContext: ${context}`
    : request;

  // Call LLM - provider will handle model-specific parameter constraints
  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 150,
    temperature: 0.8,
    signal,
  });

  // Calculate costs
  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  const outputTokens = estimateTokens(response.content || '');
  const pricing = MODEL_PRICING[config.model as keyof typeof MODEL_PRICING];
  const cost = (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output;

  const text = (response.content || '').trim();

  console.log(`[AI Helper] Generated ${text.length} characters of copy`);
  console.log(`[AI Helper] Cost: $${cost.toFixed(6)}, Tokens: ${inputTokens + outputTokens}`);

  return {
    text,
    inputTokens,
    outputTokens,
    cost,
  };
}

/**
 * Generate custom component properties using claude-haiku-4-5
 *
 * Use this when user wants to customize component props beyond simple templates
 * (e.g., "make the button blue with rounded corners and a shadow")
 */
export async function generateComponentProps(params: {
  componentType: string;
  request: string;
  currentProps?: Record<string, any>;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{
  props: Record<string, any>;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  const { componentType, request, currentProps = {}, apiKey, signal } = params;

  console.log(`[AI Helper] Generating props for ${componentType}: ${request}`);

  // Create LLM provider
  const config = getAgentModel('orchestrator');
  const llm = createLLMProvider({
    provider: config.provider,
    apiKey,
    model: config.model,
  });

  // System prompt for props generation
  const systemPrompt = `You are a component property generator. Generate valid React component props.

Component type: ${componentType}
Current props: ${JSON.stringify(currentProps, null, 2)}

Output ONLY valid JSON object with the new/updated props.
Only include props that should change, don't repeat unchanged props.

Common prop types:
- colors: hex codes (e.g., "#3b82f6")
- sizes: "sm" | "md" | "lg" | numbers
- booleans: true/false
- spacing: numbers (px) or "sm" | "md" | "lg"

NO markdown formatting, ONLY raw JSON object.`;

  const userPrompt = `Update props based on: ${request}`;

  // Call LLM - provider will handle model-specific parameter constraints
  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.5,
    signal,
  });

  // Calculate costs
  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  const outputTokens = estimateTokens(response.content || '');
  const pricing = MODEL_PRICING[config.model as keyof typeof MODEL_PRICING];
  const cost = (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output;

  // Parse response
  try {
    const content = response.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const props = JSON.parse(jsonStr);

    console.log(`[AI Helper] Generated ${Object.keys(props).length} prop(s)`);
    console.log(`[AI Helper] Cost: $${cost.toFixed(6)}, Tokens: ${inputTokens + outputTokens}`);

    return {
      props,
      inputTokens,
      outputTokens,
      cost,
    };
  } catch (error) {
    console.error('[AI Helper] Failed to parse component props:', error);
    throw new Error('Failed to generate component props');
  }
}

/**
 * Generate custom component structure using gpt-4o-mini
 *
 * Use this when user requests a component that doesn't match any template
 * (e.g., "add three sale bundle cards with buttons")
 */
export async function generateComponentStructure(params: {
  request: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{
  componentTree: any;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  const { request, apiKey, signal } = params;

  console.log(`[AI Helper] Generating component structure: ${request}`);

  // Create LLM provider
  const config = getAgentModel('orchestrator');
  const llm = createLLMProvider({
    provider: config.provider,
    apiKey,
    model: config.model,
  });

  // System prompt for component structure generation
  const systemPrompt = `You are a UI component generator. Generate component tree structures for WP-Designer.

Available components:
- Layout: VStack, HStack, Grid, Box, Divider
- Typography: Heading (level 1-6), Text
- Interactive: Button, Link
- Forms: Input, Textarea, Select, Checkbox, FormControl, FormLabel
- Data: DataViews, Badge
- Containers: Card, CardHeader, CardBody

Output ONLY valid JSON representing a component tree (NO IDs, they're auto-generated):
{
  "type": "ComponentType",
  "props": { "key": "value" },
  "children": [ /* nested components */ ]
}

Rules:
- Use semantic structure (VStack/HStack for layout, Grid for grids)
- Include realistic placeholder content
- Use appropriate props (spacing, gap, columns, etc.)
- NO IDs in the tree
- NO markdown formatting, ONLY raw JSON

Example for "3 pricing cards":
{
  "type": "Grid",
  "props": { "columns": 3, "gap": 4 },
  "children": [
    {
      "type": "Card",
      "props": {},
      "children": [
        { "type": "CardBody", "props": {}, "children": [
          { "type": "Heading", "props": { "level": 3, "children": "Basic" }, "children": [] },
          { "type": "Text", "props": { "children": "$9/month" }, "children": [] },
          { "type": "Button", "props": { "children": "Buy Now" }, "children": [] }
        ]}
      ]
    }
    /* ... 2 more cards */
  ]
}`;

  const userPrompt = `Generate component structure for: ${request}`;

  // Call LLM - provider will handle model-specific parameter constraints
  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
    signal,
  });

  // Calculate costs
  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  const outputTokens = estimateTokens(response.content || '');
  const pricing = MODEL_PRICING[config.model as keyof typeof MODEL_PRICING];
  const cost = (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output;

  // Parse response
  try {
    const content = response.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const componentTree = JSON.parse(jsonStr);

    console.log(`[AI Helper] Generated component structure: ${componentTree.type}`);
    console.log(`[AI Helper] Cost: $${cost.toFixed(6)}, Tokens: ${inputTokens + outputTokens}`);

    return {
      componentTree,
      inputTokens,
      outputTokens,
      cost,
    };
  } catch (error) {
    console.error('[AI Helper] Failed to parse component structure:', error);
    throw new Error('Failed to generate component structure');
  }
}

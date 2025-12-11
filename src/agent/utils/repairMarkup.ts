import { parseMarkup, ParseError, ParseResult } from '../../utils/markupParser';
import { createLLMProvider } from '../llm/factory';
import { getAgentModel, getModelCapabilities } from '../agentConfig';
import { getAgentComponentSummary } from '../../config/availableComponents';
import { ComponentNode } from '../../types';

/**
 * Repair result - either success with repaired nodes or failure
 */
export interface RepairResult {
  success: boolean;
  nodes?: ComponentNode[];
  error?: string;
  attempts: number;
  cost: number; // Estimated cost in dollars
}

/**
 * Extract minimal context around error for repair request
 */
function extractErrorContext(markup: string, error: ParseError): string {
  const lines = markup.split('\n');
  const errorLine = error.line - 1; // Convert to 0-based

  // Extract 2 lines before and after error
  const start = Math.max(0, errorLine - 2);
  const end = Math.min(lines.length, errorLine + 3);

  const contextLines = lines.slice(start, end).map((line, idx) => {
    const lineNum = start + idx + 1;
    const marker = lineNum === error.line ? ' ← ERROR HERE' : '';
    return `${line}${marker}`;
  });

  return contextLines.join('\n');
}

/**
 * Estimate token count for cost calculation
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Parse markup with automatic repair loop
 *
 * If markup parsing fails, attempts to repair by:
 * 1. Extracting minimal context around error
 * 2. Sending targeted repair request to LLM
 * 3. Splicing fix back into original markup
 * 4. Re-parsing to validate
 *
 * Max 3 repair attempts. Cost: ~$0.0002-0.0005 per repair attempt
 *
 * @param markup - JSX-like markup to parse
 * @param maxAttempts - Maximum repair attempts (default: 3)
 * @returns Repair result with nodes or error
 */
export async function parseMarkupWithRepair(
  markup: string,
  maxAttempts: number = 3
): Promise<RepairResult> {
  let currentMarkup = markup;
  let totalCost = 0;
  let attempts = 0;

  // Try initial parse
  let result = parseMarkup(currentMarkup);

  if (result.success) {
    return {
      success: true,
      nodes: result.nodes,
      attempts: 0,
      cost: 0,
    };
  }

  // Repair loop
  while (attempts < maxAttempts && !result.success && result.error) {
    attempts++;

    console.log(`[RepairMarkup] Attempt ${attempts}/${maxAttempts} - Error: ${result.error.message}`);

    // Extract minimal context
    const errorContext = extractErrorContext(currentMarkup, result.error);

    // Build repair prompt
    const repairPrompt = buildRepairPrompt(
      errorContext,
      result.error,
      currentMarkup.split('\n')[result.error.line - 1] || ''
    );

    // Call LLM for repair
    const config = getAgentModel('agent');
    const llm = await createLLMProvider(config);
    const capabilities = getModelCapabilities(config.model);

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a markup repair assistant. Fix only the specific error mentioned. Return ONLY the corrected markup, no explanations.',
      },
      {
        role: 'user' as const,
        content: repairPrompt,
      },
    ];

    try {
      const response = await llm.chat({
        messages,
        max_tokens: 500,
        // Only set temperature if the model supports it (reasoning models don't)
        ...(capabilities.supportsCustomTemperature ? { temperature: 0.2 } : {}),
      });

      // Extract text from response
      const fixedMarkup = response.content || '';

      // Estimate cost (rough calculation)
      const inputTokens = estimateTokens(repairPrompt);
      const outputTokens = estimateTokens(fixedMarkup);
      const attemptCost = (inputTokens / 1000) * 0.00025 + (outputTokens / 1000) * 0.002; // GPT-5-Mini rates
      totalCost += attemptCost;

      console.log(`[RepairMarkup] Received fix, re-parsing... (cost: $${attemptCost.toFixed(6)})`);

      // Splice fix into original markup
      currentMarkup = spliceFix(currentMarkup, result.error, fixedMarkup);

      // Re-parse
      result = parseMarkup(currentMarkup);

      if (result.success) {
        console.log(`[RepairMarkup] ✅ Successfully repaired after ${attempts} attempts (total cost: $${totalCost.toFixed(6)})`);
        return {
          success: true,
          nodes: result.nodes,
          attempts,
          cost: totalCost,
        };
      }
    } catch (error) {
      console.error(`[RepairMarkup] Repair attempt ${attempts} failed:`, error);
      // Continue to next attempt
    }
  }

  // Failed after all attempts
  return {
    success: false,
    error: result.error?.message || 'Failed to parse markup after all repair attempts',
    attempts,
    cost: totalCost,
  };
}

/**
 * Build repair prompt with error context and available components
 */
function buildRepairPrompt(errorContext: string, error: ParseError, errorLine: string): string {
  const components = getAgentComponentSummary();

  return `Fix this JSX markup error:

Error: ${error.message}
At line ${error.line}, column ${error.column}

Context:
\`\`\`jsx
${errorContext}
\`\`\`

The error is on this line:
\`\`\`
${errorLine}
\`\`\`

Available components:
${components}

Return ONLY the corrected markup for the error context above. No explanations.`;
}

/**
 * Splice fixed markup into original markup at error location
 */
function spliceFix(originalMarkup: string, error: ParseError, fixedMarkup: string): string {
  const lines = originalMarkup.split('\n');
  const errorLine = error.line - 1; // Convert to 0-based

  // Extract fixed lines (remove markdown code fence if present)
  let fixedLines = fixedMarkup.trim().split('\n');

  // Remove markdown code fences
  if (fixedLines[0].startsWith('```')) {
    fixedLines = fixedLines.slice(1);
  }
  if (fixedLines[fixedLines.length - 1].startsWith('```')) {
    fixedLines = fixedLines.slice(0, -1);
  }

  // Determine range to replace (error context ±2 lines)
  const start = Math.max(0, errorLine - 2);
  const end = Math.min(lines.length, errorLine + 3);

  // Replace range with fixed markup
  const before = lines.slice(0, start);
  const after = lines.slice(end);

  return [...before, ...fixedLines, ...after].join('\n');
}

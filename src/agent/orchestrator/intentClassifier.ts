/**
 * Intent Classification System
 *
 * Deterministic routing layer that classifies user requests and routes to appropriate executors.
 * Replaces LLM-based intent parsing with fast keyword matching.
 *
 * Flow:
 * 1. Try pattern detection first (70% case) → executeTemplateInsertion
 * 2. If no pattern, classify intent type (update, delete, custom table, etc.)
 * 3. Return classification to orchestrator for executor routing
 *
 * Target: <10ms, $0.0000
 */

import { detectPattern, PatternMatch } from './patternDetector';
import { ToolContext } from '../types';

/**
 * Intent classification result
 */
export interface IntentClassification {
  type:
    | 'template'           // Insert pre-built pattern (70% case)
    | 'custom_table'       // Create table with AI-generated data (30% case)
    | 'update_props'       // Update component properties (deterministic)
    | 'update_copy'        // Update text content with AI (30% case)
    | 'delete'             // Delete components (deterministic)
    | 'move'               // Move components (deterministic)
    | 'custom_component';  // Create custom component with AI props (30% case)

  // For template type
  patternId?: string;
  patternMatch?: PatternMatch;

  // For custom_table type
  tableTopic?: string;
  rowCount?: number;

  // For update/delete/move types
  componentIds?: string[];
  targetSelector?: string; // "selected", "all buttons", etc.

  // For update_props/update_copy types
  updateRequest?: string;
  tone?: 'professional' | 'casual' | 'playful';

  // For custom_component type
  componentType?: string;
  componentSpec?: string;

  // Original request
  request: string;
  confidence: number; // 0-1
}

/**
 * Normalize user message for matching
 */
function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

/**
 * Extract component IDs from selection context
 */
function getTargetComponents(
  message: string,
  context: ToolContext
): { ids: string[]; selector: string } | null {
  const normalized = normalizeMessage(message);

  // Check for "selected" keyword
  if (
    normalized.includes('selected') ||
    normalized.includes('this') ||
    normalized.includes('these') ||
    normalized.includes('current')
  ) {
    return {
      ids: context.selectedNodeIds,
      selector: 'selected',
    };
  }

  // Check for "all X" pattern
  const allMatch = normalized.match(/all (\w+)/);
  if (allMatch) {
    // Get all components of that type
    // (This would need a helper function to find components by type)
    return {
      ids: [], // TODO: implement findComponentsByType
      selector: `all ${allMatch[1]}`,
    };
  }

  return null;
}

/**
 * Detect if message is requesting a custom table
 */
function detectCustomTable(message: string): {
  topic: string;
  rowCount: number;
} | null {
  const normalized = normalizeMessage(message);

  // Must have "table" or "list" keywords
  if (!normalized.includes('table') && !normalized.includes('list')) {
    return null;
  }

  // Extract topic from common patterns
  let topic = '';

  // Pattern: "table of X" or "X table"
  const ofMatch = normalized.match(/table (?:of|for|with) ([^,.]+)/);
  const tableMatch = normalized.match(/([a-z\s]+) table/);

  if (ofMatch) {
    topic = ofMatch[1].trim();
  } else if (tableMatch) {
    topic = tableMatch[1].trim();
  }

  // Extract row count if specified
  let rowCount = 5; // default
  const countMatch = normalized.match(/(\d+) (?:rows?|items?|entries?)/);
  if (countMatch) {
    rowCount = parseInt(countMatch[1], 10);
  }

  if (topic) {
    return { topic, rowCount };
  }

  return null;
}

/**
 * Detect delete intent
 */
function detectDelete(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes('delete') ||
    normalized.includes('remove') ||
    normalized.includes('clear') ||
    normalized.includes('erase')
  );
}

/**
 * Detect move/reorder intent
 */
function detectMove(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes('move') ||
    normalized.includes('reorder') ||
    normalized.includes('rearrange') ||
    normalized.includes('swap')
  );
}

/**
 * Detect property update intent
 */
function detectPropertyUpdate(message: string): boolean {
  const normalized = normalizeMessage(message);

  // Common property keywords
  const propertyKeywords = [
    'color', 'size', 'width', 'height', 'padding', 'margin',
    'background', 'border', 'radius', 'shadow', 'opacity',
    'font', 'weight', 'align', 'spacing', 'gap',
    'make it', 'change to', 'set to', 'style',
  ];

  return propertyKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Detect copy/text update intent
 */
function detectCopyUpdate(message: string): boolean {
  const normalized = normalizeMessage(message);

  return (
    normalized.includes('text') ||
    normalized.includes('copy') ||
    normalized.includes('headline') ||
    normalized.includes('title') ||
    normalized.includes('description') ||
    normalized.includes('label') ||
    normalized.includes('write') ||
    normalized.includes('rewrite') ||
    normalized.includes('change the wording')
  );
}

/**
 * Extract tone from message
 */
function extractTone(message: string): 'professional' | 'casual' | 'playful' {
  const normalized = normalizeMessage(message);

  if (normalized.includes('playful') || normalized.includes('fun') || normalized.includes('friendly')) {
    return 'playful';
  }
  if (normalized.includes('casual') || normalized.includes('relaxed') || normalized.includes('informal')) {
    return 'casual';
  }
  return 'professional';
}

/**
 * Classify user intent (MAIN FUNCTION)
 *
 * This is the entry point for all request routing.
 */
export function classifyIntent(
  userMessage: string,
  context: ToolContext
): IntentClassification {
  const normalized = normalizeMessage(userMessage);

  console.log('[Intent Classifier] Classifying:', userMessage);

  // STEP 1: Try pattern detection first (70% case)
  const patternMatch = detectPattern(userMessage);
  if (patternMatch && patternMatch.confidence >= 0.7) {
    console.log('[Intent Classifier] ✓ Pattern match:', patternMatch.patternId);
    return {
      type: 'template',
      patternId: patternMatch.patternId,
      patternMatch,
      request: userMessage,
      confidence: patternMatch.confidence,
    };
  }

  // STEP 2: Check for delete intent
  if (detectDelete(normalized)) {
    const targets = getTargetComponents(normalized, context);
    console.log('[Intent Classifier] ✓ Delete intent');

    return {
      type: 'delete',
      componentIds: targets?.ids || context.selectedNodeIds,
      targetSelector: targets?.selector || 'selected',
      request: userMessage,
      confidence: 0.9,
    };
  }

  // STEP 3: Check for move intent
  if (detectMove(normalized)) {
    const targets = getTargetComponents(normalized, context);
    console.log('[Intent Classifier] ✓ Move intent');

    return {
      type: 'move',
      componentIds: targets?.ids || context.selectedNodeIds,
      targetSelector: targets?.selector || 'selected',
      request: userMessage,
      confidence: 0.8,
    };
  }

  // STEP 4: Check for property update (if components selected)
  if (context.selectedNodeIds.length > 0 && detectPropertyUpdate(normalized)) {
    console.log('[Intent Classifier] ✓ Property update intent');

    return {
      type: 'update_props',
      componentIds: context.selectedNodeIds,
      updateRequest: userMessage,
      request: userMessage,
      confidence: 0.85,
    };
  }

  // STEP 5: Check for copy update (if components selected)
  if (context.selectedNodeIds.length > 0 && detectCopyUpdate(normalized)) {
    console.log('[Intent Classifier] ✓ Copy update intent');

    return {
      type: 'update_copy',
      componentIds: context.selectedNodeIds,
      updateRequest: userMessage,
      tone: extractTone(normalized),
      request: userMessage,
      confidence: 0.85,
    };
  }

  // STEP 6: Check for custom table creation (30% case)
  const customTable = detectCustomTable(normalized);
  if (customTable) {
    console.log('[Intent Classifier] ✓ Custom table:', customTable.topic);

    return {
      type: 'custom_table',
      tableTopic: customTable.topic,
      rowCount: customTable.rowCount,
      request: userMessage,
      confidence: 0.8,
    };
  }

  // STEP 7: Default to custom component creation (30% case)
  console.log('[Intent Classifier] ✓ Custom component creation');

  return {
    type: 'custom_component',
    componentSpec: userMessage,
    request: userMessage,
    confidence: 0.6,
  };
}

/**
 * Validate classification has required fields for execution
 */
export function validateClassification(classification: IntentClassification): {
  valid: boolean;
  error?: string;
} {
  switch (classification.type) {
    case 'template':
      if (!classification.patternId) {
        return { valid: false, error: 'Missing patternId for template' };
      }
      break;

    case 'custom_table':
      if (!classification.tableTopic) {
        return { valid: false, error: 'Missing tableTopic for custom_table' };
      }
      break;

    case 'update_props':
    case 'update_copy':
      if (!classification.componentIds || classification.componentIds.length === 0) {
        return { valid: false, error: 'No components selected for update' };
      }
      break;

    case 'delete':
      if (!classification.componentIds || classification.componentIds.length === 0) {
        return { valid: false, error: 'No components selected for deletion' };
      }
      break;

    case 'move':
      if (!classification.componentIds || classification.componentIds.length === 0) {
        return { valid: false, error: 'No components selected for move' };
      }
      break;

    case 'custom_component':
      if (!classification.componentSpec) {
        return { valid: false, error: 'Missing component specification' };
      }
      break;
  }

  return { valid: true };
}

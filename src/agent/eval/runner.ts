/**
 * Eval Runner
 *
 * Runs the full evaluation suite against the multi-agent system
 * Uses REAL LLM calls (not mocks), so this costs real money (~$0.07 total)
 *
 * Usage:
 *   npm run eval                    # Run all scenarios
 *   npm run eval -- --category simple   # Run only simple scenarios
 *   npm run eval -- --id simple-page-creation  # Run single scenario
 */

import { AgentOrchestrator } from '../agentOrchestrator';
// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ToolContext } from '../types';
import { evalDataset, EvalScenario, calculateTotalBudget } from './dataset';
import { ComponentNode, Page } from '../../types';

interface EvalResult {
  scenario: EvalScenario;
  passed: boolean;
  actualCost: number;
  actualTime: number;
  errors: string[];
  memoryMatches: boolean;
  componentCountMatches: boolean;
  pageCountMatches: boolean;
}

interface EvalSummary {
  totalScenarios: number;
  passed: number;
  failed: number;
  passRate: number;
  totalCost: number;
  totalTime: number;
  results: EvalResult[];
}

/**
 * Create a mock ToolContext for testing
 */
function createMockToolContext(setupState?: EvalScenario['setupState']): ToolContext {
  const pages: Page[] = setupState?.pages || [
    {
      id: 'page-default',
      name: 'Default Page',
      tree: [
        {
          id: 'root-vstack',
          type: 'VStack',
          props: {},
          children: [],
          interactions: [],
        },
      ],
    },
  ];

  const currentPageId = setupState?.currentPageId || pages[0]?.id || 'page-default';
  const selectedNodeIds = setupState?.selectedNodeIds || [];

  // Initialize tree from current page
  let tree: ComponentNode[] = pages.find(p => p.id === currentPageId)?.tree || [];

  return {
    get tree() {
      return tree;
    },
    get pages() {
      return pages;
    },
    get currentPageId() {
      return currentPageId;
    },
    get selectedNodeIds() {
      return selectedNodeIds;
    },

    getNodeById: (id: string) => {
      const findNode = (nodes: ComponentNode[]): ComponentNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return findNode(tree);
    },

    setTree: (newTree: ComponentNode[]) => {
      tree = newTree;
      const pageIndex = pages.findIndex(p => p.id === currentPageId);
      if (pageIndex >= 0) {
        pages[pageIndex].tree = newTree;
      }
    },

    addComponent: (node: ComponentNode, parentId?: string, index?: number) => {
      const parent = parentId ? findNodeById(tree, parentId) : tree[0];
      if (parent && parent.children) {
        if (index !== undefined) {
          parent.children.splice(index, 0, node);
        } else {
          parent.children.push(node);
        }
      }
    },

    updateComponentProps: (id: string, props: any) => {
      const node = findNodeById(tree, id);
      if (node) {
        node.props = { ...node.props, ...props };
      }
    },

    updateMultipleComponentProps: (ids: string[], props: any) => {
      ids.forEach(id => {
        const node = findNodeById(tree, id);
        if (node) {
          node.props = { ...node.props, ...props };
        }
      });
    },

    updateComponentName: (id: string, name: string) => {
      const node = findNodeById(tree, id);
      if (node) {
        node.name = name;
      }
    },

    removeComponent: (id: string) => {
      const removeFromTree = (nodes: ComponentNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === id) {
            nodes.splice(i, 1);
            return true;
          }
          if (nodes[i].children && removeFromTree(nodes[i].children!)) {
            return true;
          }
        }
        return false;
      };
      removeFromTree(tree);
    },

    copyComponent: () => {},
    pasteComponent: () => {},
    duplicateComponent: () => {},

    addInteraction: () => {},
    removeInteraction: () => {},
    updateInteraction: () => {},

    createPage: (name: string, route: string) => {
      const newPageId = `page-${Date.now()}`;
      pages.push({
        id: newPageId,
        name,
        tree: [
          {
            id: 'root-vstack',
            type: 'VStack',
            props: {},
            children: [],
            interactions: [],
          },
        ],
      });
      return newPageId;
    },

    setCurrentPage: (pageId: string) => {
      const page = pages.find(p => p.id === pageId);
      if (page) {
        tree = page.tree;
      }
    },

    updatePageTheme: () => {},
    toggleNodeSelection: () => {},
  };
}

/**
 * Helper to find node by ID
 */
function findNodeById(tree: ComponentNode[], id: string): ComponentNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Count total components in tree (excluding root)
 */
function countComponents(tree: ComponentNode[]): number {
  let count = 0;
  const traverse = (nodes: ComponentNode[]) => {
    nodes.forEach(node => {
      if (node.id !== 'root-vstack') {
        count++;
      }
      if (node.children) {
        traverse(node.children);
      }
    });
  };
  traverse(tree);
  return count;
}

/**
 * Run a single evaluation scenario
 */
async function runScenario(scenario: EvalScenario): Promise<EvalResult> {
  const errors: string[] = [];
  const startTime = Date.now();

  try {
    console.log(`\n🔧 Running: ${scenario.id}`);
    console.log(`   Message: "${scenario.userMessage}"`);

    // Create orchestrator and mock context
    const orchestrator = await AgentOrchestrator.create();
    const context = createMockToolContext(scenario.setupState);

    // Execute
    const result = await orchestrator.handleMessage(scenario.userMessage, context, {
      onProgress: (msg) => {
        // Optionally log progress
        console.log(`   [${msg.agent}] ${msg.message}`);
      },
    });

    console.log('   Result:', JSON.stringify(result, null, 2));

    const actualTime = Date.now() - startTime;
    const actualCost = result.cost;

    // Validate memory
    const memory = orchestrator.getMemory();
    const memoryMatches = validateMemory(memory.getAll(), scenario.expectedMemory, errors);

    // Validate component count
    const actualComponentCount = countComponents(context.tree);
    const componentCountMatches = scenario.expectedComponentCount === undefined ||
      actualComponentCount === scenario.expectedComponentCount;

    if (!componentCountMatches) {
      errors.push(
        `Component count mismatch: expected ${scenario.expectedComponentCount}, got ${actualComponentCount}`
      );
    }

    // Validate page count
    const pageCountMatches = scenario.expectedPageCount === undefined ||
      context.pages.length === scenario.expectedPageCount;

    if (!pageCountMatches) {
      errors.push(`Page count mismatch: expected ${scenario.expectedPageCount}, got ${context.pages.length}`);
    }

    // Check budgets
    if (actualCost > scenario.maxCost) {
      errors.push(`Cost exceeded budget: $${actualCost.toFixed(4)} > $${scenario.maxCost.toFixed(4)}`);
    }

    if (actualTime > scenario.maxTime) {
      errors.push(`Time exceeded budget: ${actualTime}ms > ${scenario.maxTime}ms`);
    }

    const passed = result.success && errors.length === 0;

    console.log(
      passed
        ? `   ✅ PASS (${actualTime}ms, $${actualCost.toFixed(4)})`
        : `   ❌ FAIL (${actualTime}ms, $${actualCost.toFixed(4)})`
    );

    if (!passed) {
      errors.forEach(err => console.log(`      • ${err}`));
    }

    return {
      scenario,
      passed,
      actualCost,
      actualTime,
      errors,
      memoryMatches,
      componentCountMatches,
      pageCountMatches,
    };
  } catch (error: any) {
    const actualTime = Date.now() - startTime;
    console.log(`   ❌ ERROR: ${error.message}`);

    return {
      scenario,
      passed: false,
      actualCost: 0,
      actualTime,
      errors: [error.message],
      memoryMatches: false,
      componentCountMatches: false,
      pageCountMatches: false,
    };
  }
}

/**
 * Validate memory entries match expectations
 */
function validateMemory(
  actualMemory: any[],
  expectedMemory: EvalScenario['expectedMemory'],
  errors: string[]
): boolean {
  let matches = true;

  for (const expected of expectedMemory) {
    const matching = actualMemory.filter(entry => entry.action === expected.action);

    if (matching.length === 0) {
      errors.push(`Missing memory entry: ${expected.action}`);
      matches = false;
      continue;
    }

    // Check entity type if specified
    if (expected.entityType) {
      const typeMatches = matching.some(entry => entry.entityType === expected.entityType);
      if (!typeMatches) {
        errors.push(`Memory entry ${expected.action} has wrong entityType`);
        matches = false;
      }
    }

    // Check count if specified
    if (expected.count !== undefined) {
      if (matching.length !== expected.count) {
        errors.push(`Memory entry ${expected.action} count mismatch: expected ${expected.count}, got ${matching.length}`);
        matches = false;
      }
    }

    // Check entity ID if specified
    if (expected.entityId) {
      const idMatches = matching.some(entry => entry.entityId === expected.entityId);
      if (!idMatches) {
        errors.push(`Memory entry ${expected.action} missing entityId: ${expected.entityId}`);
        matches = false;
      }
    }
  }

  return matches;
}

/**
 * Run the full evaluation suite
 */
async function runEvalSuite(options: {
  category?: 'simple' | 'medium' | 'complex';
  id?: string;
} = {}): Promise<EvalSummary> {
  // Filter scenarios based on options
  let scenarios = evalDataset;

  if (options.id) {
    scenarios = scenarios.filter(s => s.id === options.id);
    if (scenarios.length === 0) {
      console.error(`❌ Scenario not found: ${options.id}`);
      process.exit(1);
    }
  } else if (options.category) {
    scenarios = scenarios.filter(s => s.category === options.category);
  }

  console.log(`\n🚀 Starting Eval Suite: ${scenarios.length} scenarios`);
  console.log(`   Category: ${options.category || 'all'}`);

  const budget = calculateTotalBudget();
  console.log(`   Estimated cost: $${budget.cost.toFixed(4)}`);
  console.log(`   Estimated time: ${(budget.time / 1000).toFixed(1)}s\n`);

  // Run all scenarios sequentially
  const results: EvalResult[] = [];
  let totalCost = 0;
  let totalTime = 0;

  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
    totalCost += result.actualCost;
    totalTime += result.actualTime;
  }

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const passRate = (passed / results.length) * 100;

  const summary: EvalSummary = {
    totalScenarios: results.length,
    passed,
    failed,
    passRate,
    totalCost,
    totalTime,
    results,
  };

  return summary;
}

/**
 * Print summary report
 */
function printSummary(summary: EvalSummary) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 EVAL SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Scenarios: ${summary.totalScenarios}`);
  console.log(`Passed:          ${summary.passed} (${summary.passRate.toFixed(1)}%)`);
  console.log(`Failed:          ${summary.failed}`);
  console.log(`Total Cost:      $${summary.totalCost.toFixed(4)}`);
  console.log(`Total Time:      ${(summary.totalTime / 1000).toFixed(1)}s`);
  console.log(`${'='.repeat(60)}`);

  if (summary.failed > 0) {
    console.log(`\n❌ Failed Scenarios:`);
    summary.results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`\n  ${r.scenario.id}`);
        r.errors.forEach(err => console.log(`    • ${err}`));
      });
  }

  if (summary.passRate >= 90) {
    console.log(`\n✅ SUCCESS: ${summary.passRate.toFixed(1)}% pass rate (>= 90% target)`);
  } else {
    console.log(`\n⚠️  WARNING: ${summary.passRate.toFixed(1)}% pass rate (< 90% target)`);
  }
}

/**
 * Main entry point
 */
async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      options.category = args[i + 1] as 'simple' | 'medium' | 'complex';
      i++;
    } else if (args[i] === '--id' && args[i + 1]) {
      options.id = args[i + 1];
      i++;
    }
  }

  try {
    const summary = await runEvalSuite(options);
    printSummary(summary);

    // Exit with error code if pass rate < 90%
    if (summary.passRate < 90) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

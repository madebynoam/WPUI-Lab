/**
 * Table Create Tool - JBTD (Job-To-Be-Done) for DataViews/Tables
 *
 * Based on Anthropic's principle: "Consolidate functionality"
 * Reduces "create a users table" from 10+ parameters to 1 simple call
 */

import { AgentTool, ToolContext, ToolResult } from '../types';
import { ComponentNode } from '../../types';

// Pre-defined table templates
const TABLE_TEMPLATES = {
  users: {
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'email', label: 'Email' },
      { id: 'role', label: 'Role' },
      { id: 'status', label: 'Status' },
    ],
    sampleData: [
      { id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin', status: 'Active' },
      { id: 2, name: 'Michael Chen', email: 'michael@example.com', role: 'Editor', status: 'Active' },
      { id: 3, name: 'Emily Davis', email: 'emily@example.com', role: 'Member', status: 'Active' },
    ],
  },
  orders: {
    columns: [
      { id: 'orderId', label: 'Order ID' },
      { id: 'customer', label: 'Customer' },
      { id: 'total', label: 'Total' },
      { id: 'status', label: 'Status' },
      { id: 'date', label: 'Date' },
    ],
    sampleData: [
      { id: 1, orderId: '#ORD-1001', customer: 'John Smith', total: '$245.00', status: 'Completed', date: '2025-01-20' },
      { id: 2, orderId: '#ORD-1002', customer: 'Emma Wilson', total: '$189.50', status: 'Processing', date: '2025-01-21' },
      { id: 3, orderId: '#ORD-1003', customer: 'Robert Brown', total: '$320.00', status: 'Shipped', date: '2025-01-21' },
    ],
  },
  products: {
    columns: [
      { id: 'name', label: 'Product Name' },
      { id: 'sku', label: 'SKU' },
      { id: 'price', label: 'Price' },
      { id: 'stock', label: 'Stock' },
      { id: 'category', label: 'Category' },
    ],
    sampleData: [
      { id: 1, name: 'Wireless Headphones', sku: 'WH-001', price: '$89.99', stock: 45, category: 'Electronics' },
      { id: 2, name: 'Smart Watch', sku: 'SW-002', price: '$199.99', stock: 23, category: 'Electronics' },
      { id: 3, name: 'Laptop Stand', sku: 'LS-003', price: '$49.99', stock: 67, category: 'Accessories' },
    ],
  },
  tasks: {
    columns: [
      { id: 'task', label: 'Task' },
      { id: 'assignee', label: 'Assignee' },
      { id: 'priority', label: 'Priority' },
      { id: 'status', label: 'Status' },
      { id: 'due', label: 'Due Date' },
    ],
    sampleData: [
      { id: 1, task: 'Update homepage design', assignee: 'Sarah J.', priority: 'High', status: 'In Progress', due: '2025-01-25' },
      { id: 2, task: 'Fix login bug', assignee: 'Michael C.', priority: 'Critical', status: 'In Progress', due: '2025-01-23' },
      { id: 3, task: 'Write API documentation', assignee: 'Emily D.', priority: 'Medium', status: 'To Do', due: '2025-01-28' },
    ],
  },
  invoices: {
    columns: [
      { id: 'invoice', label: 'Invoice #' },
      { id: 'client', label: 'Client' },
      { id: 'amount', label: 'Amount' },
      { id: 'status', label: 'Status' },
      { id: 'due', label: 'Due Date' },
    ],
    sampleData: [
      { id: 1, invoice: 'INV-2025-001', client: 'Acme Corp', amount: '$2,450.00', status: 'Paid', due: '2025-02-15' },
      { id: 2, invoice: 'INV-2025-002', client: 'TechStart Inc', amount: '$1,890.00', status: 'Pending', due: '2025-02-18' },
      { id: 3, invoice: 'INV-2025-003', client: 'Global Industries', amount: '$5,200.00', status: 'Paid', due: '2025-02-20' },
    ],
  },
  transactions: {
    columns: [
      { id: 'txnId', label: 'Transaction ID' },
      { id: 'type', label: 'Type' },
      { id: 'amount', label: 'Amount' },
      { id: 'status', label: 'Status' },
      { id: 'date', label: 'Date' },
    ],
    sampleData: [
      { id: 1, txnId: 'TXN-5001', type: 'Payment', amount: '$1,250.00', status: 'Completed', date: '2025-01-20' },
      { id: 2, txnId: 'TXN-5002', type: 'Refund', amount: '-$89.50', status: 'Completed', date: '2025-01-20' },
      { id: 3, txnId: 'TXN-5003', type: 'Payment', amount: '$540.00', status: 'Pending', date: '2025-01-21' },
    ],
  },
  tickets: {
    columns: [
      { id: 'ticket', label: 'Ticket #' },
      { id: 'subject', label: 'Subject' },
      { id: 'customer', label: 'Customer' },
      { id: 'priority', label: 'Priority' },
      { id: 'status', label: 'Status' },
    ],
    sampleData: [
      { id: 1, ticket: '#TKT-1234', subject: 'Login issues', customer: 'John Doe', priority: 'High', status: 'Open' },
      { id: 2, ticket: '#TKT-1235', subject: 'Payment not processing', customer: 'Jane Smith', priority: 'Critical', status: 'In Progress' },
      { id: 3, ticket: '#TKT-1236', subject: 'Feature request', customer: 'Bob Johnson', priority: 'Low', status: 'Open' },
    ],
  },
  inventory: {
    columns: [
      { id: 'item', label: 'Item' },
      { id: 'sku', label: 'SKU' },
      { id: 'quantity', label: 'Quantity' },
      { id: 'location', label: 'Location' },
      { id: 'status', label: 'Status' },
    ],
    sampleData: [
      { id: 1, item: 'Laptop - Model X1', sku: 'LAP-X1-001', quantity: 45, location: 'Warehouse A', status: 'In Stock' },
      { id: 2, item: 'Monitor 27"', sku: 'MON-27-002', quantity: 12, location: 'Warehouse B', status: 'Low Stock' },
      { id: 3, item: 'Wireless Mouse', sku: 'MOU-WL-003', quantity: 156, location: 'Warehouse A', status: 'In Stock' },
    ],
  },
  leads: {
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'company', label: 'Company' },
      { id: 'email', label: 'Email' },
      { id: 'score', label: 'Lead Score' },
      { id: 'status', label: 'Status' },
    ],
    sampleData: [
      { id: 1, name: 'Jennifer Clark', company: 'Tech Innovations', email: 'j.clark@techinno.com', score: 85, status: 'Hot' },
      { id: 2, name: 'Thomas Anderson', company: 'Digital Solutions', email: 't.anderson@digsol.com', score: 62, status: 'Warm' },
      { id: 3, name: 'Maria Garcia', company: 'Startup Inc', email: 'm.garcia@startup.com', score: 45, status: 'Cold' },
    ],
  },
};

/**
 * table_create - ONE call to create a complete table
 * Handles all DataViews complexity internally
 */
export const table_create: AgentTool = {
  name: 'table_create',
  description: `Create a data table (DataViews component) in ONE call! Use this for "add a users table", "create a products table", etc.

IMPORTANT: Use this instead of manually creating DataViews components. This tool handles all the complexity.

Available templates: users, orders, products, tasks, invoices, transactions, tickets, inventory, leads

Examples:
- table_create({ template: "users" })
- table_create({ template: "products" })
- table_create({ template: "custom", columns: [{id: "name", label: "Name"}], data: [{id: 1, name: "Test"}] })`,
  category: 'action',
  parameters: {
    template: {
      type: 'string',
      description: 'Table template: users, orders, products, tasks, invoices, transactions, tickets, inventory, leads, OR custom',
      required: true,
    },
    columns: {
      type: 'object',
      description: 'Array of {id, label} objects (only for custom template)',
      required: false,
    },
    data: {
      type: 'object',
      description: 'Array of data objects (only for custom template)',
      required: false,
    },
    parentId: {
      type: 'string',
      description: 'Parent component ID (optional, defaults to root)',
      required: false,
    },
    viewType: {
      type: 'string',
      description: 'table (default), grid, or list',
      required: false,
      default: 'table',
    },
    itemsPerPage: {
      type: 'number',
      description: 'Items per page (default: 10)',
      required: false,
      default: 10,
    },
  },
  execute: async (
    params: {
      template: string;
      columns?: Array<{ id: string; label: string }>;
      data?: Array<any>;
      parentId?: string;
      viewType?: 'table' | 'grid' | 'list';
      itemsPerPage?: number;
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    const { template, columns, data, parentId, viewType = 'table', itemsPerPage = 10 } = params;

    // Get template data
    let tableColumns: Array<{ id: string; label: string }>;
    let tableData: Array<any>;

    if (template === 'custom') {
      if (!columns || !data) {
        return {
          success: false,
          message: 'Custom template requires both "columns" and "data" parameters',
          error: 'Missing parameters',
        };
      }
      tableColumns = columns;
      tableData = data;
    } else {
      const templateData = TABLE_TEMPLATES[template as keyof typeof TABLE_TEMPLATES];
      if (!templateData) {
        return {
          success: false,
          message: `Unknown template "${template}". Available: ${Object.keys(TABLE_TEMPLATES).join(', ')}, custom`,
          error: 'Invalid template',
        };
      }
      tableColumns = templateData.columns;
      tableData = templateData.sampleData;
    }

    // Create DataViews component
    const dataViewsNode: ComponentNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'DataViews',
      name: '',
      props: {
        dataSource: 'custom',
        data: tableData,
        columns: tableColumns,
        viewType,
        itemsPerPage,
      },
      children: [],
      interactions: [],
    };

    // Add to tree
    context.addComponent(dataViewsNode, parentId);

    return {
      success: true,
      message: `Created ${template} table with ${tableData.length} rows and ${tableColumns.length} columns${parentId ? ' inside selected component' : ''}`,
      data: {
        template,
        rows: tableData.length,
        columns: tableColumns.length,
        componentId: dataViewsNode.id,
      },
    };
  },
};

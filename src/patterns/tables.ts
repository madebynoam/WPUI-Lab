import { Pattern } from './types';

/**
 * Data Table Patterns
 *
 * Pre-built table templates for common web app data types.
 * All use DataViews component with sample data.
 */

export const tablePatterns: Pattern[] = [
  // Users Table
  {
    id: 'users-table',
    name: 'Users Table',
    description: 'User directory with name, email, role, and status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin', status: 'Active', joined: '2024-01-15' },
          { id: 2, name: 'Michael Chen', email: 'michael@example.com', role: 'Editor', status: 'Active', joined: '2024-02-20' },
          { id: 3, name: 'Emily Davis', email: 'emily@example.com', role: 'Member', status: 'Active', joined: '2024-03-10' },
          { id: 4, name: 'James Wilson', email: 'james@example.com', role: 'Member', status: 'Inactive', joined: '2024-01-05' },
          { id: 5, name: 'Lisa Anderson', email: 'lisa@example.com', role: 'Editor', status: 'Active', joined: '2024-04-12' },
        ],
        columns: [
          { id: 'name', label: 'Name' },
          { id: 'email', label: 'Email' },
          { id: 'role', label: 'Role' },
          { id: 'status', label: 'Status' },
          { id: 'joined', label: 'Joined' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Orders Table
  {
    id: 'orders-table',
    name: 'Orders Table',
    description: 'Order management table with order details and status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, orderId: '#ORD-1001', customer: 'John Smith', total: '$245.00', status: 'Completed', date: '2025-01-20' },
          { id: 2, orderId: '#ORD-1002', customer: 'Emma Wilson', total: '$189.50', status: 'Processing', date: '2025-01-21' },
          { id: 3, orderId: '#ORD-1003', customer: 'Robert Brown', total: '$320.00', status: 'Shipped', date: '2025-01-21' },
          { id: 4, orderId: '#ORD-1004', customer: 'Lisa Taylor', total: '$156.75', status: 'Pending', date: '2025-01-22' },
          { id: 5, orderId: '#ORD-1005', customer: 'David Martinez', total: '$410.00', status: 'Completed', date: '2025-01-22' },
        ],
        columns: [
          { id: 'orderId', label: 'Order ID' },
          { id: 'customer', label: 'Customer' },
          { id: 'total', label: 'Total' },
          { id: 'status', label: 'Status' },
          { id: 'date', label: 'Date' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Products Table
  {
    id: 'products-table',
    name: 'Products Table',
    description: 'Product catalog with pricing and inventory',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, name: 'Wireless Headphones', sku: 'WH-001', price: '$89.99', stock: 45, category: 'Electronics' },
          { id: 2, name: 'Smart Watch', sku: 'SW-002', price: '$199.99', stock: 23, category: 'Electronics' },
          { id: 3, name: 'Laptop Stand', sku: 'LS-003', price: '$49.99', stock: 67, category: 'Accessories' },
          { id: 4, name: 'USB-C Hub', sku: 'UC-004', price: '$34.99', stock: 12, category: 'Accessories' },
          { id: 5, name: 'Mechanical Keyboard', sku: 'MK-005', price: '$129.99', stock: 0, category: 'Electronics' },
        ],
        columns: [
          { id: 'name', label: 'Product Name' },
          { id: 'sku', label: 'SKU' },
          { id: 'price', label: 'Price' },
          { id: 'stock', label: 'Stock' },
          { id: 'category', label: 'Category' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Transactions Table
  {
    id: 'transactions-table',
    name: 'Transactions Table',
    description: 'Financial transactions with amount, type, and status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, txnId: 'TXN-5001', type: 'Payment', amount: '$1,250.00', status: 'Completed', date: '2025-01-20 14:30' },
          { id: 2, txnId: 'TXN-5002', type: 'Refund', amount: '-$89.50', status: 'Completed', date: '2025-01-20 15:45' },
          { id: 3, txnId: 'TXN-5003', type: 'Payment', amount: '$540.00', status: 'Pending', date: '2025-01-21 09:15' },
          { id: 4, txnId: 'TXN-5004', type: 'Transfer', amount: '$2,100.00', status: 'Completed', date: '2025-01-21 11:20' },
          { id: 5, txnId: 'TXN-5005', type: 'Payment', amount: '$375.25', status: 'Failed', date: '2025-01-22 10:05' },
        ],
        columns: [
          { id: 'txnId', label: 'Transaction ID' },
          { id: 'type', label: 'Type' },
          { id: 'amount', label: 'Amount' },
          { id: 'status', label: 'Status' },
          { id: 'date', label: 'Date & Time' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Tasks Table
  {
    id: 'tasks-table',
    name: 'Tasks Table',
    description: 'Task management with assignees, priority, and status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, task: 'Update homepage design', assignee: 'Sarah J.', priority: 'High', status: 'In Progress', due: '2025-01-25' },
          { id: 2, task: 'Fix login bug', assignee: 'Michael C.', priority: 'Critical', status: 'In Progress', due: '2025-01-23' },
          { id: 3, task: 'Write API documentation', assignee: 'Emily D.', priority: 'Medium', status: 'To Do', due: '2025-01-28' },
          { id: 4, task: 'Review pull requests', assignee: 'James W.', priority: 'Low', status: 'To Do', due: '2025-01-30' },
          { id: 5, task: 'Deploy to production', assignee: 'Lisa A.', priority: 'High', status: 'Blocked', due: '2025-01-24' },
        ],
        columns: [
          { id: 'task', label: 'Task' },
          { id: 'assignee', label: 'Assignee' },
          { id: 'priority', label: 'Priority' },
          { id: 'status', label: 'Status' },
          { id: 'due', label: 'Due Date' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Invoices Table
  {
    id: 'invoices-table',
    name: 'Invoices Table',
    description: 'Invoice tracking with amounts, dates, and payment status',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, invoice: 'INV-2025-001', client: 'Acme Corp', amount: '$2,450.00', status: 'Paid', issued: '2025-01-15', due: '2025-02-15' },
          { id: 2, invoice: 'INV-2025-002', client: 'TechStart Inc', amount: '$1,890.00', status: 'Pending', issued: '2025-01-18', due: '2025-02-18' },
          { id: 3, invoice: 'INV-2025-003', client: 'Global Industries', amount: '$5,200.00', status: 'Paid', issued: '2025-01-20', due: '2025-02-20' },
          { id: 4, invoice: 'INV-2025-004', client: 'SmallBiz LLC', amount: '$975.50', status: 'Overdue', issued: '2024-12-20', due: '2025-01-20' },
          { id: 5, invoice: 'INV-2025-005', client: 'Enterprise Solutions', amount: '$3,150.00', status: 'Draft', issued: '2025-01-22', due: '2025-02-22' },
        ],
        columns: [
          { id: 'invoice', label: 'Invoice #' },
          { id: 'client', label: 'Client' },
          { id: 'amount', label: 'Amount' },
          { id: 'status', label: 'Status' },
          { id: 'issued', label: 'Issued' },
          { id: 'due', label: 'Due Date' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Activity Logs Table
  {
    id: 'logs-table',
    name: 'Activity Logs Table',
    description: 'System activity logs with user actions and timestamps',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, user: 'admin@example.com', action: 'User Login', resource: 'Authentication', level: 'Info', timestamp: '2025-01-22 14:32:15' },
          { id: 2, user: 'sarah@example.com', action: 'Created Product', resource: 'Products', level: 'Info', timestamp: '2025-01-22 14:35:22' },
          { id: 3, user: 'system', action: 'Database Backup', resource: 'System', level: 'Info', timestamp: '2025-01-22 15:00:00' },
          { id: 4, user: 'michael@example.com', action: 'Failed Login Attempt', resource: 'Authentication', level: 'Warning', timestamp: '2025-01-22 15:12:45' },
          { id: 5, user: 'emily@example.com', action: 'Updated Settings', resource: 'Configuration', level: 'Info', timestamp: '2025-01-22 15:28:10' },
        ],
        columns: [
          { id: 'timestamp', label: 'Timestamp' },
          { id: 'user', label: 'User' },
          { id: 'action', label: 'Action' },
          { id: 'resource', label: 'Resource' },
          { id: 'level', label: 'Level' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Inventory Table
  {
    id: 'inventory-table',
    name: 'Inventory Table',
    description: 'Inventory management with stock levels and warehouse location',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, item: 'Laptop - Model X1', sku: 'LAP-X1-001', quantity: 45, location: 'Warehouse A', status: 'In Stock' },
          { id: 2, item: 'Monitor 27"', sku: 'MON-27-002', quantity: 12, location: 'Warehouse B', status: 'Low Stock' },
          { id: 3, item: 'Wireless Mouse', sku: 'MOU-WL-003', quantity: 156, location: 'Warehouse A', status: 'In Stock' },
          { id: 4, item: 'USB-C Cable 2m', sku: 'CBL-UC-004', quantity: 0, location: 'Warehouse C', status: 'Out of Stock' },
          { id: 5, item: 'Desk Lamp LED', sku: 'LMP-LD-005', quantity: 8, location: 'Warehouse B', status: 'Low Stock' },
        ],
        columns: [
          { id: 'item', label: 'Item' },
          { id: 'sku', label: 'SKU' },
          { id: 'quantity', label: 'Quantity' },
          { id: 'location', label: 'Location' },
          { id: 'status', label: 'Status' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Leads Table
  {
    id: 'leads-table',
    name: 'Leads Table',
    description: 'Sales leads tracking with contact info and lead score',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, name: 'Jennifer Clark', company: 'Tech Innovations', email: 'j.clark@techinno.com', score: 85, status: 'Hot', source: 'Website' },
          { id: 2, name: 'Thomas Anderson', company: 'Digital Solutions', email: 't.anderson@digsol.com', score: 62, status: 'Warm', source: 'Referral' },
          { id: 3, name: 'Maria Garcia', company: 'Startup Inc', email: 'm.garcia@startup.com', score: 45, status: 'Cold', source: 'LinkedIn' },
          { id: 4, name: 'Kevin Lee', company: 'Enterprise Corp', email: 'k.lee@entcorp.com', score: 92, status: 'Hot', source: 'Conference' },
          { id: 5, name: 'Rachel Brown', company: 'SMB Services', email: 'r.brown@smbserv.com', score: 58, status: 'Warm', source: 'Email Campaign' },
        ],
        columns: [
          { id: 'name', label: 'Name' },
          { id: 'company', label: 'Company' },
          { id: 'email', label: 'Email' },
          { id: 'score', label: 'Lead Score' },
          { id: 'status', label: 'Status' },
          { id: 'source', label: 'Source' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },

  // Support Tickets Table
  {
    id: 'tickets-table',
    name: 'Support Tickets Table',
    description: 'Customer support tickets with priority and status tracking',
    category: 'Tables',
    tree: {
      type: 'DataViews',
      props: {
        dataSource: 'custom',
        data: [
          { id: 1, ticket: '#TKT-1234', subject: 'Login issues on mobile', customer: 'John Doe', priority: 'High', status: 'Open', updated: '2 hours ago' },
          { id: 2, ticket: '#TKT-1235', subject: 'Payment not processing', customer: 'Jane Smith', priority: 'Critical', status: 'In Progress', updated: '30 min ago' },
          { id: 3, ticket: '#TKT-1236', subject: 'Feature request: Dark mode', customer: 'Bob Johnson', priority: 'Low', status: 'Open', updated: '1 day ago' },
          { id: 4, ticket: '#TKT-1237', subject: 'Email notifications not working', customer: 'Alice Williams', priority: 'Medium', status: 'Waiting', updated: '5 hours ago' },
          { id: 5, ticket: '#TKT-1238', subject: 'How to export data?', customer: 'Charlie Brown', priority: 'Low', status: 'Resolved', updated: '3 days ago' },
        ],
        columns: [
          { id: 'ticket', label: 'Ticket #' },
          { id: 'subject', label: 'Subject' },
          { id: 'customer', label: 'Customer' },
          { id: 'priority', label: 'Priority' },
          { id: 'status', label: 'Status' },
          { id: 'updated', label: 'Last Updated' },
        ],
        viewType: 'table',
        itemsPerPage: 10,
      },
      children: [],
    },
  },
];

/**
 * Mock data generator for DataViews component
 * Generates realistic sample data for preview purposes
 */

interface MockDataItem {
  [key: string]: string | number | boolean;
}

// Sample blog post data (all dates as ISO strings for DataViews compatibility)
const sampleBlogPosts: MockDataItem[] = [
  {
    id: 1,
    title: 'Getting Started with WordPress',
    author: 'Sarah Johnson',
    date: '2024-01-15',
    status: 'published',
    category: 'WordPress',
  },
  {
    id: 2,
    title: 'Advanced Block Editor Tips',
    author: 'Mike Chen',
    date: '2024-01-20',
    status: 'published',
    category: 'Tutorial',
  },
  {
    id: 3,
    title: 'Building Custom Blocks',
    author: 'Emma Rodriguez',
    date: '2024-01-25',
    status: 'draft',
    category: 'Development',
  },
  {
    id: 4,
    title: 'Performance Optimization Guide',
    author: 'John Smith',
    date: '2024-02-01',
    status: 'published',
    category: 'Performance',
  },
  {
    id: 5,
    title: 'Security Best Practices',
    author: 'Lisa Wang',
    date: '2024-02-05',
    status: 'published',
    category: 'Security',
  },
  {
    id: 6,
    title: 'REST API Fundamentals',
    author: 'James Davis',
    date: '2024-02-10',
    status: 'scheduled',
    category: 'API',
  },
  {
    id: 7,
    title: 'Theme Development 101',
    author: 'Ana Garcia',
    date: '2024-02-15',
    status: 'draft',
    category: 'Development',
  },
  {
    id: 8,
    title: 'Multisite Configuration',
    author: 'Tom Wilson',
    date: '2024-02-20',
    status: 'published',
    category: 'WordPress',
  },
];

// Sample product data
const sampleProducts: MockDataItem[] = [
  {
    id: 1,
    name: 'WordPress Starter Theme',
    price: 49.99,
    stock: 150,
    category: 'Themes',
    rating: 4.5,
  },
  {
    id: 2,
    name: 'Advanced Plugin Framework',
    price: 99.99,
    stock: 75,
    category: 'Plugins',
    rating: 4.8,
  },
  {
    id: 3,
    name: 'Performance Optimization Suite',
    price: 79.99,
    stock: 0,
    category: 'Tools',
    rating: 4.3,
  },
  {
    id: 4,
    name: 'Security Hardening Package',
    price: 129.99,
    stock: 50,
    category: 'Tools',
    rating: 4.9,
  },
  {
    id: 5,
    name: 'E-Commerce Block Bundle',
    price: 149.99,
    stock: 120,
    category: 'Plugins',
    rating: 4.6,
  },
];

// Sample user data
const sampleUsers: MockDataItem[] = [
  {
    id: 1,
    name: 'Alice Anderson',
    email: 'alice@example.com',
    role: 'Administrator',
    status: 'active',
  },
  {
    id: 2,
    name: 'Bob Brown',
    email: 'bob@example.com',
    role: 'Editor',
    status: 'active',
  },
  {
    id: 3,
    name: 'Carol Chen',
    email: 'carol@example.com',
    role: 'Author',
    status: 'active',
  },
  {
    id: 4,
    name: 'David Davis',
    email: 'david@example.com',
    role: 'Contributor',
    status: 'inactive',
  },
  {
    id: 5,
    name: 'Eva Evans',
    email: 'eva@example.com',
    role: 'Author',
    status: 'active',
  },
  {
    id: 6,
    name: 'Frank Foster',
    email: 'frank@example.com',
    role: 'Editor',
    status: 'active',
  },
];

export type DataSetType = 'blog' | 'products' | 'users';

/**
 * Get sample data for a given dataset type
 */
export function getMockData(type: DataSetType = 'blog'): MockDataItem[] {
  switch (type) {
    case 'products':
      return sampleProducts;
    case 'users':
      return sampleUsers;
    case 'blog':
    default:
      return sampleBlogPosts;
  }
}

/**
 * Get field definitions for a given dataset type
 */
export function getFieldDefinitions(type: DataSetType = 'blog') {
  switch (type) {
    case 'products':
      return [
        {
          id: 'name',
          type: 'text',
          label: 'Product Name',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.name,
        },
        {
          id: 'price',
          type: 'number',
          label: 'Price',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.price,
        },
        {
          id: 'stock',
          type: 'number',
          label: 'Stock',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.stock,
        },
        {
          id: 'category',
          type: 'text',
          label: 'Category',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.category,
        },
        {
          id: 'rating',
          type: 'number',
          label: 'Rating',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.rating,
        },
      ];
    case 'users':
      return [
        {
          id: 'name',
          type: 'text',
          label: 'Name',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.name,
        },
        {
          id: 'email',
          type: 'text',
          label: 'Email',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.email,
        },
        {
          id: 'role',
          type: 'text',
          label: 'Role',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.role,
        },
        {
          id: 'status',
          type: 'text',
          label: 'Status',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.status,
        },
      ];
    case 'blog':
    default:
      return [
        {
          id: 'title',
          type: 'text',
          label: 'Title',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.title,
        },
        {
          id: 'author',
          type: 'text',
          label: 'Author',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.author,
        },
        {
          id: 'date',
          type: 'date',
          label: 'Date',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.date,
        },
        {
          id: 'status',
          type: 'text',
          label: 'Status',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.status,
        },
        {
          id: 'category',
          type: 'text',
          label: 'Category',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.category,
        },
      ];
  }
}

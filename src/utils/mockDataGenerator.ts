/**
 * Mock data generator for DataViews component
 * Generates realistic sample data for preview purposes
 */

import React from 'react';

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

// Sample sites data
const sampleSites: MockDataItem[] = [
  {
    id: 1,
    name: 'Jetpack Research',
    url: 'jetpackresearch.wordpress.com',
    status: 'Finish setup',
    visitors: 0,
    subscribers: 1,
    plan: 'Free',
    thumbnail: 'https://picsum.photos/seed/site1/400/300',
    favicon: 'J',
  },
  {
    id: 2,
    name: 'Tech Insights Blog',
    url: 'techinsights2024.wordpress.com',
    status: 'Public',
    visitors: 127,
    subscribers: 15,
    plan: 'Personal',
    thumbnail: 'https://picsum.photos/seed/site2/400/300',
    favicon: 'T',
  },
  {
    id: 3,
    name: 'Creative Portfolio',
    url: 'creativeportfolio.wordpress.com',
    status: 'Private',
    visitors: 0,
    subscribers: 3,
    plan: 'Free',
    thumbnail: 'https://picsum.photos/seed/site3/400/300',
    favicon: 'C',
  },
  {
    id: 4,
    name: 'Business Solutions Hub',
    url: 'biz-solutions-hub.wordpress.com',
    status: 'Public',
    visitors: 342,
    subscribers: 28,
    plan: 'Business',
    thumbnail: 'https://picsum.photos/seed/site4/400/300',
    favicon: 'B',
  },
  {
    id: 5,
    name: 'Cooking Adventures',
    url: 'cookingadventures.wordpress.com',
    status: 'Finish setup',
    visitors: 0,
    subscribers: 1,
    plan: 'Free',
    thumbnail: 'https://picsum.photos/seed/site5/400/300',
    favicon: 'C',
  },
  {
    id: 6,
    name: 'Fitness Lifestyle',
    url: 'fitnesslifestyle2024.wordpress.com',
    status: 'Public',
    visitors: 215,
    subscribers: 42,
    plan: 'Premium',
    thumbnail: 'https://picsum.photos/seed/site6/400/300',
    favicon: 'F',
  },
  {
    id: 7,
    name: 'Travel Diary',
    url: 'mytraveldiary.wordpress.com',
    status: 'Private',
    visitors: 0,
    subscribers: 5,
    plan: 'Personal',
    thumbnail: 'https://picsum.photos/seed/site7/400/300',
    favicon: 'T',
  },
  {
    id: 8,
    name: 'Photography Studio',
    url: 'photography-studio-pro.wordpress.com',
    status: 'Public',
    visitors: 521,
    subscribers: 67,
    plan: 'Premium',
    thumbnail: 'https://picsum.photos/seed/site8/400/300',
    favicon: 'P',
  },
  {
    id: 9,
    name: 'Digital Marketing Tips',
    url: 'digitalmarketingtips.wordpress.com',
    status: 'Public',
    visitors: 189,
    subscribers: 23,
    plan: 'Personal',
    thumbnail: 'https://picsum.photos/seed/site9/400/300',
    favicon: 'D',
  },
  {
    id: 10,
    name: 'Sustainable Living',
    url: 'sustainableliving.wordpress.com',
    status: 'Finish setup',
    visitors: 0,
    subscribers: 1,
    plan: 'Free',
    thumbnail: 'https://picsum.photos/seed/site10/400/300',
    favicon: 'S',
  },
  {
    id: 11,
    name: 'E-Learning Platform',
    url: 'elearning-platform.wordpress.com',
    status: 'Public',
    visitors: 678,
    subscribers: 102,
    plan: 'Business',
    thumbnail: 'https://picsum.photos/seed/site11/400/300',
    favicon: 'E',
  },
  {
    id: 12,
    name: 'Pet Care Guide',
    url: 'petcare-guide.wordpress.com',
    status: 'Private',
    visitors: 0,
    subscribers: 8,
    plan: 'Personal',
    thumbnail: 'https://picsum.photos/seed/site12/400/300',
    favicon: 'P',
  },
  {
    id: 13,
    name: 'Fashion Trends 2024',
    url: 'fashion-trends-2024.wordpress.com',
    status: 'Public',
    visitors: 412,
    subscribers: 55,
    plan: 'Premium',
    thumbnail: 'https://picsum.photos/seed/site13/400/300',
    favicon: 'F',
  },
  {
    id: 14,
    name: 'Home Renovation Blog',
    url: 'homerenovationblog.wordpress.com',
    status: 'Public',
    visitors: 156,
    subscribers: 19,
    plan: 'Free',
    thumbnail: 'https://picsum.photos/seed/site14/400/300',
    favicon: 'H',
  },
  {
    id: 15,
    name: 'Startup Chronicles',
    url: 'startup-chronicles.wordpress.com',
    status: 'Finish setup',
    visitors: 0,
    subscribers: 2,
    plan: 'Free',
    thumbnail: 'https://picsum.photos/seed/site15/400/300',
    favicon: 'S',
  },
];

export type DataSetType = 'blog' | 'products' | 'users' | 'sites' | 'custom';

/**
 * Get sample data for a given dataset type
 */
export function getMockData(type: DataSetType = 'sites'): MockDataItem[] {
  switch (type) {
    case 'sites':
      return sampleSites;
    case 'products':
      return sampleProducts;
    case 'users':
      return sampleUsers;
    case 'blog':
      return sampleBlogPosts;
    default:
      return sampleSites;
  }
}

/**
 * Get field definitions for a given dataset type
 */
export function getFieldDefinitions(type: DataSetType = 'sites') {
  switch (type) {
    case 'sites':
      return [
        {
          id: 'thumbnail',
          type: 'media',
          label: '',
          enableSorting: false,
          enableHiding: false,
          getValue: (item: any) => item.thumbnail,
          render: ({ item }: any) => {
            // Return image element for grid view
            if (item.thumbnail) {
              return React.createElement('img', {
                src: item.thumbnail,
                alt: item.name,
                loading: 'lazy',
                style: {
                  width: '100%',
                  aspectRatio: '16/9',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  display: 'block',
                },
              });
            }
            // Fallback to favicon letter
            return React.createElement('div', {
              style: {
                width: '100%',
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f0f0',
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#666',
                borderRadius: '4px',
              },
            }, item.favicon);
          },
        },
        {
          id: 'name',
          type: 'text',
          label: 'Site',
          enableSorting: true,
          enableHiding: false,
          getValue: (item: any) => item.name,
          render: ({ item }: any) => item.name,
        },
        {
          id: 'url',
          type: 'text',
          label: 'URL',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.url,
          render: ({ item }: any) => item.url,
        },
        {
          id: 'status',
          type: 'text',
          label: 'Status',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.status,
          render: ({ item }: any) => item.status,
        },
        {
          id: 'visitors',
          type: 'number',
          label: 'Visitors',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.visitors,
          render: ({ item }: any) => item.visitors.toLocaleString(),
        },
        {
          id: 'subscribers',
          type: 'number',
          label: 'Subscribers',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.subscribers,
          render: ({ item }: any) => item.subscribers,
        },
        {
          id: 'plan',
          type: 'text',
          label: 'Plan',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.plan,
          render: ({ item }: any) => item.plan,
        },
      ];
    case 'products':
      return [
        {
          id: 'name',
          type: 'text',
          label: 'Product Name',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.name,
          render: ({ item }: any) => item.name,
        },
        {
          id: 'price',
          type: 'number',
          label: 'Price',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.price,
          render: ({ item }: any) => `$${item.price}`,
        },
        {
          id: 'stock',
          type: 'number',
          label: 'Stock',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.stock,
          render: ({ item }: any) => item.stock,
        },
        {
          id: 'category',
          type: 'text',
          label: 'Category',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.category,
          render: ({ item }: any) => item.category,
        },
        {
          id: 'rating',
          type: 'number',
          label: 'Rating',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.rating,
          render: ({ item }: any) => `${item.rating}★`,
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
          render: ({ item }: any) => item.name,
        },
        {
          id: 'email',
          type: 'text',
          label: 'Email',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.email,
          render: ({ item }: any) => item.email,
        },
        {
          id: 'role',
          type: 'text',
          label: 'Role',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.role,
          render: ({ item }: any) => item.role,
        },
        {
          id: 'status',
          type: 'text',
          label: 'Status',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.status,
          render: ({ item }: any) => item.status,
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
          render: ({ item }: any) => item.title,
        },
        {
          id: 'author',
          type: 'text',
          label: 'Author',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.author,
          render: ({ item }: any) => item.author,
        },
        {
          id: 'date',
          type: 'date',
          label: 'Date',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.date,
          render: ({ item }: any) => item.date,
        },
        {
          id: 'status',
          type: 'text',
          label: 'Status',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.status,
          render: ({ item }: any) => item.status,
        },
        {
          id: 'category',
          type: 'text',
          label: 'Category',
          enableSorting: true,
          enableHiding: true,
          getValue: (item: any) => item.category,
          render: ({ item }: any) => item.category,
        },
      ];
  }
}

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Plus, 
  FileText, 
  Users, 
  Package,
  FileCheck,
  FolderOpen,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'New Invoice',
    description: 'Create a new invoice for your customer',
    icon: Plus,
    href: '/dashboard/invoices/new',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    title: 'New Customer',
    description: 'Add a new customer to your database',
    icon: Users,
    href: '/dashboard/customers/new',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    title: 'New Product',
    description: 'Add a new product or service',
    icon: Package,
    href: '/dashboard/products/new',
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    title: 'New Offer',
    description: 'Create a new offer for potential customers',
    icon: FileCheck,
    href: '/dashboard/offers/new',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    title: 'New Project',
    description: 'Start a new project',
    icon: FolderOpen,
    href: '/dashboard/projects/new',
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  {
    title: 'View Reports',
    description: 'Analyze your business performance',
    icon: BarChart3,
    href: '/dashboard/reports',
    color: 'bg-pink-500 hover:bg-pink-600'
  }
];

export const QuickActionGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${action.color} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link to={action.href}>
                  <Button className="w-full">
                    {action.title}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

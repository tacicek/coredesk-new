import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Invoice } from '@/types';
import { 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardStatsProps {
  invoices: Invoice[];
  companyName: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  invoices, 
  companyName 
}) => {
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0);

  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending').length;
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid').length;
  const overdueInvoices = invoices.filter(invoice => {
    if (!invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';
  }).length;

  const stats = [
    {
      title: 'Total Revenue',
      value: `€${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Invoices',
      value: totalInvoices.toString(),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Pending Invoices',
      value: pendingInvoices.toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Paid Invoices',
      value: paidInvoices.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Overdue Invoices',
      value: overdueInvoices.toString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to {companyName}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <span className="text-sm text-gray-600">All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

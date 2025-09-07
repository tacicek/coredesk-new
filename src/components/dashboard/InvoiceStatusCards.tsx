import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Invoice } from '@/types';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText 
} from 'lucide-react';

interface InvoiceStatusCardsProps {
  invoices: Invoice[];
}

export const InvoiceStatusCards: React.FC<InvoiceStatusCardsProps> = ({ invoices }) => {
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending');
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');
  const overdueInvoices = invoices.filter(invoice => {
    if (!invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';
  });
  const draftInvoices = invoices.filter(invoice => invoice.status === 'draft');

  const statusCards = [
    {
      title: 'Pending',
      count: pendingInvoices.length,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Paid',
      count: paidInvoices.length,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200'
    },
    {
      title: 'Overdue',
      count: overdueInvoices.length,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200'
    },
    {
      title: 'Draft',
      count: draftInvoices.length,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statusCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={`border-l-4 ${card.borderColor} hover:shadow-lg transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title} Invoices
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {card.count}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {card.count === 1 ? 'invoice' : 'invoices'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';

interface VendorStatsProps {
  stats?: {
    totalRevenue?: number;
    monthlyGrowth?: number;
    totalCustomers?: number;
    averageInvoiceValue?: number;
  };
}

export const VendorStats: React.FC<VendorStatsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      change: stats?.monthlyGrowth || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Monthly Growth',
      value: formatPercentage(stats?.monthlyGrowth || 0),
      change: stats?.monthlyGrowth || 0,
      icon: stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? TrendingUp : TrendingDown,
      color: stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'
    },
    {
      title: 'Total Customers',
      value: (stats?.totalCustomers || 0).toString(),
      change: 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Avg. Invoice Value',
      value: formatCurrency(stats?.averageInvoiceValue || 0),
      change: 0,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {card.value}
              </div>
              {card.change !== 0 && (
                <div className="flex items-center space-x-1 mt-1">
                  {card.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(card.change)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

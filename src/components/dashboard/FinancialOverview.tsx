import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  BarChart3
} from 'lucide-react';

interface FinancialOverviewProps {
  data?: {
    monthlyRevenue?: number[];
    expenses?: number;
    profit?: number;
    profitMargin?: number;
  };
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const monthlyRevenue = data?.monthlyRevenue || [0, 0, 0, 0, 0, 0];
  const expenses = data?.expenses || 0;
  const profit = data?.profit || 0;
  const profitMargin = data?.profitMargin || 0;

  const currentMonthRevenue = monthlyRevenue[monthlyRevenue.length - 1] || 0;
  const previousMonthRevenue = monthlyRevenue[monthlyRevenue.length - 2] || 0;
  const revenueGrowth = previousMonthRevenue > 0 
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Revenue
            </CardTitle>
            <div className="p-2 rounded-full bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentMonthRevenue)}
            </div>
            <div className="flex items-center space-x-1 mt-1">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(Math.abs(revenueGrowth))} from last month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Expenses
            </CardTitle>
            <div className="p-2 rounded-full bg-red-100">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(expenses)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Operating costs
            </p>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Net Profit
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-100">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(profit)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>

        {/* Profit Margin Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Profit Margin
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-100">
              <PieChart className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(profitMargin)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Profit / Revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Revenue Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Revenue chart will be displayed here</p>
              <p className="text-sm text-gray-500 mt-1">
                Connect your accounting software to see detailed analytics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

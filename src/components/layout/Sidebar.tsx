import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  FileCheck, 
  FolderOpen, 
  BarChart3, 
  Settings,
  UserCog,
  Building2
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Offers', href: '/dashboard/offers', icon: FileCheck },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminNavigationItems = [
  { name: 'Admin Dashboard', href: '/admin', icon: UserCog },
  { name: 'Company Management', href: '/admin/company', icon: Building2 },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'System Settings', href: '/admin/settings', icon: Settings },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  const location = useLocation();
  const items = isAdmin ? adminNavigationItems : navigationItems;

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800">
          {isAdmin ? 'Admin Panel' : 'Cozy Invoice'}
        </h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

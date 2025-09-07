import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

interface VendorOverviewProps {
  vendor?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export const VendorOverview: React.FC<VendorOverviewProps> = ({ vendor }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Company Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {vendor?.name || 'Company Name'}
              </p>
              <p className="text-sm text-gray-600">Company Name</p>
            </div>
          </div>
          
          {vendor?.email && (
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{vendor.email}</p>
                <p className="text-sm text-gray-600">Email Address</p>
              </div>
            </div>
          )}
          
          {vendor?.phone && (
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{vendor.phone}</p>
                <p className="text-sm text-gray-600">Phone Number</p>
              </div>
            </div>
          )}
          
          {vendor?.address && (
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{vendor.address}</p>
                <p className="text-sm text-gray-600">Address</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

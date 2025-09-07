import React from 'react';
import { useFeaturePermissions, FeatureName } from '@/contexts/FeaturePermissionsContext';
import FeatureAccessDenied from './FeatureAccessDenied';

interface FeatureGuardProps {
  feature: FeatureName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureDisplayName?: string;
  description?: string;
}

export default function FeatureGuard({ 
  feature, 
  children, 
  fallback, 
  featureDisplayName,
  description 
}: FeatureGuardProps) {
  const { hasPermission, loading } = useFeaturePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <FeatureAccessDenied 
        featureName={featureDisplayName || feature}
        description={description}
      />
    );
  }

  return <>{children}</>;
}
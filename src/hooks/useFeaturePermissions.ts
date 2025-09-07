import { useContext } from 'react';
import { FeaturePermissionsContext, useFeaturePermissions as useFeaturePermissionsFromContext } from '@/contexts/FeaturePermissionsContext';

export const useFeaturePermissions = useFeaturePermissionsFromContext;

export default useFeaturePermissions;
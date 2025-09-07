import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerForm } from './CustomerForm';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (customer: any) => void;
  initialData?: any;
  title?: string;
  description?: string;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Customer',
  description = 'Manage customer information',
}) => {
  const handleSubmit = (customer: any) => {
    if (onSubmit) {
      onSubmit(customer);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <CustomerForm
          onSubmit={handleSubmit}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  );
};

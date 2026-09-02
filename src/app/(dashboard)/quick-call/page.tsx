import { Suspense } from 'react';
import { QuickActivityForm } from '@/components/sales/quick-activity-form';

export default function QuickCallPage() {
  return <Suspense fallback={null}><QuickActivityForm /></Suspense>;
}



import { Suspense } from 'react';
import { ActivityBoard08 } from '@/components/sales/activity-board-08';

export default function QuickCallPage() {
  return (
    <Suspense fallback={null}>
      <ActivityBoard08 />
    </Suspense>
  );
}

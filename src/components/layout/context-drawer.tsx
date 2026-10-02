'use client';

import type { ComponentProps } from 'react';
import { SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type ContextDrawerProps = ComponentProps<typeof SheetContent>;

/**
 * Shared detail panel: a full-screen sheet on phones and a constrained
 * 320–400 px context column from tablet upward.
 */
export function ContextDrawer({
  className,
  side = 'right',
  ...props
}: ContextDrawerProps) {
  return (
    <SheetContent
      side={side}
      className={cn(
        'h-[var(--app-viewport-height,100dvh)] w-screen max-w-none gap-0 overflow-y-auto p-0 md:w-[clamp(20rem,36vw,25rem)] md:max-w-[25rem]',
        className
      )}
      {...props}
    />
  );
}

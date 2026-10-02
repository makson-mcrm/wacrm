import type { ComponentProps } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PaidAIActionProps = ComponentProps<typeof Button> & {
  showIcon?: boolean;
};

/** The only shared action primitive allowed to use the lime AI accent. */
export function PaidAIAction({
  children,
  className,
  showIcon = true,
  ...props
}: PaidAIActionProps) {
  return (
    <Button
      data-slot="paid-ai-action"
      className={cn(
        'border-paid-ai-border bg-paid-ai text-paid-ai-foreground hover:bg-paid-ai-hover',
        className
      )}
      {...props}
    >
      {showIcon ? <Sparkles aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}

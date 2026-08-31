import { redirect } from 'next/navigation';

/**
 * Stable iPhone home-screen shortcut. It intentionally opens the existing
 * universal register instead of creating a second, diverging call module.
 */
export default function QuickCallPage() {
  redirect('/dashboard?quick-call=1');
}


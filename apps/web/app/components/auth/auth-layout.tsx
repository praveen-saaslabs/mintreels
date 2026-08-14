import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mr-ambient flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center">
          <BrandLogo to="/login" markClassName="size-8" wordmarkClassName="text-lg" />
        </div>

        <Card elevated>
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>

        {footer ? (
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

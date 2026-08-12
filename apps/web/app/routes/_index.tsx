import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function IndexPage() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>MintReels</CardTitle>
        <CardDescription>Web application skeleton. UI is not implemented yet.</CardDescription>
      </CardHeader>
      {/* TODO: dashboard for recent recordings, jobs, and suggested hooks */}
    </Card>
  );
}

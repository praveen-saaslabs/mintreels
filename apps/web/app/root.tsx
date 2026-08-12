import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipsPage } from './routes/clips';
import { KnowledgePage } from './routes/knowledge';
import { RecordingsPage } from './routes/recordings';
import { RecordingDetailPage } from './routes/recordings.$id';
import { IndexPage } from './routes/_index';

function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <nav className="flex items-center gap-1 text-sm">
          <Button variant="ghost" nativeButton={false} render={<Link to="/" />} className="font-semibold">
            MintReels
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/recordings" />}>
            Recordings
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/knowledge" />}>
            Knowledge
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/clips" />}>
            Clips
          </Button>
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'recordings', element: <RecordingsPage /> },
      { path: 'recordings/:id', element: <RecordingDetailPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'clips', element: <ClipsPage /> },
    ],
  },
]);

export function Root() {
  return <RouterProvider router={router} />;
}

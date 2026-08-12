import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { ClipsPage } from './routes/clips';
import { KnowledgePage } from './routes/knowledge';
import { RecordingsPage } from './routes/recordings';
import { RecordingDetailPage } from './routes/recordings.$id';
import { IndexPage } from './routes/_index';

function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="font-semibold">
            MintReels
          </Link>
          <Link to="/recordings">Recordings</Link>
          <Link to="/knowledge">Knowledge</Link>
          <Link to="/clips">Clips</Link>
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

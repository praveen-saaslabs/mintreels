import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { IndexPage } from './routes/_index';
import { ClipsPage } from './routes/clips';
import { EditorPage } from './routes/editor.$id';
import { KnowledgePage } from './routes/knowledge';
import { RecordingsPage } from './routes/recordings';
import { RecordingDetailPage } from './routes/recordings.$id';

function Layout() {
  return (
    <div className="min-h-screen">
      <Outlet />
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
      { path: 'editor/:id', element: <EditorPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'clips', element: <ClipsPage /> },
    ],
  },
]);

export function Root() {
  return <RouterProvider router={router} />;
}

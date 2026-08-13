import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/shell/app-shell';
import { ClipsPage } from './routes/clips';
import { KnowledgePage } from './routes/knowledge';
import { RecordingsPage } from './routes/recordings';
import { RecordingDetailPage } from './routes/recordings.$id';
import { SettingsPage } from './routes/settings';
import { IndexPage } from './routes/_index';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'clips', element: <ClipsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'recordings', element: <RecordingsPage /> },
      { path: 'recordings/:id', element: <RecordingDetailPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
    ],
  },
]);

export function Root() {
  return <RouterProvider router={router} />;
}

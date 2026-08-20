import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { LoginDialog } from '@/components/auth/login-dialog';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PublicOnlyRoute } from '@/components/auth/public-only-route';
import { AppShell } from '@/components/shell/app-shell';
import { ClipsPage } from './routes/clips';
import { EditorPage } from './routes/editor.$id';
import { KnowledgePage } from './routes/knowledge';
import { LoginPage } from './routes/login';
import { SettingsPage } from './routes/settings';
import { SignupPage } from './routes/signup';
import { IndexPage } from './routes/_index';

function RootLayout() {
  return (
    <>
      <Outlet />
      <LoginDialog />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
        ],
      },
      {
        // Guests can use the app anonymously (upload/editor/preview/moments/clips).
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <IndexPage /> },
          { path: 'clips', element: <ClipsPage /> },
          { path: 'knowledge', element: <KnowledgePage /> },
          {
            // User-only areas stay behind login.
            element: <ProtectedRoute />,
            children: [{ path: 'settings', element: <SettingsPage /> }],
          },
        ],
      },
      {
        path: '/editor/:id',
        element: <EditorPage />,
      },
    ],
  },
]);

export function Root() {
  return <RouterProvider router={router} />;
}

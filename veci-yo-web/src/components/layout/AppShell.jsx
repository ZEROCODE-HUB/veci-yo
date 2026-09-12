import TopBar from './TopBar';
import BottomNav from './BottomNav';
import ToastContainer from '../ui/Toast';

export default function AppShell({ children, hideTopBar = false }) {
  return (
    <>
      {!hideTopBar && <TopBar />}
      <main
        className="scrollable"
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          background: 'var(--color-bg-app)',
        }}
      >
        {children}
        <ToastContainer />
      </main>
      <BottomNav />
    </>
  );
}

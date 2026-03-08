import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'

const MapPage          = lazy(() => import('./pages/MapPage'))
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'))
const NewReportPage    = lazy(() => import('./pages/NewReportPage'))
const AuthPage         = lazy(() => import('./pages/AuthPage'))
const AdminPage        = lazy(() => import('./pages/AdminPage'))

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
)

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report/:id" element={<ReportDetailPage />} />
        <Route path="/new" element={<NewReportPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  )
}

export default App

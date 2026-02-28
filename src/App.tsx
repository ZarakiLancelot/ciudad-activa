import { Routes, Route } from 'react-router'
import MapPage from './pages/MapPage'
import ReportDetailPage from './pages/ReportDetailPage'
import NewReportPage from './pages/NewReportPage'
import AuthPage from './pages/AuthPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/report/:id" element={<ReportDetailPage />} />
      <Route path="/new" element={<NewReportPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App

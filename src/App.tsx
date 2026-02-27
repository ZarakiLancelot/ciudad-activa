import { Routes, Route } from 'react-router'
import MapPage from './pages/MapPage'
import ReportDetailPage from './pages/ReportDetailPage'
import NewReportPage from './pages/NewReportPage'
import AuthPage from './pages/AuthPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/report/:id" element={<ReportDetailPage />} />
      <Route path="/new" element={<NewReportPage />} />
      <Route path="/auth" element={<AuthPage />} />
    </Routes>
  )
}

export default App

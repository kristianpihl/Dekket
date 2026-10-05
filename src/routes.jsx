import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import PublicLayout from './components/PublicLayout'
import RequireAuth from './components/RequireAuth'
import Account from './pages/Account'
import AddPolicy from './pages/AddPolicy'
import Analysis from './pages/Analysis'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Policies from './pages/Policies'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public pages: top bar + footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vilkar" element={<Terms />} />
        <Route path="/personvern" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Logged-in pages: sidebar on the left. To add a page, add a <Route> here
          and a line in `appNav` in src/content/site.js. */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/legg-til" element={<AddPolicy />} />
        <Route path="/forsikringer" element={<Policies />} />
        <Route path="/analyse" element={<Analysis />} />
        <Route path="/konto" element={<Account />} />
      </Route>
    </Routes>
  )
}

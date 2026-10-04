import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import Footer from './components/Footer'
import Topbar from './components/Topbar'
import AppRoutes from './routes'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Topbar />
        <main className="page">
          <AppRoutes />
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

import { BrowserRouter } from 'react-router-dom'
import Footer from './components/Footer'
import Topbar from './components/Topbar'
import AppRoutes from './routes'

function App() {
  return (
    <BrowserRouter>
      <Topbar />
      <main className="page">
        <AppRoutes />
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App

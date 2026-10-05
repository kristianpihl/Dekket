import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Topbar from './Topbar'

// The frame around the public pages (front page, login): top bar + footer.
// Each page decides its own width — the front page uses full-width colored bands,
// other pages wrap their content in <div className="page">.
export default function PublicLayout() {
  return (
    <>
      <Topbar />
      <main className="public-main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

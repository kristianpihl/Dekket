import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Topbar from './Topbar'

// The frame around the public pages (front page, login): top bar + footer.
export default function PublicLayout() {
  return (
    <>
      <Topbar />
      <main className="page">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

import { useState } from 'react'
import { Offcanvas } from 'react-bootstrap'
import { Outlet } from 'react-router-dom'
import { site } from '../content/site'
import SidebarNav from './SidebarNav'

// The frame around every page inside the app: sidebar on the left (desktop) or a
// hamburger button + slide-in drawer (mobile). The current page renders in <Outlet />.
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="shell">
      <aside className="sidebar d-none d-lg-flex">
        <SidebarNav />
      </aside>

      <div className="shell-main">
        <header className="shell-top d-lg-none">
          <button
            type="button"
            className="icon-btn"
            aria-label="Åpne meny"
            onClick={() => setDrawerOpen(true)}
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>
          <span className="topbar-brand">{site.name}</span>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      <Offcanvas
        show={drawerOpen}
        onHide={() => setDrawerOpen(false)}
        placement="start"
        className="sidebar-drawer"
      >
        <Offcanvas.Header closeButton />
        <Offcanvas.Body>
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  )
}

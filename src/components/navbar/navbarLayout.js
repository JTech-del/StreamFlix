//--------------------------------------
// Navbar Layout
//--------------------------------------

function createNavbarLayout() {
    return `
    <header class="navbar" id="navbar">

      <div class="navbar__container container">

        <!--==================================
          Brand
        ===================================-->
        <a
          href="/"
          class="navbar__brand"
          aria-label="StreamFlix Home"
        >
          <span class="navbar__brand-icon">
            ▶
          </span>

          <span class="navbar__brand-name">
            StreamFlix
          </span>
        </a>

        <!--==================================
          Desktop Navigation
        ===================================-->
        <nav
          class="navbar__navigation"
          aria-label="Primary Navigation"
        >

          <ul class="navbar__menu">

            <li class="navbar__item">
              <a
                href="#"
                class="navbar__link navbar__link--active"
                data-route="home"
                aria-current="page"
              >
                Home
              </a>
            </li>

            <li class="navbar__item">
              <a
                href="#"
                class="navbar__link"
                data-route="movies"
              >
                Movies
              </a>
            </li>

            <li class="navbar__item">
              <a
                href="#"
                class="navbar__link"
                data-route="tv-shows"
              >
                TV Shows
              </a>
            </li>

            <li class="navbar__item">
              <a
                href="#"
                class="navbar__link"
                data-route="discover"
              >
                Discover
              </a>
            </li>

            <li class="navbar__item">
              <a
                href="#"
                class="navbar__link"
                data-route="watchlist"
              >
                My List
              </a>
            </li>

          </ul>

        </nav>

        <!--==================================
          Desktop Actions
        ===================================-->
        <div class="navbar__actions">

          <button
            class="navbar__action"
            type="button"
            aria-label="Open Search"
          >
            <span aria-hidden="true">🔍</span>
          </button>

          <button
            class="navbar__action"
            type="button"
            aria-label="User Profile"
          >
            <span aria-hidden="true">👤</span>
          </button>

        </div>

        <!--==================================
          Mobile Menu Toggle
        ===================================-->
        <button
          class="navbar__toggle"
          id="navbar-toggle"
          type="button"
          aria-label="Open Menu"
          aria-expanded="false"
          aria-controls="navbar-drawer"
        >

          <span class="navbar__toggle-line"></span>
          <span class="navbar__toggle-line"></span>
          <span class="navbar__toggle-line"></span>

        </button>

      </div>

      <!--==================================
        Mobile Navigation Drawer
      ===================================-->
      <aside
        class="navbar__drawer"
        id="navbar-drawer"
        aria-hidden="true"
      >

        <div class="navbar__drawer-header">

          <span class="navbar__drawer-title">
            Navigation
          </span>

          <button
            class="navbar__close"
            id="navbar-close"
            type="button"
            aria-label="Close Menu"
          >
            ✕
          </button>

        </div>

        <nav
          class="navbar__drawer-navigation"
          aria-label="Mobile Navigation"
        >

          <ul class="navbar__drawer-menu">

            <li>
              <a
                href="#"
                class="navbar__drawer-link navbar__drawer-link--active"
                data-route="home"
              >
                Home
              </a>
            </li>

            <li>
              <a
                href="#"
                class="navbar__drawer-link"
                data-route="movies"
              >
                Movies
              </a>
            </li>

            <li>
              <a
                href="#"
                class="navbar__drawer-link"
                data-route="tv-shows"
              >
                TV Shows
              </a>
            </li>

            <li>
              <a
                href="#"
                class="navbar__drawer-link"
                data-route="discover"
              >
                Discover
              </a>
            </li>

            <li>
              <a
                href="#"
                class="navbar__drawer-link"
                data-route="watchlist"
              >
                My List
              </a>
            </li>

          </ul>

        </nav>

        <div class="navbar__drawer-footer">

          <button
            class="navbar__drawer-button"
            type="button"
          >
            Profile
          </button>

          <button
            class="navbar__drawer-button"
            type="button"
          >
            Settings
          </button>

        </div>

      </aside>

      <!--==================================
        Mobile Overlay
      ===================================-->
      <div
        class="navbar__overlay"
        id="navbar-overlay"
        hidden
      ></div>

    </header>
  `;
}

//--------------------------------------
// Export
//--------------------------------------

export { createNavbarLayout };
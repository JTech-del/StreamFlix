//--------------------------------------
// Home Layout
//--------------------------------------
import { createNavbarLayout } from "../../components/navbar/navbarLayout.js";


function createHomeLayout() {
    return `
    ${createNavbarLayout()}

    <main>

      <section class="hero">
        <div class="container">
          <h1>Welcome to StreamFlix</h1>
        </div>
      </section>

    </main>
  `;
}

export { createHomeLayout };
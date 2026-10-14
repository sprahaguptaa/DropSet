// app.js
// The core of the dashboard. It does three things:
//   1. Keeps a list of features (App.register)
//   2. Builds the sidebar menu from that list
//   3. Shows the right feature when the address (#hash) changes
//
// To add a feature, you never edit this file:
//   1. Create a file in js/features/ (copy profile.js, the smallest example)
//   2. Give it an id, title and order, then fill in render()
//   3. Add one <script> line for it in dashboard.html
//
// Feature options:
//   id      – used in the address, e.g. #search
//   title   – the menu label
//   order   – position in the menu (lower = higher up)
//   hidden  – true to keep it out of the menu (detail pages)
//   parent  – id of the menu item to highlight while this page is open
//   render(container, ctx) – draws the page. ctx = { user, store, params }
//             params holds anything after the id, so #gym/crunch-1 gives ['crunch-1']

const App = {
  features: [],

  register(feature) {
    this.features.push(feature);
  },

  // Escape text before putting it inside an HTML template string.
  // Always use this for data that came from a user or a database.
  esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  // Small storage helper. Today it uses the browser; later you can swap
  // these two functions to talk to a server and no feature has to change.
  store: {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('dropset_' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem('dropset_' + key, JSON.stringify(value));
    }
  },

  start() {
    Auth.requireLogin();
    const user = Auth.currentUser();
    if (!user) return;

    document.getElementById('user-name').textContent = user.name;
    document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

    this.features.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    this.buildNav();

    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  buildNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    this.features.filter((f) => !f.hidden).forEach((f) => {
      const link = document.createElement('a');
      link.href = '#' + f.id;
      link.dataset.id = f.id;
      link.textContent = f.title;
      nav.appendChild(link);
    });
  },

  route() {
    const [id, ...params] = location.hash.slice(1).split('/');
    const feature =
      this.features.find((f) => f.id === id) ||
      this.features.find((f) => !f.hidden);
    if (!feature) return;

    const activeId = feature.parent || feature.id;
    document.querySelectorAll('#nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.id === activeId);
    });

    // Each page draws into its own fresh container, so a slow page
    // can never write over the page you navigated to next.
    const page = document.createElement('div');
    document.getElementById('content').replaceChildren(page);
    window.scrollTo(0, 0);

    Promise.resolve(
      feature.render(page, { user: Auth.currentUser(), store: this.store, params })
    ).catch((err) => {
      console.error(err);
      page.innerHTML = '<div class="card"><p class="form-error">Something went wrong loading this page.</p></div>';
    });
  }
};


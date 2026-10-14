// features/home.js
// The overview page. It reads the saved workouts so the numbers stay in sync
// with the Workouts feature.

App.register({
  id: 'home',
  title: 'Home',
  order: 1,

  render(container, { user, store }) {
    const workouts = store.get('workouts', []);

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = workouts.filter((w) => w.date >= weekAgo).length;
    const last = workouts[0];

    container.innerHTML = `
      <h1></h1>
      <p class="muted">Here's a quick look at your training.</p>

      <div class="card-grid">
        <div class="card">
          <small>Workouts this week</small>
          <div class="stat-value">${thisWeek}</div>
        </div>
        <div class="card">
          <small>Total logged</small>
          <div class="stat-value">${workouts.length}</div>
        </div>
        <div class="card">
          <small>Last workout</small>
          <div class="stat-value" id="last-workout"></div>
        </div>
      </div>

      <div class="card">
        <h3>Next up</h3>
        <p class="muted">Log a workout from the Workouts tab to see it here.</p>
      </div>
    `;

    // textContent keeps user-typed values from being read as HTML
    container.querySelector('h1').textContent = 'Hi, ' + user.name;
    container.querySelector('#last-workout').textContent = last ? last.exercise : 'None yet';
  }
});

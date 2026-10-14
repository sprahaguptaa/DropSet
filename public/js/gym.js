// features/gym.js
// One gym's profile page. Opened from search results at #gym/<gym id>.
// It stays out of the menu (hidden) and keeps "Find a gym" highlighted (parent).

App.register({
  id: 'gym',
  title: 'Gym',
  order: 2,
  hidden: true,
  parent: 'search',

  async render(container, { params }) {
    const gym = await Gyms.get(params[0]);

    if (!gym) {
      container.innerHTML = `
        <a class="back-link" href="#search">Back to search</a>
        <div class="card">
          <h3>Gym not found</h3>
          <p class="muted">This gym may have been removed. Head back to search to find another.</p>
        </div>`;
      return;
    }

    const passTypes = [
      { key: 'day', label: 'Day pass', detail: '1 day of access' },
      { key: 'week', label: 'Week pass', detail: '7 days of access' },
      { key: 'month', label: 'Month pass', detail: '30 days of access' }
    ];

    const list = (items) =>
      `<ul class="list">${items.map((i) => `<li>${App.esc(i)}</li>`).join('')}</ul>`;

    container.innerHTML = `
      <a class="back-link" href="#search">Back to search</a>

      <h1>${App.esc(gym.name)}</h1>
      <p class="muted">${App.esc(gym.area)}, ${App.esc(gym.city)}, ${App.esc(gym.state)}</p>
      <div class="tags" style="margin-bottom: 1rem;">
        ${gym.styles.map((s) => `<span class="badge">${App.esc(s)}</span>`).join('')}
      </div>

      <div class="photo-placeholder">Photos coming soon</div>
      <p>${App.esc(gym.blurb)}</p>

      <div class="card">
        <h3>Passes</h3>
        <div class="pass-grid">
          ${passTypes.map((p) => `
            <div class="pass-option">
              <strong>${p.label}</strong>
              <div class="stat-value">$${App.esc(gym.passes[p.key])}</div>
              <small class="muted">${p.detail}</small>
              <button type="button" disabled style="margin-top: 0.75rem;">Buy pass</button>
            </div>
          `).join('')}
        </div>
        <p class="muted" style="margin: 0.75rem 0 0; font-size: 0.9rem;">Buying passes is coming in a later update.</p>
      </div>

      <div class="card">
        <h3>Hours</h3>
        <div class="hours-row"><span>Monday to Friday</span><span>${App.esc(gym.hours.weekday)}</span></div>
        <div class="hours-row"><span>Saturday and Sunday</span><span>${App.esc(gym.hours.weekend)}</span></div>
      </div>

      <div class="two-col">
        <div class="card">
          <h3>Equipment</h3>
          ${list(gym.equipment)}
        </div>
        <div class="card">
          <h3>Amenities</h3>
          ${list(gym.amenities)}
        </div>
      </div>

      <p class="note">Prices, hours and equipment shown here are sample data for the demo.</p>
    `;
  }
});

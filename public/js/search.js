// features/search.js
// Find a gym by place, training style and day-pass price.
// Clicking a result opens the gym page (features/gym.js).

App.register({
  id: 'search',
  title: 'Find a gym',
  order: 1,

  async render(container, { store }) {
    // Remember the last filters so they're still there after viewing a gym.
    const filters = store.get('searchFilters', { query: '', style: '', maxDay: 0 });

    container.innerHTML = `
      <h1>Find a gym</h1>
      <p class="muted">Search by city or gym name, then narrow by how you train.</p>

      <div class="filters">
        <div>
          <label for="s-query">Where are you headed?</label>
          <input id="s-query" type="search" placeholder="City or gym name">
        </div>
        <div>
          <label for="s-style">Training style</label>
          <select id="s-style">
            <option value="">Any style</option>
            ${Gyms.STYLES.map((s) => `<option value="${App.esc(s)}">${App.esc(s)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="s-price">Day pass price</label>
          <select id="s-price">
            <option value="0">Any price</option>
            <option value="15">Up to $15</option>
            <option value="25">Up to $25</option>
            <option value="50">Up to $50</option>
          </select>
        </div>
      </div>

      <p id="s-count" class="muted result-count"></p>
      <div id="s-results"></div>
    `;

    const queryEl = container.querySelector('#s-query');
    const styleEl = container.querySelector('#s-style');
    const priceEl = container.querySelector('#s-price');
    const countEl = container.querySelector('#s-count');
    const resultsEl = container.querySelector('#s-results');

    queryEl.value = filters.query;
    styleEl.value = filters.style;
    priceEl.value = String(filters.maxDay);

    async function update() {
      const current = {
        query: queryEl.value,
        style: styleEl.value,
        maxDay: Number(priceEl.value)
      };
      store.set('searchFilters', current);

      resultsEl.textContent = 'Loading...';
      const gyms = await Gyms.search(current);

      countEl.textContent = gyms.length === 1 ? '1 gym found' : `${gyms.length} gyms found`;

      if (gyms.length === 0) {
        resultsEl.innerHTML = `
          <div class="card">
            <h3>No gyms match</h3>
            <p class="muted">Try a different city, or set the style and price back to "Any."</p>
          </div>`;
        return;
      }

      resultsEl.innerHTML = gyms.map((g) => `
        <a class="card result" href="#gym/${App.esc(g.id)}">
          <div class="result-top">
            <h3>${App.esc(g.name)}</h3>
            <span class="price">$${App.esc(g.passes.day)} / day</span>
          </div>
          <p class="muted">${App.esc(g.area)}, ${App.esc(g.city)}, ${App.esc(g.state)}</p>
          <div class="tags">
            ${g.styles.map((s) => `<span class="badge">${App.esc(s)}</span>`).join('')}
          </div>
        </a>
      `).join('');
    }

    queryEl.addEventListener('input', update);
    styleEl.addEventListener('change', update);
    priceEl.addEventListener('change', update);

    await update();
  }
});

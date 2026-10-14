// features/passes.js
// Placeholder for Digital Pass & Check-In (QR code, activate on arrival).
// This is also the smallest possible feature: copy it to start a new one.

App.register({
  id: 'passes',
  title: 'My passes',
  order: 3,

  render(container) {
    container.innerHTML = `
      <h1>My passes</h1>
      <div class="card">
        <span class="badge">Coming soon</span>
        <p class="muted">Your active and past passes, with a QR code to show at the gym, will live here.</p>
      </div>
    `;
  }
});


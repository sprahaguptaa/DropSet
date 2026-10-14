// features/profile.js
// Placeholder for User Accounts & Profiles (edit profile, saved gyms, pass history).

App.register({
  id: 'profile',
  title: 'Profile',
  order: 4,

  render(container, { user }) {
    container.innerHTML = `
      <h1>Profile</h1>
      <div class="card">
        <span class="badge">Coming soon</span>
        <p class="muted">Edit your profile, save favorite gyms and view pass history here.</p>
        <p>Signed in as <strong id="p-email"></strong></p>
      </div>
    `;
    container.querySelector('#p-email').textContent = user.email;
  }
});


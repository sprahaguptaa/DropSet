// auth.js
// PLACEHOLDER login. Any email + password works right now and the "session"
// is just saved in the browser. When you build a real backend, replace the
// body of login() with an API call. Nothing else in the app needs to change.

const Auth = {
  KEY: 'gymapp_user',

  login(email, password) {
    if (!email || !password) {
      return { ok: false, error: 'Enter your email and password.' };
    }
    const user = { email, name: email.split('@')[0] };
    localStorage.setItem(this.KEY, JSON.stringify(user));
    return { ok: true };
  },

  logout() {
    localStorage.removeItem(this.KEY);
    window.location.href = 'login.html';
  },

  currentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY));
    } catch {
      return null;
    }
  },

  // Call on pages that need a logged-in user.
  requireLogin() {
    if (!this.currentUser()) window.location.href = 'login.html';
  }
};

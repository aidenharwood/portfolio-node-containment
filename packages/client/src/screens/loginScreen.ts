import { CREDENTIAL_RULES } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import { h, type Screen } from '../ui/dom.ts';
import { createBackdrop } from '../ui/backdrop.ts';

type Mode = 'login' | 'register';

export function createLoginScreen(connection: GameConnection): Screen {
  let mode: Mode = 'login';
  const backdrop = createBackdrop();

  const username = h('input', { className: 'field-input', autocomplete: 'username', maxLength: 20, placeholder: 'operative_id' });
  const password = h('input', { className: 'field-input', type: 'password', autocomplete: 'current-password', placeholder: '••••••••' });
  const confirm = h('input', { className: 'field-input', type: 'password', autocomplete: 'new-password', placeholder: 'repeat passphrase' });
  const confirmField = h('label', { className: 'field', hidden: true }, h('span', { className: 'field-label' }, 'Confirm passphrase'), confirm);
  const error = h('p', { className: 'form-error', role: 'alert' });
  const submit = h('button', { className: 'button primary wide', type: 'submit' }, 'Authenticate');
  const loginTab = h('button', { className: 'tab active', type: 'button' }, 'Sign in');
  const registerTab = h('button', { className: 'tab', type: 'button' }, 'Enlist');
  const hint = h('p', { className: 'form-hint' });

  const setMode = (next: Mode) => {
    mode = next;
    loginTab.classList.toggle('active', mode === 'login');
    registerTab.classList.toggle('active', mode === 'register');
    confirmField.hidden = mode === 'login';
    password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    submit.textContent = mode === 'login' ? 'Authenticate' : 'Submit enlistment';
    hint.textContent =
      mode === 'register'
        ? `IDs: 3–20 letters, numbers or underscores. Passphrases: at least ${CREDENTIAL_RULES.passwordMinimumLength} characters.`
        : '';
    error.textContent = '';
  };
  loginTab.onclick = () => setMode('login');
  registerTab.onclick = () => setMode('register');

  const form = h(
    'form',
    { className: 'auth-form', noValidate: true },
    h('div', { className: 'tabs' }, loginTab, registerTab),
    h('label', { className: 'field' }, h('span', { className: 'field-label' }, 'Operative ID'), username),
    h('label', { className: 'field' }, h('span', { className: 'field-label' }, 'Passphrase'), password),
    confirmField,
    hint,
    error,
    submit,
  );

  form.onsubmit = (event) => {
    event.preventDefault();
    error.textContent = '';
    if (!CREDENTIAL_RULES.usernamePattern.test(username.value)) {
      error.textContent = 'Operative IDs are 3–20 letters, numbers or underscores.';
      return;
    }
    if (mode === 'register' && password.value !== confirm.value) {
      error.textContent = 'Passphrases do not match.';
      return;
    }
    submit.disabled = true;
    connection.send({ type: mode === 'login' ? 'auth.login' : 'auth.register', username: username.value, password: password.value });
  };

  const stopListening = connection.on('auth.rejected', ({ reason }) => {
    submit.disabled = false;
    error.textContent = reason;
  });

  const element = h(
    'div',
    { className: 'screen login-screen' },
    backdrop.element,
    h(
      'div',
      { className: 'login-layout' },
      h(
        'header',
        { className: 'brand' },
        h('div', { className: 'brand-mark' }, h('span', {}, 'M')),
        h('h1', { className: 'brand-title' }, 'CONTAINMENT'),
        h('p', { className: 'brand-subtitle' }, 'Meridian Directorate · Site Personnel Terminal'),
      ),
      h('section', { className: 'panel auth-panel' }, h('div', { className: 'panel-heading' }, 'Secure Access'), form),
      h('p', { className: 'legal' }, 'Unauthorised access will be logged, contained, and studied.'),
    ),
  );

  queueMicrotask(() => username.focus());
  return {
    element,
    unmount: () => {
      stopListening();
      backdrop.dispose();
    },
  };
}

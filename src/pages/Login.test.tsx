/**
 * Login page test — verifies that a failed Supabase auth shows a clear error.
 * Tests the REAL Login.jsx (full-featured page with online check, styled UI).
 * Login.tsx was deleted — that was a bare-bones stub that didn't match production.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// ── Mock Supabase before any imports that touch it ─────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
  HOUSES:   [],
  SESSIONS: [],
}));

// ── Mock AuthContext so Login.jsx's useAuth() doesn't blow up ──────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: null, role: null }),
}));

// ── Mock navigator.onLine so the online guard passes ──────────────────────
Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

// Import the REAL login page (not the deleted stub)
import Login from './Login.jsx';

describe('Login Page (real Login.jsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields with a Sign In button', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    // Real login page uses "Sign In" not "Log In"
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('shows an error message on invalid credentials', async () => {
    const { supabase } = await import('../lib/supabase');
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i),    { target: { value: 'test@jnv.ac.in' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // Login.jsx displays a visible error element when auth fails
      const error = screen.queryByText(/invalid/i) ?? screen.queryByRole('alert');
      expect(error).toBeTruthy();
    });
  });

  it('does not submit when fields are empty', async () => {
    const { supabase } = await import('../lib/supabase');

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // signInWithPassword should NOT have been called (HTML5 required validation)
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

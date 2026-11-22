import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type { AppState } from './lib/types';

function seededState(): AppState {
  const now = new Date().toISOString();
  return {
    version: 1,
    profile: { name: 'Yashasva', createdAt: now },
    persons: [
      { id: 'p_rahul', name: 'Rahul Sharma', aliases: ['Rahul'], upi: 'rahul@okaxis', color: 'clay', createdAt: now },
      { id: 'p_priya', name: 'Priya Verma', aliases: [], color: 'leaf', createdAt: now },
    ],
    txns: [
      {
        id: 't_1',
        personId: 'p_rahul',
        direction: 'out',
        amount: 500,
        note: 'Chai',
        category: 'food',
        date: now,
        source: 'manual',
        createdAt: now,
      },
      {
        id: 't_2',
        personId: 'p_priya',
        direction: 'in',
        amount: 200,
        note: 'Auto',
        category: 'travel',
        date: now,
        source: 'manual',
        createdAt: now,
      },
    ],
    settings: { onboarded: true, sound: true },
  };
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('onboarding', () => {
  it('takes the name and lands on home', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/apna hisaab/i)).toBeTruthy();
    await user.type(screen.getByLabelText(/aapka naam/i), 'Yashasva');
    await user.click(screen.getByRole('button', { name: /shuru karo/i }));
    expect(await screen.findByText('Namaste, Yashasva')).toBeTruthy();
    expect(screen.getByText('Kul hisaab')).toBeTruthy();
  });

  it('can load sample data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /sample hisaab dekho/i }));
    await waitFor(() => expect(screen.getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0));
    expect(screen.getByText(/Aapke log/)).toBeTruthy();
  });
});

describe('home and people', () => {
  it('shows net balance and person rows', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    render(<App />);
    expect(await screen.findByText('Namaste, Yashasva')).toBeTruthy();
    expect(document.querySelector('.hero-net')?.textContent).toContain('Log aapko');
    expect(document.querySelector('.hero-net')?.textContent).toContain('₹300');
    expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
  });

  it('opens a person khata from home', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByText('Rahul Sharma'));
    expect(await screen.findByText('Khata')).toBeTruthy();
    expect(screen.getByText('Aapko milenge')).toBeTruthy();
    expect(screen.getAllByText('₹500').length).toBeGreaterThan(0);
  });
});

describe('smart add', () => {
  it('parses a chat message, creates a new person and updates the balance', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /naya hisaab daalo/i }));
    await user.click(await screen.findByRole('tab', { name: /chat \/ sms/i }));
    await user.type(
      await screen.findByLabelText(/message ya sms paste karo/i),
      'Maine Rahul ko auto ke liye 90 rupaye diye',
    );
    await user.click(screen.getByRole('button', { name: /samjho/i }));

    expect(await screen.findByText('Yeh samajh aaya')).toBeTruthy();
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('90');
    expect(screen.getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /hisaab mein daalo/i }));
    expect(await screen.findByText('Hisaab mein daal diya')).toBeTruthy();
    expect(screen.getByText('Rahul Sharma ke khate mein add ho gaya')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /rahul ka khata dekho/i }));
    expect(await screen.findByText('Khata')).toBeTruthy();
    expect(screen.getAllByText('₹590').length).toBeGreaterThan(0);
  });

  it('auto-creates a brand new khata when the name is new', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /naya hisaab daalo/i }));
    await user.click(await screen.findByRole('tab', { name: /chat \/ sms/i }));
    await user.type(
      await screen.findByLabelText(/message ya sms paste karo/i),
      'You paid ₹1,250 to Suresh Menon\nsuresh.menon@ybl\nPayment successful',
    );
    await user.click(screen.getByRole('button', { name: /samjho/i }));

    expect(await screen.findByText('Yeh samajh aaya')).toBeTruthy();
    expect(screen.getByText(/Suresh Menon.*naya khata ban jaayega/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /hisaab mein daalo/i }));
    expect(await screen.findByText(/Naya khata ban gaya — Suresh Menon/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /ghar chalo/i }));
    await waitFor(() => expect(screen.getAllByText('Suresh Menon').length).toBeGreaterThan(0));
    expect(document.querySelector('.hero-net')?.textContent).toContain('Log aapko');
  });
});

describe('manual entry and settle', () => {
  it('settles a khata to zero', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    window.location.hash = '#/person/p_rahul';
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Aapko milenge')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /settle/i }));
    expect(await screen.findByText('Poora hisaab clear karein?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /haan, clear karo/i }));
    await waitFor(() => expect(screen.getByText('Hisaab clear')).toBeTruthy());
  });

  it('adds a manual transaction from the person page', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    window.location.hash = '#/person/p_priya';
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /^naya$/i }));
    expect(await screen.findByText('Unhone diye')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /unhone diye/i }));
    await user.type(screen.getByLabelText('Amount'), '300');
    await user.type(screen.getByPlaceholderText(/chai, auto, kiraya/i), 'Movie');
    await user.click(screen.getByRole('button', { name: /hisaab mein daalo/i }));

    await waitFor(() => expect(screen.getAllByText('Movie').length).toBeGreaterThan(0));
    expect(screen.getByText('Aapko dene hain')).toBeTruthy();
    expect(screen.getAllByText('₹500').length).toBeGreaterThan(0);
  });
});

describe('navigation', () => {
  it('visits all tabs without crashing', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });

    await user.click(within(nav).getByRole('button', { name: /kitaab/i }));
    expect(await screen.findByText('Poora hisaab, ek jagah')).toBeTruthy();

    await user.click(within(nav).getByRole('button', { name: /^log$/i }));
    expect(await screen.findByText('Aapke log')).toBeTruthy();

    await user.click(within(nav).getByRole('button', { name: /^aap$/i }));
    expect(await screen.findByText('Profile, backup aur app')).toBeTruthy();

    await user.click(within(nav).getByRole('button', { name: /naya hisaab daalo/i }));
    expect(await screen.findByText('Screenshot, chat ya khud likho')).toBeTruthy();
  });
});

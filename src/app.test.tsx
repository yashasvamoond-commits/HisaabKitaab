import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type { AppState } from './lib/types';

const ocrMock = vi.fn();
vi.mock('./lib/ocr', () => ({
  ocrImage: (...args: unknown[]) => ocrMock(...args),
}));

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
  ocrMock.mockReset();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: vi.fn(() => 'blob:preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() });
});

describe('onboarding', () => {
  it('takes the name and lands on home', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/shared expenses,/i)).toBeTruthy();
    await user.type(screen.getByLabelText(/what should we call you/i), 'Yashasva');
    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(await screen.findByText('Total balance')).toBeTruthy();
    expect(screen.getByText('Welcome, Yashasva. Add your first expense below.')).toBeTruthy();
  });

  it('can load sample data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /explore with sample data/i }));
    await waitFor(() => expect(screen.getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0));
    expect(screen.getAllByText('People').length).toBeGreaterThan(0);
  });
});

describe('home and people', () => {
  it('shows the net balance in the right direction', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    render(<App />);
    expect(await screen.findByText('Total balance')).toBeTruthy();
    expect(document.querySelector('.balance-title')?.textContent).toContain('You are owed');
    expect(document.querySelector('.balance-title')?.textContent).toContain('₹300');
    expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
  });

  it('opens a person page from home', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByText('Rahul Sharma'));
    expect(await screen.findByText('History')).toBeTruthy();
    expect(screen.getByText('You are owed')).toBeTruthy();
    expect(screen.getAllByText('₹500').length).toBeGreaterThan(0);
  });
});

describe('add from a message', () => {
  it('parses a Hinglish chat, matches the person and updates the balance', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /^add expense$/i }));
    await user.click(await screen.findByRole('button', { name: /^message$/i }));
    await user.type(
      await screen.findByLabelText(/message text/i),
      'Maine Rahul ko auto ke liye 90 rupaye diye',
    );
    await user.click(screen.getByRole('button', { name: /read message/i }));

    expect(await screen.findByText('Review expense')).toBeTruthy();
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('90');
    expect(screen.getAllByText(/Rahul Sharma/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /save expense/i }));
    expect(await screen.findByText('Entry added')).toBeTruthy();
    expect(screen.getByText('Saved with Rahul Sharma')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /view rahul/i }));
    expect(await screen.findByText('History')).toBeTruthy();
    expect(screen.getAllByText('₹590').length).toBeGreaterThan(0);
  });

  it('creates a new person when the name is new', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /^add expense$/i }));
    await user.click(await screen.findByRole('button', { name: /^message$/i }));
    await user.type(
      await screen.findByLabelText(/message text/i),
      'You paid ₹1,250 to Suresh Menon\nsuresh.menon@ybl\nPayment successful',
    );
    await user.click(screen.getByRole('button', { name: /read message/i }));

    expect(await screen.findByText('Review expense')).toBeTruthy();
    expect(screen.getByText('A new person will be created.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /save expense/i }));
    expect(await screen.findByText(/Suresh Menon was added to People/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^done$/i }));
    await waitFor(() => expect(screen.getAllByText('Suresh Menon').length).toBeGreaterThan(0));
    expect(document.querySelector('.balance-title')?.textContent).toContain('You are owed');
  });
});

describe('incoming payments', () => {
  it('reads a screenshot paid to me as money received and asks who sent it', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const receipt = `02:13 pm on 22 Nov 2026
Paid to
YASHASVA MOOND         219,200
adv.yashasva@ibl
Banking Name         * Yashasva Moond
PhonePe Transaction ID
T2611221413361467580305
Debited from
       XXXXXXXXXX48924           19,200
UTR: 825219614916`;
    ocrMock.mockResolvedValue({ text: receipt, variants: [receipt] });

    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(await screen.findByRole('button', { name: /^add expense$/i }));

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'receipt.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Review expense')).toBeTruthy();
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('19,200');
    expect(screen.getByText('This payment was made to you.')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /they paid/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'Person' }).textContent).toContain('Select who sent it');

    await user.click(screen.getByRole('button', { name: 'Person' }));
    await user.type(screen.getByPlaceholderText(/search or add a person/i), 'Rahul');
    await user.click(await screen.findByRole('button', { name: /Rahul Sharma/ }));

    await user.click(screen.getByRole('button', { name: /save expense/i }));
    expect(await screen.findByText('Entry added')).toBeTruthy();
    expect(screen.getByText('You owe Rahul Sharma ₹18,700')).toBeTruthy();
  });

  it('understands a receipt paid to me pasted as text', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /^add expense$/i }));
    await user.click(await screen.findByRole('button', { name: /^message$/i }));
    await user.type(
      await screen.findByLabelText(/message text/i),
      'Paid to YASHASVA MOOND\nadv.yashasva@ibl\n₹19,200\nUTR: 825219614916',
    );
    await user.click(screen.getByRole('button', { name: /read message/i }));

    expect(await screen.findByText('Review expense')).toBeTruthy();
    expect(screen.getByText('This payment was made to you.')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /they paid/i }).getAttribute('aria-selected')).toBe('true');
  });
});

describe('manual entry and settle', () => {
  it('settles a person to zero', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    window.location.hash = '#/person/p_rahul';
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('You are owed')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /settle up/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Settle up?')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: /^settle up$/i }));
    await waitFor(() => expect(screen.getByText('Settled up')).toBeTruthy());
  });

  it('adds a manual expense from the person page', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    window.location.hash = '#/person/p_priya';
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));
    expect(await screen.findByText('You owe')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /they paid/i }));
    await user.type(screen.getByLabelText('Amount'), '300');
    await user.type(screen.getByPlaceholderText(/dinner, cab, rent/i), 'Movie');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(screen.getAllByText('Movie').length).toBeGreaterThan(0));
    expect(screen.getByText('You owe')).toBeTruthy();
    expect(screen.getAllByText('₹500').length).toBeGreaterThan(0);
  });
});

describe('navigation', () => {
  it('visits all tabs without crashing', async () => {
    localStorage.setItem('hisaabkitaab.v1', JSON.stringify(seededState()));
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });

    await user.click(within(nav).getByRole('button', { name: /^activity$/i }));
    expect(await screen.findByText('Every expense and payment')).toBeTruthy();

    await user.click(within(nav).getByRole('button', { name: /^people$/i }));
    expect(await screen.findByText('2 people · 2 entries')).toBeTruthy();

    await user.click(within(nav).getByRole('button', { name: /^settings$/i }));
    expect(await screen.findByText('Profile, data and app')).toBeTruthy();

    await user.click(within(nav).getByRole('button', { name: /^add expense$/i }));
    expect(await screen.findByText('Upload a screenshot')).toBeTruthy();
  });
});

import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import type { Person } from '../lib/types';
import { TrashIcon } from './Icons';
import { Sheet } from './ui';

export function PersonFormSheet({
  open,
  onClose,
  person,
  onCreated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  person?: Person | null;
  onCreated?: (id: string) => void;
  onDeleted?: () => void;
}) {
  const { addPerson, updatePerson, deletePerson, toast } = useApp();
  const [name, setName] = useState('');
  const [upi, setUpi] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(person?.name || '');
    setUpi(person?.upi || '');
    setPhone(person?.phone || '');
    setConfirmDelete(false);
  }, [open, person]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast('Naam toh likho');
      return;
    }
    if (person) {
      updatePerson(person.id, { name: trimmed, upi: upi.trim() || undefined, phone: phone.trim() || undefined });
      toast('Naam update ho gaya');
    } else {
      const created = addPerson({ name: trimmed, upi: upi.trim(), phone: phone.trim() });
      toast(`${trimmed} ka khata ban gaya`);
      onCreated?.(created.id);
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={person ? 'Bande ki detail' : 'Naya banda'}
      subtitle={person ? 'Naam ya UPI badal sakte ho' : 'Naam kaafi hai — baaki baad mein'}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          {person ? 'Save karo' : 'Khata banao'}
        </button>
      }
    >
      <div className="sheet-form">
        <div className="field-block">
          <label className="field-label" htmlFor="person-name">
            Naam
          </label>
          <input
            id="person-name"
            className="field field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jaise: Rahul Sharma"
            autoFocus={!person}
            maxLength={48}
          />
        </div>
        <div className="field-block">
          <label className="field-label" htmlFor="person-upi">
            UPI ID <span className="optional">(optional)</span>
          </label>
          <input
            id="person-upi"
            className="field field-input"
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            placeholder="rahul@okaxis"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
          />
        </div>
        <div className="field-block">
          <label className="field-label" htmlFor="person-phone">
            WhatsApp number <span className="optional">(optional)</span>
          </label>
          <input
            id="person-phone"
            className="field field-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ''))}
            placeholder="98765 43210"
            inputMode="tel"
          />
        </div>

        {person && (
          <div className="danger-zone">
            {!confirmDelete ? (
              <button type="button" className="link-danger" onClick={() => setConfirmDelete(true)}>
                <TrashIcon size={16} /> Bandaa aur uska hisaab hatao
              </button>
            ) : (
              <div className="danger-strip">
                <span>Iske saare hisaab bhi delete ho jaayenge. Pakka?</span>
                <div className="row gap-8">
                  <button type="button" className="btn btn-mini btn-ghost" onClick={() => setConfirmDelete(false)}>
                    Nahi
                  </button>
                  <button
                    type="button"
                    className="btn btn-mini btn-danger"
                    onClick={() => {
                      deletePerson(person.id);
                      toast('Khata hata diya');
                      onClose();
                      onDeleted?.();
                    }}
                  >
                    Haan, hatao
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

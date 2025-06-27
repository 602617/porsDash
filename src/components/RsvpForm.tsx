// src/components/RsvpForm.tsx
import React, { useState } from 'react';
import '../style/RsvpForm.css'
interface AttendanceRequest {
  status: 'CAN' | 'CANNOT';
  comment?: string;
}

interface AttendanceDto {
  userId:   number;
  username: string;
  status:   'CAN' | 'CANNOT';
  comment?: string;
  updatedAt: string;
}

interface RsvpFormProps {
  eventId: number;
  onRsvpSuccess: (att: AttendanceDto) => void;
}

const RsvpForm: React.FC<RsvpFormProps> = ({ eventId, onRsvpSuccess }) => {
  const [status, setStatus]     = useState<'CAN' | 'CANNOT'>('CAN');
  const [comment, setComment]   = useState<string>('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const api   = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('jwt') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: AttendanceRequest = { status, comment: comment || undefined };

    try {
      const res = await fetch(`${api}/api/events/${eventId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const saved: AttendanceDto = await res.json();
      onRsvpSuccess(saved);
      setComment('');  // clear comment
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else                      setError('Ukjent feil ved påmelding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rsvp-form">
      <h3 className="rsvp-heading">Din påmelding</h3>

      {error && <p className="rsvp-error">{error}</p>}

      <div className="rsvp-row">
        <label>
          <input
            type="radio"
            name="status"
            value="CAN"
            checked={status === 'CAN'}
            onChange={() => setStatus('CAN')}
          /> Kan
        </label>
        <label>
          <input
            type="radio"
            name="status"
            value="CANNOT"
            checked={status === 'CANNOT'}
            onChange={() => setStatus('CANNOT')}
          /> Kan ikke
        </label>
      </div>

      <div className="rsvp-row">
        <label htmlFor="rsvp-comment">Kommentar (valgfritt)</label>
        <textarea
          id="rsvp-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          className="rsvp-comment"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rsvp-button"
      >
        {loading ? 'Sender…' : 'Bekreft'}
      </button>
    </form>
  );
};

export default RsvpForm;

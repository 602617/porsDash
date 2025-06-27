// src/components/CreateEventForm.tsx
import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';

interface EventDto {
  title:       string;
  description: string;
  location?:   string;
  startTime:   string; // ISO string
  endTime:     string; // ISO string
}

const CreateEventForm: React.FC = () => {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [location,    setLocation]    = useState('');
  const [startTime,   setStartTime]   = useState('');
  const [endTime,     setEndTime]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const navigate = useNavigate();
  const api      = import.meta.env.VITE_API_BASE_URL;
  const token    = localStorage.getItem('jwt') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !startTime || !endTime) {
      return setError('Vennligst fyll ut alle påkrevde felt.');
    }

    const dto: EventDto = { title, description, location, startTime, endTime };

    setLoading(true);
    try {
      const res = await fetch(`${api}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dto)
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const created: { id: number } = await res.json();
      // Navigate to the detail page of the new event:
      navigate(`/events/${created.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else                      setError('Ukjent feil ved oppretting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-4 bg-white rounded-lg shadow space-y-4"
    >
      <h2 className="text-xl font-semibold">Opprett nytt arrangement</h2>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium">Tittel <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="mt-1 block w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Beskrivelse <span className="text-red-500">*</span></label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="mt-1 block w-full p-2 border rounded"
          rows={4}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Sted</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="mt-1 block w-full p-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Starttidspunkt <span className="text-red-500">*</span></label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="mt-1 block w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Sluttidspunkt <span className="text-red-500">*</span></label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="mt-1 block w-full p-2 border rounded"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Oppretter…' : 'Opprett Arrangement'}
      </button>
    </form>
  );
};

export default CreateEventForm;

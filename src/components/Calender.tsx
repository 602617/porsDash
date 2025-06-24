import React from 'react';

const Calender: React.FC = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = januar
  const currentDate = today.getDate();

  const firstDay = new Date(year, month, 1).getDay(); // 0 = søndag
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dates = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  return (
    <div style={{ maxWidth: 300, margin: '2rem auto', textAlign: 'center' }}>
      <h2>
        {today.toLocaleString('default', { month: 'long' })} {year}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weekdays.map((day) => (
          <div key={day} style={{ fontWeight: 'bold' }}>{day}</div>
        ))}

        {dates.map((day, idx) => (
          <div
            key={idx}
            style={{
              padding: '8px 0',
              backgroundColor: day === currentDate ? '#3b82f6' : '#f3f4f6',
              color: day === currentDate ? '#fff' : '#111',
              borderRadius: 4,
            }}
          >
            {day || ''}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calender;

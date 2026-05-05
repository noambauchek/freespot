export default function AlertBadge({ count, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
      <span style={{ fontSize: 22 }}>🔔</span>
      {count > 0 && (
        <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {count}
        </span>
      )}
    </button>
  );
}
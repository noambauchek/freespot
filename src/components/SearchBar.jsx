// src/components/SearchBar.jsx
// Address search bar – finds available parking spots in a searched area

import React, { useState, useRef, useEffect } from 'react';

export default function SearchBar({ onSearch, onClear, googleMapRef }) {
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    
  if (!window.google?.maps?.places || !inputRef.current || autocompleteRef.current) return;

  autocompleteRef.current = new window.google.maps.places.Autocomplete(
    inputRef.current,
    {
      componentRestrictions: { country: 'il' },
      fields: ['geometry', 'formatted_address', 'name'],
      language: 'he',
    }
  );

  autocompleteRef.current.addListener('place_changed', () => {
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || place.name || '';

    setQuery(address);

    // Pan map to searched location
    if (googleMapRef?.current) {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(16);
    }

    onSearch({ lat, lng, address });
  });
}, [window.google?.maps?.places, googleMapRef?.current]);

  function handleClear() {
    setQuery('');
    setSuggestions([]);
    onClear();
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div style={S.wrapper}>
      <div style={S.inputRow}>
        <span style={S.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          style={S.input}
          placeholder="חפש כתובת לחניה..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          dir="rtl"
        />
        {query.length > 0 && (
          <button style={S.clearBtn} onClick={handleClear}>✕</button>
        )}
      </div>
    </div>
  );
}

const S = {
  wrapper: {
    width: '100%',
  },
  inputRow: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '0 10px',
    gap: 8,
  },
  searchIcon: { fontSize: 16, opacity: 0.6 },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: 14,
    padding: '10px 0',
    fontFamily: "'Assistant', sans-serif",
    direction: 'rtl',
    textAlign: 'right',
  },
  clearBtn: {
    background: 'none', border: 'none',
    color: '#94a3b8', cursor: 'pointer',
    fontSize: 14, padding: '4px',
  },
};
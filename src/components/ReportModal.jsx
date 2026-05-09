// src/components/ReportModal.jsx

import React, { useState } from 'react';
import { SPOT_TYPE } from '../services/firestore';

export default function ReportModal({ onSubmit, onClose, loading, userGroups = [] }) {
  const [image, setImage]               = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [address, setAddress]           = useState('');
  const [isPaid, setIsPaid]             = useState(null);
  const [isHandicap, setIsHandicap]     = useState(null);
  const [searchTime, setSearchTime]     = useState(5);
  const [occupancy, setOccupancy]       = useState(null);
  const [isGroupOnly, setIsGroupOnly]   = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleSubmit() {
    let spotType = SPOT_TYPE.FREE;
    if (isPaid === true) spotType = SPOT_TYPE.BLUE_WHITE;
    onSubmit({
      spotType, isPaid, isHandicap, searchTime, occupancy, address, image,
      isGroupOnly: isGroupOnly && !!selectedGroup,
      groupId: isGroupOnly ? selectedGroup : null,
    });
  }

  return (
    <>
      <div onClick={onClose} style={S.backdrop} />
      <div style={S.modal}>
        <div style={S.handle} />

        <div style={S.titleRow}>
          <button onClick={onClose} style={S.backBtn}>{'>'}</button>
          <h2 style={S.title}>פתיחת דיווח</h2>
        </div>

        <div style={S.scrollArea}>
          {/* Image */}
          <label style={S.imageBox}>
            <input type="file" accept="image/*" capture="environment"
              onChange={handleImage} style={{ display: 'none' }} />
            {imagePreview
              ? <img src={imagePreview} alt="preview" style={S.imagePreview} />
              : <div style={S.imagePlaceholder}>
                  <span style={{ fontSize: 32, color: '#94a3b8' }}>🖼</span>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>הוסף תמונה</span>
                </div>
            }
          </label>

          {/* Address */}
<div style={S.field}>
  <label style={S.fieldLabel}>מיקום החניה</label>
  <input
    style={S.input}
    placeholder="הכנס כתובת..."
    value={address}
    onChange={e => setAddress(e.target.value)}
    dir="rtl"
  />
  <button
    type="button"
    style={S.locationLink}
    onClick={() => {
      if (!navigator.geolocation) {
        setAddress('מיקום לא זמין');
        return;
      }
      setAddress('מאתר מיקום...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he`)
            .then(r => r.json())
            .then(data => {
              if (data && data.display_name) {
                setAddress(data.display_name);
              } else {
                setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
              }
            })
            .catch(() => {
              setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            });
                  }
      );
    }}>← השתמש במיקום שלי</button>   
       </div>
       
          {/* Paid */}
          <div style={S.field}>
            <label style={S.fieldLabel}>חניה בתשלום?</label>
            <div style={S.yesNoRow}>
              <YesNoBtn label="כן" active={isPaid === true}  onClick={() => setIsPaid(true)} />
              <YesNoBtn label="לא" active={isPaid === false} onClick={() => setIsPaid(false)} />
            </div>
          </div>

          {/* Handicap */}
          <div style={S.field}>
            <label style={S.fieldLabel}>חניית נכה?</label>
            <div style={S.yesNoRow}>
              <YesNoBtn label="כן" active={isHandicap === true}  onClick={() => setIsHandicap(true)} />
              <YesNoBtn label="לא" active={isHandicap === false} onClick={() => setIsHandicap(false)} />
            </div>
          </div>

          {/* Search time */}
          <div style={S.field}>
            <label style={S.fieldLabel}>זמן חיפוש החניה</label>
            <div style={S.stepperRow}>
              <button style={S.stepperBtn} onClick={() => setSearchTime(t => Math.max(1, t - 1))}>−</button>
              <span style={S.stepperValue}>{searchTime}</span>
              <button style={S.stepperBtn} onClick={() => setSearchTime(t => Math.min(60, t + 1))}>+</button>
            </div>
          </div>

          {/* Occupancy */}
          <div style={S.field}>
            <label style={S.fieldLabel}>רמת העומס</label>
            <div style={S.occupancyRow}>
              {[
                { key: 'low', label: 'פנוי' },
                { key: 'medium', label: 'מעט עמוס' },
                { key: 'high', label: 'עמוס מאוד' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setOccupancy(key)}
                  style={{ ...S.occupancyBtn, ...(occupancy === key ? S.occupancyActive : {}) }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          {/* Group sharing toggle – only shows if user has groups */}
          {userGroups.length > 0 && (
            <div style={S.groupShareBox}>
              <div style={S.groupShareRow}>
                <span style={S.groupShareLabel}>👥 שתף רק עם קבוצה?</span>
                <button type="button"
                  onClick={() => setIsGroupOnly(v => !v)}
                  style={{ ...S.togglePill, background: isGroupOnly ? '#3b82f6' : '#e2e8f0' }}>
                  <span style={{
                    ...S.toggleThumb,
                    transform: isGroupOnly ? 'translateX(20px)' : 'translateX(2px)',
                  }} />
                </button>
              </div>
              {isGroupOnly && (
                <select style={S.groupSelect} value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}>
                  <option value="">-- בחר קבוצה --</option>
                  {userGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.groupName}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button style={{ ...S.submitBtn, opacity: loading ? 0.6 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? 'שולח...' : isGroupOnly && selectedGroup ? '🔒 שלח לקבוצה בלבד' : 'שלח דיווח'}
          </button>
        </div>
      </div>
    </>
  );
}

function YesNoBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 22px', borderRadius: 20,
      border: active ? '2px solid #3b82f6' : '1.5px solid #cbd5e1',
      background: active ? 'rgba(59,130,246,0.12)' : '#f8fafc',
      color: active ? '#3b82f6' : '#334155',
      fontWeight: active ? 700 : 400,
      fontSize: 14, cursor: 'pointer',
      fontFamily: "'Heebo', sans-serif",
    }}>
      {label}
    </button>
  );
}

const S = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 },
  modal: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderRadius: '24px 24px 0 0', zIndex: 201, maxHeight: '92vh', display: 'flex', flexDirection: 'column', fontFamily: "'Heebo', sans-serif", direction: 'rtl', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' },
  handle: { width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '12px auto 0' },
  titleRow: { display: 'flex', alignItems: 'center', padding: '12px 20px 4px', gap: 8 },
  backBtn: { background: 'none', border: 'none', fontSize: 18, color: '#1e293b', cursor: 'pointer', padding: '4px 8px', fontWeight: 700 },
  title: { fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, flex: 1, textAlign: 'center', paddingLeft: 32 },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '8px 20px 16px' },
  imageBox: { display: 'block', background: '#f1f5f9', borderRadius: 16, height: 140, marginBottom: 20, cursor: 'pointer', overflow: 'hidden', border: '1.5px dashed #cbd5e1' },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  imagePlaceholder: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 },
  field: { marginBottom: 20 },
  fieldLabel: { display: 'block', fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8, textAlign: 'right' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' },
  locationLink: { background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer', padding: '4px 0', fontFamily: "'Heebo', sans-serif", textDecoration: 'underline' },
  yesNoRow: { display: 'flex', gap: 10, flexDirection: 'row-reverse' },
  stepperRow: { display: 'flex', alignItems: 'center', gap: 16, flexDirection: 'row-reverse' },
  stepperBtn: { width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 20, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  stepperValue: { fontSize: 18, fontWeight: 700, color: '#1e293b', minWidth: 24, textAlign: 'center' },
  occupancyRow: { display: 'flex', gap: 8, flexWrap: 'wrap', flexDirection: 'row-reverse' },
  occupancyBtn: { padding: '8px 16px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
  occupancyActive: { border: '2px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 700 },
  footer: { padding: '12px 20px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 12 },
  groupShareBox: { background: '#f1f5f9', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  groupShareRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  groupShareLabel: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
  togglePill: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0 },
  toggleThumb: { position: 'absolute', top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'transform 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', display: 'block' },
  groupSelect: { width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: '#fff', fontSize: 14, color: '#1e293b', fontFamily: "'Heebo', sans-serif", outline: 'none', textAlign: 'right' },
  submitBtn: { width: '100%', padding: '16px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
};
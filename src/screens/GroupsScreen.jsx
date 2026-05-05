// src/screens/GroupsScreen.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { createGroup, getUserGroups, removeGroupMember, getGroupMembers, COLLECTIONS } from '../services/firestore';
import { collection, query, where, getDocs, addDoc, serverTimestamp, increment, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import BottomNav from '../components/BottomNav';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
  const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email.trim().toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function addMemberToGroup(groupId, userId) {
  const existing = query(
    collection(db, COLLECTIONS.GROUP_MEMBERS),
    where('groupId', '==', groupId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(existing);
  if (!snap.empty) throw new Error('המשתמש כבר חבר בקבוצה');
  await addDoc(collection(db, COLLECTIONS.GROUP_MEMBERS), {
    groupId, userId, role: 'member',
    joinedAt: serverTimestamp(), status: 'active',
  });
  await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), { memberCount: increment(1) });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function GroupsScreen() {
  const { uid } = useAuth();
  const [myGroups, setMyGroups]       = useState([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState(null);
  const [groupName, setGroupName]     = useState('');
  const [groupType, setGroupType]     = useState('neighborhood');
  const [location, setLocation]       = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteList, setInviteList]   = useState([]);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => { if (uid) loadGroups(); }, [uid]);

  async function loadGroups() {
    const groups = await getUserGroups(uid);
    setMyGroups(groups);
  }

  async function handleAddInvite() {
    setInviteError('');
    if (!inviteEmail.trim()) return;
    if (inviteList.find(i => i.email === inviteEmail.trim())) { setInviteError('כבר נוסף'); return; }
    const user = await findUserByEmail(inviteEmail);
    if (!user) { setInviteError('משתמש לא נמצא עם אימייל זה'); return; }
    if (user.id === uid) { setInviteError('לא ניתן להוסיף את עצמך'); return; }
    setInviteList(l => [...l, { email: inviteEmail.trim(), uid: user.id, name: user.fullName }]);
    setInviteEmail('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      const groupId = await createGroup(uid, groupName, groupType, location);
      for (const invite of inviteList) {
        await addMemberToGroup(groupId, invite.uid);
      }
      await loadGroups();
      setShowCreate(false);
      setGroupName(''); setLocation(''); setInviteList([]);
      show(`✅ קבוצה "${groupName}" נוצרה!`);
    } catch (err) {
      show('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function show(msg) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <h1 style={S.title}>קבוצות שיתוף</h1>
        <button style={S.addBtn} onClick={() => setShowCreate(v => !v)}>
          {showCreate ? '✕ סגור' : '+ קבוצה חדשה'}
        </button>
      </div>

      {showCreate && (
        <div style={S.formCard}>
          <h3 style={S.formTitle}>🆕 צור קבוצה חדשה</h3>
          <form onSubmit={handleCreate} style={S.form}>
            <input style={S.input} placeholder="שם הקבוצה" value={groupName}
              onChange={e => setGroupName(e.target.value)} required />

            <select style={S.input} value={groupType} onChange={e => setGroupType(e.target.value)}>
              <option value="neighborhood">🏘 שכונה</option>
              <option value="work">🏢 מקום עבודה</option>
              <option value="friends">👫 חברים</option>
              <option value="family">👨‍👩‍👧 משפחה</option>
            </select>

            <input style={S.input} placeholder="איזור פעילות (כתובת)" value={location}
              onChange={e => setLocation(e.target.value)} />

            {/* Invite section */}
            <div style={S.inviteBox}>
              <p style={S.inviteTitle}>➕ הזמן חברים לפי אימייל</p>
              <div style={S.inviteRow}>
                <input style={{ ...S.input, flex: 1, marginBottom: 0 }}
                  placeholder="אימייל משתמש רשום" type="email"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(''); }} />
                <button type="button" style={S.inviteBtn} onClick={handleAddInvite}>הוסף</button>
              </div>
              {inviteError && <p style={S.errText}>{inviteError}</p>}
              {inviteList.map(i => (
                <div key={i.email} style={S.tag}>
                  <span>👤 {i.name || i.email}</span>
                  <button type="button" style={S.tagX}
                    onClick={() => setInviteList(l => l.filter(x => x.email !== i.email))}>✕</button>
                </div>
              ))}
            </div>

            <button style={S.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'יוצר...' : `צור קבוצה${inviteList.length > 0 ? ` (${inviteList.length + 1} חברים)` : ''}`}
            </button>
          </form>
        </div>
      )}

      <div style={S.list}>
        {myGroups.length === 0
          ? <div style={S.empty}><p style={{ fontSize: 40 }}>👥</p><p>עוד לא הצטרפת לקבוצה</p></div>
          : myGroups.map(g => (
            <GroupCard key={g.id} group={g} uid={uid} onUpdate={loadGroups} showToast={show} />
          ))
        }
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
      <BottomNav active="groups" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function GroupCard({ group, uid, onUpdate, showToast }) {
  const [members, setMembers]         = useState([]);
  const [expanded, setExpanded]       = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [addEmail, setAddEmail]       = useState('');
  const [addError, setAddError]       = useState('');
  const [addLoading, setAddLoading]   = useState(false);
  const isAdmin = group.createdBy === uid;

  const typeLabels = { neighborhood: '🏘 שכונה', work: '🏢 עבודה', friends: '👫 חברים', family: '👨‍👩‍👧 משפחה' };

  async function toggle() {
    if (!expanded) {
      const m = await getGroupMembers(group.id);
      setMembers(m);
    }
    setExpanded(v => !v);
  }

  async function handleAdd() {
    setAddError('');
    if (!addEmail.trim()) return;
    setAddLoading(true);
    try {
      const user = await findUserByEmail(addEmail);
      if (!user) throw new Error('משתמש לא נמצא עם אימייל זה');
      if (user.id === uid) throw new Error('לא ניתן להוסיף את עצמך');
      await addMemberToGroup(group.id, user.id);
      const m = await getGroupMembers(group.id);
      setMembers(m);
      onUpdate();
      setAddEmail(''); setShowAdd(false);
      showToast(`✅ ${user.fullName || addEmail} נוסף לקבוצה`);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemove(memberId, name) {
    await removeGroupMember(group.id, memberId);
    const m = await getGroupMembers(group.id);
    setMembers(m);
    onUpdate();
    showToast(`🚫 ${name} הוסר מהקבוצה`);
  }

  return (
    <div style={S.card}>
      <div style={S.cardHeader} onClick={toggle}>
        <div style={{ flex: 1 }}>
          <div style={S.cardName}>{group.groupName}</div>
          <div style={S.cardMeta}>{typeLabels[group.groupType]} · {group.memberCount || 1} חברים</div>
          {group.locationHint && <div style={S.cardLoc}>📍 {group.locationHint}</div>}
        </div>
        <span style={{ color: '#6366f1' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={S.expandArea}>
          {members.length === 0
            ? <p style={{ color: '#64748b', fontSize: 13 }}>אין חברים עדיין</p>
            : members.map(m => (
              <div key={m.id} style={S.memberRow}>
                <div style={S.memberLeft}>
                  <span style={{ fontSize: 20 }}>{m.role === 'admin' ? '👑' : '👤'}</span>
                  <div>
                    <div style={S.memberName}>
                      {m.userId === uid ? 'אני' : (m.fullName || m.userId.slice(0, 10) + '...')}
                    </div>
                    <div style={S.memberRole}>{m.role === 'admin' ? 'מנהל' : 'חבר'}</div>
                  </div>
                </div>
                {isAdmin && m.userId !== uid && (
                  <button style={S.removeBtn}
                    onClick={() => handleRemove(m.userId, m.fullName || 'חבר')}>
                    הסר
                  </button>
                )}
              </div>
            ))
          }

          {/* Add member (admin only) */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              {!showAdd
                ? (
                  <button style={S.addMemberBtn} onClick={() => setShowAdd(true)}>
                    ➕ הוסף חבר לקבוצה
                  </button>
                )
                : (
                  <div style={S.addForm}>
                    <input style={S.addInput} placeholder="אימייל משתמש רשום" type="email"
                      value={addEmail}
                      onChange={e => { setAddEmail(e.target.value); setAddError(''); }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={S.confirmBtn} onClick={handleAdd} disabled={addLoading}>
                        {addLoading ? '...' : 'הוסף'}
                      </button>
                      <button style={S.cancelBtn}
                        onClick={() => { setShowAdd(false); setAddEmail(''); setAddError(''); }}>
                        ביטול
                      </button>
                    </div>
                    {addError && <p style={S.errText}>{addError}</p>}
                  </div>
                )
              }
            </div>
          )}

          <div style={S.shareNote}>
            💡 בעת דיווח חניה תוכל לבחור לשתף רק עם קבוצה זו
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  page: { minHeight: '100vh', background: '#0f172a', fontFamily: "'Heebo', sans-serif", direction: 'rtl', color: '#fff', paddingBottom: 80 },
  topBar: { padding: '40px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 },
  addBtn: { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#6366f1', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
  formCard: { margin: '0 20px 16px', background: 'rgba(30,41,59,0.9)', borderRadius: 14, padding: '20px', border: '1px solid rgba(99,102,241,0.2)' },
  formTitle: { color: '#6366f1', margin: '0 0 16px', fontSize: 16, fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  input: { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '11px 12px', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'right', fontFamily: "'Heebo', sans-serif" },
  inviteBox: { background: 'rgba(15,23,42,0.5)', borderRadius: 10, padding: '12px', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', gap: 8 },
  inviteTitle: { color: '#94a3b8', fontSize: 13, margin: 0, fontWeight: 600 },
  inviteRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  inviteBtn: { background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc', borderRadius: 8, padding: '0 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Heebo', sans-serif", whiteSpace: 'nowrap' },
  tag: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99,102,241,0.15)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#c7d2fe' },
  tagX: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14 },
  errText: { color: '#f87171', fontSize: 12, margin: 0 },
  btnPrimary: { background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Heebo', sans-serif", marginTop: 4 },
  list: { padding: '0 20px' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#e2e8f0' },
  card: { background: 'rgba(30,41,59,0.8)', borderRadius: 14, marginBottom: 12, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.15)' },
  cardHeader: { padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontWeight: 700, fontSize: 16, color: '#fff' },
  cardMeta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  cardLoc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  expandArea: { borderTop: '1px solid rgba(99,102,241,0.1)', padding: '10px 16px 16px' },
  memberRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(99,102,241,0.07)' },
  memberLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  memberName: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 },
  memberRole: { color: '#64748b', fontSize: 11, marginTop: 1 },
  removeBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
  addMemberBtn: { width: '100%', padding: '10px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
  addForm: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 },
  addInput: { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'right', fontFamily: "'Heebo', sans-serif" },
  confirmBtn: { flex: 1, padding: '9px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
  cancelBtn: { padding: '9px 16px', background: 'transparent', border: '1px solid rgba(99,102,241,0.3)', color: '#94a3b8', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" },
  shareNote: { marginTop: 12, padding: '10px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, color: '#94a3b8', fontSize: 12 },
  toast: { position: 'fixed', bottom: 100, right: '50%', transform: 'translateX(50%)', background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' },
};
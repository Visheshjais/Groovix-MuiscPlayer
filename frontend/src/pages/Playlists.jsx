/**
 * ============================================================
 *  GROOVIX — Playlists Page
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/Playlists.jsx
 *
 *  Shows all user-created playlists.
 *  "New Playlist" button opens a modal to enter a name.
 *  Each card navigates to its PlaylistDetail page.
 * ============================================================
 */

import { useState }    from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar           from '../components/Topbar';
import { usePlaylists, useToast } from '../context';

export default function Playlists() {
  const { playlists, create, remove } = usePlaylists();
  const { show }    = useToast();
  const nav         = useNavigate();
  const [modal, setModal] = useState(false);
  const [name,  setName]  = useState('');

  /* Create playlist and navigate to it */
  const handleCreate = () => {
    if (!name.trim()) return;
    const pl = create(name.trim());
    show(`✦ "${pl.name}" created`);
    setName('');
    setModal(false);
    nav(`/playlist/${pl._id || pl.id}`);
  };

  return (
    <>
      <Topbar bc="Playlists" />
      <div className="page">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 30, color: 'var(--text)' }}>Your Playlists</h2>
          <button
            className="btn-play-lg"
            style={{ padding: '10px 22px', fontSize: 13 }}
            onClick={() => setModal(true)}
          >
            + New Playlist
          </button>
        </div>

        <div className="pl-grid anim d1">
          {/* Create new card */}
          <button className="new-pl" onClick={() => setModal(true)}>
            <span style={{ fontSize: 32 }}>+</span>
            <span>Create Playlist</span>
          </button>

          {/* Existing playlists */}
          {playlists.map(pl => (
            <div key={pl._id || pl.id} className="pl-card" onClick={() => nav(`/playlist/${pl._id || pl.id}`)}>
              <div className="pl-icon">{pl.emoji}</div>
              <div className="pl-name">{pl.name}</div>
              <div className="pl-count">{pl.songs.length} songs</div>
              <button
                className="pl-del"
                onClick={e => { e.stopPropagation(); remove(pl._id || pl.id); show('Playlist deleted'); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* ── Create Playlist Modal ── */}
      {modal && (
        <div className="modal-ov" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create New Playlist</div>
            <div className="field">
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
                Playlist Name
              </label>
              <input
                type="text"
                placeholder="My Awesome Mix..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                style={{
                  width: '100%', background: 'var(--bg3)',
                  border: '1.5px solid var(--border)', borderRadius: 'var(--r)',
                  padding: '12px 16px', color: 'var(--text)',
                  fontFamily: 'var(--font-b)', fontSize: 14, outline: 'none',
                }}
              />
            </div>
            <div className="modal-acts">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-ok" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

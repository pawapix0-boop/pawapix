import { useState } from 'react';
import logo from '../assets/pawa-pix-logo.svg';

export default function Navbar({ onAdminClick, onUserAuthClick, isLoggedIn, onLogout, onNavigate, activePlan }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="brand">
        <img src={logo} alt="Pawapix logo" className="brand-logo" />
        <span>Pawapix</span>
      </div>
      <div className="nav-links">
        <a href="#curated-offering" onClick={(event) => { if (onNavigate) { event.preventDefault(); onNavigate('services'); } }}>Services</a>
        <a href="#creatives" onClick={(event) => { if (onNavigate) { event.preventDefault(); onNavigate('creatives'); } }}>Creatives</a>
        <a href="#apply" onClick={(event) => { if (onNavigate) { event.preventDefault(); onNavigate('apply'); } }}>Apply</a>
      </div>
      <div className="nav-actions">
        <div className="dropdown-menu-wrapper">
          <button className="dropdown-toggle" onClick={() => setOpen((prev) => !prev)}>
            Explore
            <span className={`dropdown-icon ${open ? 'open' : ''}`}>▾</span>
          </button>
          {open && (
            <div className="dropdown-panel">
              {activePlan ? <span className="active-plan-menu-item">Active plan: {activePlan.name}</span> : <a href="#plans" onClick={(event) => { event.preventDefault(); setOpen(false); onNavigate?.('plans'); }}>Plans</a>}
              <a href="#curated-offering" onClick={(event) => { event.preventDefault(); setOpen(false); onNavigate?.('services'); }}>Services</a>
              <a href="#creatives" onClick={(event) => { event.preventDefault(); setOpen(false); onNavigate?.('creatives'); }}>Creatives</a>
              <a href="#apply" onClick={(event) => { event.preventDefault(); setOpen(false); onNavigate?.('apply'); }}>Apply</a>
            </div>
          )}
        </div>
        {isLoggedIn ? (
          <button type="button" className="nav-action session-action" onClick={onLogout}>Log out</button>
        ) : (
          <>
            <button type="button" className="nav-action session-action" onClick={() => onUserAuthClick('login')}>Login</button>
            <button type="button" className="nav-action" onClick={() => onUserAuthClick('signup')}>Sign Up</button>
          </>
        )}
      </div>
    </nav>
  );
}

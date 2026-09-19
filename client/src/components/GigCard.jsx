import { useState } from 'react';

export default function GigCard({ gig, onSelect }) {
  const initial = typeof gig.rating === 'number' ? gig.rating : 0;
  const [rating, setRating] = useState(initial);
  const [hover, setHover] = useState(0);

  const displayStars = (value) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = i <= Math.round(value);
      stars.push(
        <button
          key={i}
          className={"star" + (filled ? " filled" : "")}
          onClick={() => setRating(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}>
          {filled ? '★' : '☆'}
        </button>
      );
    }
    return stars;
  };

  const current = hover || rating;

  return (
    <article className="gig-card">
      <div className="gig-badge">{gig.tag ? gig.tag : gig.tags[0]}</div>
      <h3>{gig.title}</h3>
      <p>{gig.description}</p>

      <div className="rating-row" title={`${rating.toFixed(1)} / 5`}>
        <div className="stars">{displayStars(current)}</div>
        <div className="rating-value">{rating.toFixed(1)}</div>
      </div>

      <div className="gig-footer">
        <span>{gig.creative}</span>
        <strong>Contact</strong>
      </div>
      {onSelect && <button type="button" className="primary-btn gig-select-button" onClick={onSelect}>Choose service</button>}
    </article>
  );
}

import { useState } from 'react'

const Rating = ({ value, onChange, readonly = false, size = 24 }) => {
    const [hover, setHover] = useState(0)

    return (
        <div className="rating-stars">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    className={`star-btn ${readonly ? 'readonly' : ''}`}
                    onClick={() => !readonly && onChange(star)}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    style={{
                        fontSize: `${size}px`,
                        color: star <= (hover || value) ? '#ffc107' : '#e4e5e9',
                        background: 'none',
                        border: 'none',
                        cursor: readonly ? 'default' : 'pointer'
                    }}
                >
                    ★
                </button>
            ))}
        </div>
    )
}

export default Rating
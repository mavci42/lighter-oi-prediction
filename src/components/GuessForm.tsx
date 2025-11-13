import { useState } from 'react';
import './GuessForm.css';

interface GuessFormProps {
  currentOI?: number;
}

const PRESET_GUESSES = [
  240_000_000,
  245_000_000,
  250_000_000,
  255_000_000,
];

function GuessForm({ currentOI }: GuessFormProps) {
  const [customGuess, setCustomGuess] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formatOI = (value: number) => {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  };

  const handlePresetClick = (value: number) => {
    setSelectedPreset(value);
    setCustomGuess('');
    setSuccess(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomGuess(e.target.value);
    setSelectedPreset(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const guessValue = selectedPreset || parseFloat(customGuess);
    if (!guessValue || guessValue <= 0) {
      alert('Please enter a valid guess!');
      return;
    }

    setSubmitting(true);

    try {
      // Mock FID for demo (in production, get from Farcaster SDK)
      const mockFID = Math.floor(Math.random() * 100000);

      // Call mock API endpoint
      const response = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: mockFID,
          guessUsd: guessValue,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Mock response for development
        return {
          ok: true,
          json: async () => ({ success: true, message: 'Guess submitted!' })
        };
      });

      if (response.ok) {
        setSuccess(true);
        
        // Store guess in localStorage for leaderboard demo
        const existingGuesses = JSON.parse(localStorage.getItem('guesses') || '[]');
        existingGuesses.push({
          fid: mockFID,
          guessUsd: guessValue,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('guesses', JSON.stringify(existingGuesses));

        // Reset form after 2 seconds
        setTimeout(() => {
          setSelectedPreset(null);
          setCustomGuess('');
          setSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit guess:', error);
      alert('Failed to submit guess. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="guess-form-container">
      {currentOI !== undefined && (
        <div className="current-oi">
          <p className="label">Current Lighter OI (Reference)</p>
          <p className="value">{formatOI(currentOI)}</p>
        </div>
      )}

      <h2 className="form-title">Guess Today's Lighter OI (USD)</h2>

      <form onSubmit={handleSubmit}>
        <div className="preset-buttons">
          {PRESET_GUESSES.map((value) => (
            <button
              key={value}
              type="button"
              className={`preset-btn ${selectedPreset === value ? 'selected' : ''}`}
              onClick={() => handlePresetClick(value)}
            >
              {formatOI(value)}
            </button>
          ))}
        </div>

        <div className="custom-input-container">
          <label htmlFor="custom-guess">Or enter custom amount (USD):</label>
          <input
            id="custom-guess"
            type="number"
            placeholder="e.g., 248000000"
            value={customGuess}
            onChange={handleCustomChange}
            className="custom-input"
            min="0"
            step="1000000"
          />
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={submitting || (!selectedPreset && !customGuess)}
        >
          {submitting ? 'Submitting...' : '🎯 Submit Guess'}
        </button>

        {success && (
          <div className="success-message">
            ✅ Your guess has been submitted successfully!
          </div>
        )}
      </form>
    </div>
  );
}

export default GuessForm;

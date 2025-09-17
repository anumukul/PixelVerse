// frontend/src/components/Navigation.tsx
import React from 'react';

type ViewMode = 'analytics' | 'batch' | 'split';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const Navigation: React.FC<Props> = ({ viewMode, onViewModeChange }) => {
  const navItems = [
    { mode: 'analytics' as ViewMode, label: 'Analytics', icon: '📊' },
    { mode: 'batch' as ViewMode, label: 'Batch Tools', icon: '⚡' },
    { mode: 'split' as ViewMode, label: 'Split View', icon: '🖼️' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-content">
        {navItems.map(({ mode, label, icon }) => (
          <button
            key={mode}
            className={`nav-btn ${viewMode === mode ? 'active' : ''}`}
            onClick={() => onViewModeChange(mode)}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .navigation {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 0;
        }

        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 0 20px;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid transparent;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.8);
          border-color: #e2e8f0;
        }

        .nav-btn.active {
          background: white;
          border-color: #4299e1;
          color: #2b6cb0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nav-icon {
          font-size: 18px;
        }

        @media (max-width: 768px) {
          .nav-content {
            flex-wrap: wrap;
          }
          
          .nav-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
          
          .nav-label {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};
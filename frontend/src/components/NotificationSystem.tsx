import React from 'react';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

interface Props {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

export const NotificationSystem: React.FC<Props> = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notifications">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification ${notification.type}`}
          onClick={() => onRemove(notification.id)}
        >
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' && '✅'}
              {notification.type === 'error' && '❌'}
              {notification.type === 'info' && 'ℹ️'}
            </span>
            <span className="notification-message">{notification.message}</span>
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}

      <style jsx>{`
        .notifications {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }

        .notification {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-left: 4px solid;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: slideIn 0.3s ease-out;
        }

        .notification:hover {
          transform: translateX(-4px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }

        .notification.success {
          border-left-color: #48bb78;
        }

        .notification.error {
          border-left-color: #f56565;
        }

        .notification.info {
          border-left-color: #4299e1;
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .notification-icon {
          font-size: 18px;
        }

        .notification-message {
          font-size: 14px;
          font-weight: 500;
          color: #2d3748;
        }

        .notification-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #a0aec0;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .notification-close:hover {
          background: #f7fafc;
          color: #2d3748;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .notifications {
            left: 16px;
            right: 16px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};
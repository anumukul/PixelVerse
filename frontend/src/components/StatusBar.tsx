import React, { useState, useEffect } from 'react';

export const StatusBar: React.FC = () => {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [uniqueUsers, setUniqueUsers] = useState(1);
  const [totalPixels, setTotalPixels] = useState(0);

  // WebSocket connection logic would go here
  useEffect(() => {
    // Simulate WebSocket status
    setWsStatus('connected');
  }, []);

  return (
    <div className="status-bar">
      <div className="status-left">
        <div className={`connection-status ${wsStatus}`}>
          <span className="status-dot" />
          <span>
            {wsStatus === 'connected' ? 'Live Updates Active' : 
             wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="status-right">
        <span>👥 {uniqueUsers} artists</span>
        <span>🔗 {onlineUsers} connections</span>
        <span>🎨 {totalPixels} pixels</span>
      </div>

      <style jsx>{`
        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #2d3748;
          color: white;
          padding: 12px 20px;
          font-size: 14px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #48bb78;
        }

        .connection-status.connecting .status-dot {
          background: #ed8936;
          animation: pulse 1s infinite;
        }

        .connection-status.disconnected .status-dot {
          background: #f56565;
        }

        .status-right {
          display: flex;
          gap: 16px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .status-bar {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
          
          .status-right {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};
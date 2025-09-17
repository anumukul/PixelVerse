import React from 'react';

export const WelcomeBanner: React.FC = () => {
  return (
    <div className="welcome-banner">
      <div className="welcome-content">
        <h2>Welcome to PixelVerse!</h2>
        <p>
          A revolutionary real-time collaborative NFT canvas built on Somnia blockchain. 
          Paint pixels, own NFTs, and collaborate with artists worldwide in real-time!
        </p>
        <div className="features">
          <span className="feature">⚡ Lightning-fast transactions</span>
          <span className="feature">🎨 Real-time collaboration</span>
          <span className="feature">💎 Each pixel is an NFT</span>
          <span className="feature">📊 Live analytics</span>
        </div>
      </div>

      <style jsx>{`
        .welcome-banner {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 32px;
          margin: 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }

        .welcome-content h2 {
          font-size: 32px;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-content p {
          font-size: 18px;
          color: #4a5568;
          margin-bottom: 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .features {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .feature {
          background: #e6fffa;
          color: #234e52;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .welcome-banner {
            margin: 10px;
            padding: 20px;
          }
          
          .welcome-content h2 {
            font-size: 24px;
          }
          
          .welcome-content p {
            font-size: 16px;
          }
          
          .features {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

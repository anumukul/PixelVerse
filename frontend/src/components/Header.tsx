// frontend/src/components/Header.tsx
import React from 'react';

interface Props {
  contractAddress: string;
}

export const Header: React.FC<Props> = ({ contractAddress }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="brand">
          <h1>PixelVerse</h1>
          <span className="tagline">Real-Time Collaborative NFT Canvas</span>
        </div>
        
        <div className="contract-info">
          <span className="label">Contract:</span>
          <code className="address">
            {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
          </code>
          <a 
            href={`https://shannon-explorer.somnia.network/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
            title="View on Somnia Explorer"
          >
            Explorer
          </a>
        </div>
      </div>

      <style jsx>{`
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .brand h1 {
          margin: 0;
          font-size: 36px;
          font-weight: 800;
        }

        .tagline {
          font-size: 18px;
          opacity: 0.9;
        }

        .contract-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .label {
          opacity: 0.8;
        }

        .address {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
        }

        .explorer-link {
          color: white;
          text-decoration: none;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .explorer-link:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            text-align: center;
          }
          
          .brand h1 {
            font-size: 28px;
          }
          
          .tagline {
            font-size: 16px;
          }
        }
      `}</style>
    </header>
  );
};
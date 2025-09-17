// frontend/src/components/AnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { CONTRACT_ADDRESS } from '../config/contract';
import { pixelCanvasV2ABI } from '../config/abi';

interface TransactionMetrics {
  totalTransactions: number;
  transactionsPerSecond: number;
  averageGasUsed: number;
  totalVolume: bigint;
  uniqueUsers: number;
}

interface PixelActivity {
  timestamp: number;
  count: number;
  gasUsed: number;
  volume: bigint;
}

interface TopPainter {
  address: string;
  pixelCount: number;
  totalSpent: bigint;
  percentage: number;
}

interface Props {
  className?: string;
}

export const AnalyticsDashboard: React.FC<Props> = ({ className }) => {
  const [metrics, setMetrics] = useState<TransactionMetrics>({
    totalTransactions: 0,
    transactionsPerSecond: 0,
    averageGasUsed: 0,
    totalVolume: BigInt(0),
    uniqueUsers: 0
  });

  const [recentActivity, setRecentActivity] = useState<PixelActivity[]>([]);
  const [topPainters, setTopPainters] = useState<TopPainter[]>([]);
  const [pixelHistory, setPixelHistory] = useState<Array<{
    timestamp: number;
    x: number;
    y: number;
    color: string;
    painter: string;
    txHash: string;
  }>>([]);

  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [isLive, setIsLive] = useState(true);

  // Contract data
  const { data: canvasStats } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'getCanvasStats',
    query: { refetchInterval: isLive ? 5000 : false }
  });

  const { data: pixelPrice } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'pixelPrice',
  });

  // Debug logging
  console.log('Contract data:', { canvasStats, pixelPrice, CONTRACT_ADDRESS });

  // Process canvas stats when they arrive
  useEffect(() => {
    console.log('Canvas stats received:', canvasStats);
    console.log('Pixel price received:', pixelPrice);
    if (canvasStats && Array.isArray(canvasStats)) {
      const totalPixels = Number(canvasStats[2] || 0);
      const totalVolume = BigInt(canvasStats[3] || 0);
      
      setMetrics(prev => ({
        ...prev,
        totalTransactions: totalPixels,
        totalVolume: totalVolume
      }));
      
      console.log('Updated metrics with canvas stats:', { totalPixels, totalVolume });
    }
  }, [canvasStats, pixelPrice]);

  // Watch for real-time events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    eventName: 'PixelPainted',
    onLogs(logs) {
      console.log('PixelPainted event received:', logs);
      logs.forEach((log: any) => {
        const { tokenId, painter, x, y, color, timestamp } = log.args;
        
        // Add to pixel history
        const newPixel = {
          timestamp: Number(timestamp) * 1000,
          x: Number(x),
          y: Number(y),
          color: `#${color.toString(16).padStart(6, '0')}`,
          painter: painter as string,
          txHash: log.transactionHash || ''
        };

        console.log('Processing new pixel:', newPixel);

        setPixelHistory(prev => [newPixel, ...prev.slice(0, 99)]); // Keep last 100

        // Update metrics
        setMetrics(prev => ({
          ...prev,
          totalTransactions: prev.totalTransactions + 1,
          totalVolume: prev.totalVolume + (pixelPrice || BigInt(0))
        }));

        // Update recent activity (group by minute)
        const minuteTimestamp = Math.floor(Date.now() / 60000) * 60000;
        setRecentActivity(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(a => a.timestamp === minuteTimestamp);
          
          if (existingIndex >= 0) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              count: updated[existingIndex].count + 1,
              volume: updated[existingIndex].volume + (pixelPrice || BigInt(0))
            };
          } else {
            updated.unshift({
              timestamp: minuteTimestamp,
              count: 1,
              gasUsed: 100000, // Estimated
              volume: pixelPrice || BigInt(0)
            });
          }
          
          return updated.slice(0, 60); // Keep last 60 minutes
        });
      });
    },
  });

  // Calculate TPS and other derived metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      const recentPixels = pixelHistory.filter(p => p.timestamp > oneMinuteAgo);
      const tps = recentPixels.length / 60;
      
      // Calculate unique users
      const uniqueAddresses = new Set(pixelHistory.map(p => p.painter));
      
      setMetrics(prev => ({
        ...prev,
        transactionsPerSecond: tps,
        uniqueUsers: uniqueAddresses.size
      }));

      // Update top painters
      const painterStats = new Map<string, { count: number; volume: bigint }>();
      pixelHistory.forEach(pixel => {
        const current = painterStats.get(pixel.painter) || { count: 0, volume: BigInt(0) };
        painterStats.set(pixel.painter, {
          count: current.count + 1,
          volume: current.volume + (pixelPrice || BigInt(0))
        });
      });

      const sortedPainters = Array.from(painterStats.entries())
        .map(([address, stats]) => ({
          address,
          pixelCount: stats.count,
          totalSpent: stats.volume,
          percentage: (stats.count / pixelHistory.length) * 100
        }))
        .sort((a, b) => b.pixelCount - a.pixelCount)
        .slice(0, 10);

      setTopPainters(sortedPainters);
    }, 1000);

    return () => clearInterval(interval);
  }, [pixelHistory, pixelPrice]);

  // Filtered activity based on time range
  const filteredActivity = useMemo(() => {
    const now = Date.now();
    const timeRangeMs = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000
    };

    const cutoff = now - timeRangeMs[timeRange];
    return recentActivity.filter(a => a.timestamp > cutoff);
  }, [recentActivity, timeRange]);

  // Chart data for activity visualization
  const chartData = useMemo(() => {
    return filteredActivity.map(activity => ({
      time: new Date(activity.timestamp).toLocaleTimeString(),
      pixels: activity.count,
      volume: Number(activity.volume) / 1e18
    }));
  }, [filteredActivity]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEther = (value: bigint) => {
    return `${(Number(value) / 1e18).toFixed(4)} STT`;
  };

  // Calculate display values with proper fallbacks
  const displayTotalPixels = canvasStats ? Number(canvasStats[2] || 0) : metrics.totalTransactions;
  const displayPixelPrice = pixelPrice ? Number(pixelPrice) / 1e18 : 0;
  const displayTotalVolume = canvasStats ? Number(canvasStats[3] || 0) / 1e18 : Number(metrics.totalVolume) / 1e18;

  return (
    <div className={`analytics-dashboard ${className || ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <h2>🔥 Live Analytics</h2>
        <div className="controls">
          <div className="time-range-selector">
            {(['1h', '6h', '24h', '7d'] as const).map(range => (
              <button
                key={range}
                className={timeRange === range ? 'active' : ''}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            className={`live-toggle ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? '🔴 LIVE' : '⏸️ Paused'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{displayTotalPixels.toLocaleString()}</div>
          <div className="metric-label">Total Pixels</div>
          <div className="metric-change">+{metrics.transactionsPerSecond.toFixed(2)}/sec</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{metrics.uniqueUsers}</div>
          <div className="metric-label">Unique Artists</div>
          <div className="metric-change">Active users</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{displayTotalVolume.toFixed(4)} STT</div>
          <div className="metric-label">Total Volume</div>
          <div className="metric-change">Revenue generated</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{displayPixelPrice.toFixed(3)} STT</div>
          <div className="metric-label">Pixel Price</div>
          <div className="metric-change">Per pixel cost</div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="chart-container">
        <h3>Painting Activity</h3>
        <div className="simple-chart">
          {chartData.length > 0 ? (
            <div className="chart-bars">
              {chartData.slice(-20).map((data, index) => (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ 
                      height: `${Math.max(4, (data.pixels / Math.max(...chartData.map(d => d.pixels))) * 100)}px`
                    }}
                    title={`${data.time}: ${data.pixels} pixels`}
                  />
                  <div className="chart-label">{data.time.split(':').slice(0, 2).join(':')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No activity data yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Recent Pixels ({pixelHistory.length})</h3>
        <div className="activity-feed">
          {pixelHistory.slice(0, 10).map((pixel, index) => (
            <div key={index} className="activity-item">
              <div className="pixel-preview" style={{ backgroundColor: pixel.color }} />
              <div className="activity-details">
                <div className="activity-main">
                  <span className="painter">{formatAddress(pixel.painter)}</span>
                  <span className="position">painted ({pixel.x}, {pixel.y})</span>
                  <span className="time">{new Date(pixel.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="transaction-hash">
                  <a 
                    href={`https://shannon-explorer.somnia.network/tx/${pixel.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    {pixel.txHash.slice(0, 16)}...
                  </a>
                </div>
              </div>
            </div>
          ))}
          {pixelHistory.length === 0 && (
            <div className="no-data" style={{ padding: '20px', textAlign: 'center' }}>
              No pixels painted yet. Try using the batch tools!
            </div>
          )}
        </div>
      </div>

      {/* Top Painters */}
      <div className="top-painters">
        <h3>Top Artists</h3>
        <div className="painters-list">
          {topPainters.map((painter, index) => (
            <div key={painter.address} className="painter-item">
              <div className="painter-rank">#{index + 1}</div>
              <div className="painter-details">
                <div className="painter-address">{formatAddress(painter.address)}</div>
                <div className="painter-stats">
                  {painter.pixelCount} pixels • {formatEther(painter.totalSpent)}
                </div>
              </div>
              <div className="painter-percentage">
                {painter.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
          {topPainters.length === 0 && (
            <div className="no-data" style={{ padding: '20px', textAlign: 'center' }}>
              No artists yet. Be the first to paint!
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .analytics-dashboard {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }

        .dashboard-header h2 {
          margin: 0;
          color: #2d3748;
          font-size: 24px;
          font-weight: 700;
        }

        .controls {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .time-range-selector {
          display: flex;
          background: #f7fafc;
          border-radius: 8px;
          padding: 4px;
        }

        .time-range-selector button {
          padding: 6px 12px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .time-range-selector button.active {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          color: #2d3748;
        }

        .live-toggle {
          padding: 8px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .live-toggle.active {
          background: #f56565;
          border-color: #f56565;
          color: white;
          animation: pulse 2s infinite;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .metric-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .metric-change {
          font-size: 12px;
          opacity: 0.8;
        }

        .chart-container {
          margin-bottom: 32px;
        }

        .chart-container h3 {
          margin-bottom: 16px;
          color: #2d3748;
        }

        .simple-chart {
          background: #f7fafc;
          border-radius: 8px;
          padding: 16px;
          min-height: 200px;
        }

        .chart-bars {
          display: flex;
          align-items: end;
          gap: 8px;
          height: 120px;
        }

        .chart-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chart-bar {
          background: linear-gradient(to top, #4299e1, #63b3ed);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          width: 100%;
          transition: all 0.3s ease;
        }

        .chart-bar:hover {
          background: linear-gradient(to top, #3182ce, #4299e1);
        }

        .chart-label {
          font-size: 10px;
          color: #718096;
          margin-top: 4px;
        }

        .no-data {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #a0aec0;
          font-style: italic;
        }

        .recent-activity, .top-painters {
          margin-bottom: 24px;
        }

        .recent-activity h3, .top-painters h3 {
          margin-bottom: 16px;
          color: #2d3748;
        }

        .activity-feed {
          background: #f7fafc;
          border-radius: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          transition: background-color 0.2s;
        }

        .activity-item:hover {
          background: #edf2f7;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .pixel-preview {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          margin-right: 12px;
          border: 1px solid #e2e8f0;
        }

        .activity-details {
          flex: 1;
        }

        .activity-main {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 4px;
        }

        .painter {
          font-weight: 600;
          color: #2d3748;
        }

        .position {
          color: #718096;
        }

        .time {
          color: #a0aec0;
          font-size: 12px;
        }

        .tx-link {
          color: #4299e1;
          text-decoration: none;
          font-size: 12px;
          font-family: monospace;
        }

        .tx-link:hover {
          text-decoration: underline;
        }

        .painters-list {
          background: #f7fafc;
          border-radius: 8px;
        }

        .painter-item {
          display: flex;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .painter-item:last-child {
          border-bottom: none;
        }

        .painter-rank {
          font-size: 18px;
          font-weight: 700;
          color: #4299e1;
          margin-right: 16px;
          width: 40px;
        }

        .painter-details {
          flex: 1;
        }

        .painter-address {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 4px;
        }

        .painter-stats {
          color: #718096;
          font-size: 14px;
        }

        .painter-percentage {
          font-weight: 600;
          color: #48bb78;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
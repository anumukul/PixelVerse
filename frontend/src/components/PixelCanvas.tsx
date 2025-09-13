import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, VStack, HStack, Button, Text } from '@chakra-ui/react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { pixelNFTABI } from '../config/abi';
import { CONTRACT_ADDRESS } from '../config/contract';

// Simple toast implementation
const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  console.log(`${type.toUpperCase()}: ${message}`);
  alert(`${type.toUpperCase()}: ${message}`);
};

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner: string;
  timestamp: number;
}

interface PixelCanvasProps {
  socketRef: React.MutableRefObject<any>;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 4;
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFFFFF', '#000000', '#808080', '#800000', '#008000', '#000080',
  '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#87CEEB', '#DDA0DD'
];

export const PixelCanvas: React.FC<PixelCanvasProps> = ({ socketRef }) => {
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [userStats, setUserStats] = useState({ painted: 0, owned: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { address, isConnected } = useAccount();

  const { data: pixelPrice } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelNFTABI,
    functionName: 'pixelPrice',
  });

  const { data: canvasStats } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelNFTABI,
    functionName: 'getCanvasStats',
  });

  const { writeContractAsync: paintPixel } = useWriteContract();

  const drawPixels = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#F7FAFC';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= CANVAS_WIDTH; x += PIXEL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    
    for (let y = 0; y <= CANVAS_HEIGHT; y += PIXEL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * PIXEL_SIZE + 1,
        pixel.y * PIXEL_SIZE + 1,
        PIXEL_SIZE - 2,
        PIXEL_SIZE - 2
      );

      if (pixel.owner === address) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          pixel.x * PIXEL_SIZE,
          pixel.y * PIXEL_SIZE,
          PIXEL_SIZE,
          PIXEL_SIZE
        );
      }
    });
  }, [pixels, address]);

  useEffect(() => {
    drawPixels();
  }, [drawPixels]);

  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || !address) {
      showToast("Please connect your wallet to paint pixels", "warning");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SIZE);

    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

    await paintSinglePixel(x, y, selectedColor);
  }, [isConnected, address, selectedColor]);

  const paintSinglePixel = useCallback(async (x: number, y: number, color: string) => {
    if (!pixelPrice) {
      showToast("Please wait for contract to load", "warning");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Painting pixel:', { x, y, color, pixelPrice: pixelPrice.toString() });
      
      const tx = await paintPixel({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelNFTABI,
        functionName: 'paintPixel',
        args: [BigInt(x), BigInt(y), color],
        value: pixelPrice as bigint,
      });

      console.log('Transaction sent:', tx);

      const newPixel: Pixel = {
        x,
        y,
        color,
        owner: address!,
        timestamp: Date.now()
      };

      setPixels(prev => {
        const newPixels = new Map(prev);
        newPixels.set(`${x}-${y}`, newPixel);
        return newPixels;
      });

      if (socketRef.current && socketRef.current.emit) {
        socketRef.current.emit('paintPixel', newPixel);
      }

      showToast(`Painted pixel at (${x}, ${y}) for ${Number(pixelPrice) / 1e18} STT`, "success");

      setUserStats(prev => ({ ...prev, painted: prev.painted + 1 }));
    } catch (error: any) {
      console.error('Error painting pixel:', error);
      showToast(error.message || "Transaction failed", "error");
    } finally {
      setIsLoading(false);
    }
  }, [paintPixel, pixelPrice, address, socketRef]);

  return (
    <Box w="100%" h="100%" position="relative">
      <Box
        border="2px solid"
        borderColor="gray.300"
        position="relative"
        overflow="hidden"
        cursor={isConnected ? 'crosshair' : 'not-allowed'}
        display="inline-block"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          style={{
            display: 'block',
            imageRendering: 'pixelated'
          }}
        />

        {isLoading && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            bg="blackAlpha.800"
            color="white"
            px={4}
            py={2}
            borderRadius="md"
            zIndex={10}
          >
            <Text>Painting pixel...</Text>
          </Box>
        )}
      </Box>

      <VStack spacing={4} mt={4} align="stretch" maxW={CANVAS_WIDTH}>
        <Box>
          <Text fontSize="sm" color={isConnected ? "green.600" : "red.600"}>
            {isConnected ? "✅ Wallet Connected" : "❌ Connect wallet to paint pixels"}
          </Text>
        </Box>

        <Box>
          <Text mb={2} fontWeight="bold">Select Color:</Text>
          <HStack wrap="wrap" spacing={2}>
            {COLOR_PALETTE.map((color) => (
              <Box
                key={color}
                w={8}
                h={8}
                bg={color}
                border="3px solid"
                borderColor={selectedColor === color ? 'black' : 'gray.300'}
                cursor="pointer"
                onClick={() => setSelectedColor(color)}
                _hover={{ transform: 'scale(1.1)' }}
                transition="transform 0.2s"
              />
            ))}
          </HStack>
        </Box>

        <HStack spacing={6} wrap="wrap">
          <Text fontSize="sm">
            <strong>Canvas Size:</strong> {GRID_WIDTH} x {GRID_HEIGHT}
          </Text>
          <Text fontSize="sm">
            <strong>Pixels Painted:</strong> {userStats.painted}
          </Text>
          <Text fontSize="sm">
            <strong>Pixel Price:</strong> {pixelPrice ? `${Number(pixelPrice) / 1e18} STT` : 'Loading...'}
          </Text>
          <Text fontSize="sm">
            <strong>Total Pixels:</strong> {canvasStats ? String(canvasStats[2] || '0') : '0'}
          </Text>
        </HStack>

        <Box bg="blue.50" p={4} borderRadius="md">
          <Text fontSize="sm" color="blue.800">
            <strong>How to use:</strong> Select a color and click on any pixel to paint it as an NFT. 
            Each pixel costs {pixelPrice ? `${Number(pixelPrice) / 1e18} STT` : '0.001 STT'} and becomes your NFT instantly!
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};
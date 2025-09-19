

export const PixelCanvasABI=  [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "ArrayLengthMismatch",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "BatchTooLarge",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CannotBuyOwnToken",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InsufficientPayment",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidCoordinates",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidPrice",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotTokenOwner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PaymentFailed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PixelNotFound",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "RegionTooLarge",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "TokenAlreadyForSale",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "TokenNotForSale",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "approved",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "ApprovalForAll",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "tokenIds",
          "type": "uint256[]"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "painter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalCost",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        }
      ],
      "name": "BatchPixelsPainted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        }
      ],
      "name": "PixelListedForSale",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "painter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "x",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "y",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "color",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "version",
          "type": "uint16"
        }
      ],
      "name": "PixelPainted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        }
      ],
      "name": "PixelRemovedFromSale",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        }
      ],
      "name": "PixelSold",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "x",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "y",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        }
      ],
      "name": "UserCursorMoved",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "CANVAS_HEIGHT",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "CANVAS_WIDTH",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "FEE_DENOMINATOR",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16[]",
          "name": "xCoords",
          "type": "uint16[]"
        },
        {
          "internalType": "uint16[]",
          "name": "yCoords",
          "type": "uint16[]"
        },
        {
          "internalType": "uint32[]",
          "name": "colors",
          "type": "uint32[]"
        }
      ],
      "name": "batchPaintPixels",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "buyPixel",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "coordinateToTokenId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "forSale",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "getApproved",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "startX",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "startY",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "width",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "height",
          "type": "uint16"
        }
      ],
      "name": "getCanvasRegion",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint16",
              "name": "x",
              "type": "uint16"
            },
            {
              "internalType": "uint16",
              "name": "y",
              "type": "uint16"
            },
            {
              "internalType": "uint32",
              "name": "color",
              "type": "uint32"
            },
            {
              "internalType": "address",
              "name": "painter",
              "type": "address"
            },
            {
              "internalType": "uint32",
              "name": "timestamp",
              "type": "uint32"
            },
            {
              "internalType": "uint16",
              "name": "version",
              "type": "uint16"
            }
          ],
          "internalType": "struct PixelCanvas.Pixel[]",
          "name": "regionPixels",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCanvasStats",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "width",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "height",
          "type": "uint16"
        },
        {
          "internalType": "uint256",
          "name": "painted",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalSupply",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMarketplaceStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalForSale",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "marketplaceFeePercent",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalTradingVolume",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16[]",
          "name": "xCoords",
          "type": "uint16[]"
        },
        {
          "internalType": "uint16[]",
          "name": "yCoords",
          "type": "uint16[]"
        }
      ],
      "name": "getMultiplePixels",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint16",
              "name": "x",
              "type": "uint16"
            },
            {
              "internalType": "uint16",
              "name": "y",
              "type": "uint16"
            },
            {
              "internalType": "uint32",
              "name": "color",
              "type": "uint32"
            },
            {
              "internalType": "address",
              "name": "painter",
              "type": "address"
            },
            {
              "internalType": "uint32",
              "name": "timestamp",
              "type": "uint32"
            },
            {
              "internalType": "uint16",
              "name": "version",
              "type": "uint16"
            }
          ],
          "internalType": "struct PixelCanvas.Pixel[]",
          "name": "resultPixels",
          "type": "tuple[]"
        },
        {
          "internalType": "bool[]",
          "name": "exists",
          "type": "bool[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "x",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "y",
          "type": "uint16"
        }
      ],
      "name": "getPixelByCoordinates",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint16",
              "name": "x",
              "type": "uint16"
            },
            {
              "internalType": "uint16",
              "name": "y",
              "type": "uint16"
            },
            {
              "internalType": "uint32",
              "name": "color",
              "type": "uint32"
            },
            {
              "internalType": "address",
              "name": "painter",
              "type": "address"
            },
            {
              "internalType": "uint32",
              "name": "timestamp",
              "type": "uint32"
            },
            {
              "internalType": "uint16",
              "name": "version",
              "type": "uint16"
            }
          ],
          "internalType": "struct PixelCanvas.Pixel",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "getPixelSaleInfo",
      "outputs": [
        {
          "internalType": "bool",
          "name": "isForSale",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "offset",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "limit",
          "type": "uint256"
        }
      ],
      "name": "getTokensForSale",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "tokens",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "prices",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "total",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserPixels",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "isApprovedForAll",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        }
      ],
      "name": "listPixelForSale",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "marketplaceFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ownerOf",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "x",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "y",
          "type": "uint16"
        },
        {
          "internalType": "uint32",
          "name": "color",
          "type": "uint32"
        }
      ],
      "name": "paintPixel",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pixelPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "pixelPrices",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "pixels",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "x",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "y",
          "type": "uint16"
        },
        {
          "internalType": "uint32",
          "name": "color",
          "type": "uint32"
        },
        {
          "internalType": "address",
          "name": "painter",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        },
        {
          "internalType": "uint16",
          "name": "version",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "removeFromSale",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "sellers",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newFee",
          "type": "uint256"
        }
      ],
      "name": "setMarketplaceFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bool",
          "name": "_paused",
          "type": "bool"
        }
      ],
      "name": "setPaused",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newPrice",
          "type": "uint256"
        }
      ],
      "name": "setPixelPrice",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "tokenURI",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tokensForSale",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalPixelsPainted",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "x",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "y",
          "type": "uint16"
        }
      ],
      "name": "updateCursor",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userPixels",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]  as const;
   


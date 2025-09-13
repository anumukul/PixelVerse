// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PixelCanvasV2 is ERC721, Ownable {
    struct Pixel {
        uint16 x;
        uint16 y;
        uint32 color;
        address painter;
        uint32 timestamp;
        uint16 version;
    }

    mapping(uint256 => Pixel) public pixels;
    mapping(bytes32 => uint256) public coordinateToTokenId;
    mapping(address => uint256[]) public userPixels;

    uint256 private _tokenIdCounter = 1;
    uint256 public pixelPrice = 0.001 ether;
    uint16 public constant CANVAS_WIDTH = 1000;
    uint16 public constant CANVAS_HEIGHT = 1000;
    uint256 public totalPixelsPainted = 0;

    // Simple reentrancy guard
    bool private _locked = false;
    modifier noReentrancy() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    event PixelPainted(
        uint256 indexed tokenId,
        address indexed painter,
        uint16 x,
        uint16 y,
        uint32 color,
        uint32 timestamp,
        uint16 version
    );
    event BatchPixelsPainted(
        uint256[] tokenIds,
        address indexed painter,
        uint256 totalCost,
        uint32 timestamp
    );
    event UserCursorMoved(
        address indexed user,
        uint16 x,
        uint16 y,
        uint32 timestamp
    );
    event RegionUpdated(
        uint16 startX,
        uint16 startY,
        uint16 width,
        uint16 height,
        uint32 timestamp
    );

    constructor() ERC721("PixelCanvasV2", "PIXV2") {}

    function paintPixel(
        uint16 x,
        uint16 y,
        uint32 color
    ) external payable noReentrancy {
        require(
            x < CANVAS_WIDTH && y < CANVAS_HEIGHT,
            "Coordinates out of bounds"
        );
        require(msg.value >= pixelPrice, "Insufficient payment");

        uint256 tokenId = _paintPixelInternal(x, y, color);

        if (msg.value > pixelPrice) {
            payable(msg.sender).transfer(msg.value - pixelPrice);
        }

        emit PixelPainted(
            tokenId,
            msg.sender,
            x,
            y,
            color,
            uint32(block.timestamp),
            pixels[tokenId].version
        );
    }

    function batchPaintPixels(
        uint16[] calldata xCoords,
        uint16[] calldata yCoords,
        uint32[] calldata colors
    ) external payable noReentrancy {
        require(
            xCoords.length == yCoords.length && yCoords.length == colors.length,
            "Array length mismatch"
        );
        require(xCoords.length <= 50, "Batch too large");
        require(
            msg.value >= pixelPrice * xCoords.length,
            "Insufficient payment"
        );

        uint256[] memory tokenIds = new uint256[](xCoords.length);

        for (uint256 i = 0; i < xCoords.length; i++) {
            tokenIds[i] = _paintPixelInternal(
                xCoords[i],
                yCoords[i],
                colors[i]
            );
            emit PixelPainted(
                tokenIds[i],
                msg.sender,
                xCoords[i],
                yCoords[i],
                colors[i],
                uint32(block.timestamp),
                pixels[tokenIds[i]].version
            );
        }

        uint256 totalCost = pixelPrice * xCoords.length;
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit BatchPixelsPainted(
            tokenIds,
            msg.sender,
            totalCost,
            uint32(block.timestamp)
        );
    }

    function _paintPixelInternal(
        uint16 x,
        uint16 y,
        uint32 color
    ) internal returns (uint256) {
        bytes32 coordHash = keccak256(abi.encodePacked(x, y));
        uint256 existingTokenId = coordinateToTokenId[coordHash];

        if (existingTokenId == 0) {
            uint256 tokenId = _tokenIdCounter++;
            coordinateToTokenId[coordHash] = tokenId;
            userPixels[msg.sender].push(tokenId);
            totalPixelsPainted++;

            pixels[tokenId] = Pixel({
                x: x,
                y: y,
                color: color,
                painter: msg.sender,
                timestamp: uint32(block.timestamp),
                version: 1
            });

            _safeMint(msg.sender, tokenId);
            return tokenId;
        } else {
            address currentOwner = ownerOf(existingTokenId);
            _transfer(currentOwner, msg.sender, existingTokenId);

            pixels[existingTokenId].color = color;
            pixels[existingTokenId].painter = msg.sender;
            pixels[existingTokenId].timestamp = uint32(block.timestamp);
            pixels[existingTokenId].version++;

            _removePixelFromUser(currentOwner, existingTokenId);
            userPixels[msg.sender].push(existingTokenId);

            return existingTokenId;
        }
    }

    function updateCursor(uint16 x, uint16 y) external {
        require(
            x < CANVAS_WIDTH && y < CANVAS_HEIGHT,
            "Coordinates out of bounds"
        );
        emit UserCursorMoved(msg.sender, x, y, uint32(block.timestamp));
    }

    function getPixelByCoordinates(
        uint16 x,
        uint16 y
    ) external view returns (Pixel memory) {
        bytes32 coordHash = keccak256(abi.encodePacked(x, y));
        uint256 tokenId = coordinateToTokenId[coordHash];
        require(tokenId != 0, "No pixel at coordinates");
        return pixels[tokenId];
    }

    function getCanvasRegion(
        uint16 startX,
        uint16 startY,
        uint16 width,
        uint16 height
    ) external view returns (Pixel[] memory regionPixels) {
        require(startX + width <= CANVAS_WIDTH, "Region exceeds canvas width");
        require(
            startY + height <= CANVAS_HEIGHT,
            "Region exceeds canvas height"
        );
        require(width <= 100 && height <= 100, "Region too large");

        uint256 maxPixels = uint256(width) * uint256(height);
        Pixel[] memory tempPixels = new Pixel[](maxPixels);
        uint256 pixelCount = 0;

        for (uint16 y = startY; y < startY + height; y++) {
            for (uint16 x = startX; x < startX + width; x++) {
                bytes32 coordHash = keccak256(abi.encodePacked(x, y));
                uint256 tokenId = coordinateToTokenId[coordHash];
                if (tokenId != 0) {
                    tempPixels[pixelCount] = pixels[tokenId];
                    pixelCount++;
                }
            }
        }

        regionPixels = new Pixel[](pixelCount);
        for (uint256 i = 0; i < pixelCount; i++) {
            regionPixels[i] = tempPixels[i];
        }

        // Removed emit RegionUpdated - can't emit events in view functions
    }

    function getUserPixels(
        address user
    ) external view returns (uint256[] memory) {
        return userPixels[user];
    }

    function getCanvasStats()
        external
        view
        returns (
            uint16 width,
            uint16 height,
            uint256 painted,
            uint256 price,
            uint256 totalSupply
        )
    {
        return (
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            totalPixelsPainted,
            pixelPrice,
            _tokenIdCounter - 1
        );
    }

    function _removePixelFromUser(address user, uint256 tokenId) internal {
        uint256[] storage userTokens = userPixels[user];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == tokenId) {
                userTokens[i] = userTokens[userTokens.length - 1];
                userTokens.pop();
                break;
            }
        }
    }

    function setPixelPrice(uint256 newPrice) external onlyOwner {
        pixelPrice = newPrice;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PixelCanvas is ERC721, Ownable, ReentrancyGuard {
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

    error InvalidCoordinates();
    error InsufficientPayment();
    error ArrayLengthMismatch();
    error BatchTooLarge();
    error RegionTooLarge();
    error PixelNotFound();

    constructor() ERC721("PixelCanvasV2", "PIXV2") {}

    function paintPixel(
        uint16 x,
        uint16 y,
        uint32 color
    ) external payable nonReentrant {
        if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT)
            revert InvalidCoordinates();
        if (msg.value < pixelPrice) revert InsufficientPayment();

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
    ) external payable nonReentrant {
        if (
            xCoords.length != yCoords.length || yCoords.length != colors.length
        ) {
            revert ArrayLengthMismatch();
        }
        if (xCoords.length > 50) revert BatchTooLarge();
        if (msg.value < pixelPrice * xCoords.length)
            revert InsufficientPayment();

        uint256[] memory tokenIds = new uint256[](xCoords.length);

        for (uint256 i = 0; i < xCoords.length; i++) {
            if (xCoords[i] >= CANVAS_WIDTH || yCoords[i] >= CANVAS_HEIGHT) {
                revert InvalidCoordinates();
            }
            tokenIds[i] = _paintPixelInternal(
                xCoords[i],
                yCoords[i],
                colors[i]
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
        if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT)
            revert InvalidCoordinates();
        emit UserCursorMoved(msg.sender, x, y, uint32(block.timestamp));
    }

    function getPixelByCoordinates(
        uint16 x,
        uint16 y
    ) external view returns (Pixel memory) {
        bytes32 coordHash = keccak256(abi.encodePacked(x, y));
        uint256 tokenId = coordinateToTokenId[coordHash];
        if (tokenId == 0) revert PixelNotFound();
        return pixels[tokenId];
    }

    function getCanvasRegion(
        uint16 startX,
        uint16 startY,
        uint16 width,
        uint16 height
    ) external view returns (Pixel[] memory regionPixels) {
        if (startX + width > CANVAS_WIDTH || startY + height > CANVAS_HEIGHT) {
            revert InvalidCoordinates();
        }
        if (width > 100 || height > 100) revert RegionTooLarge();

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
    }

    function getMultiplePixels(
        uint16[] calldata xCoords,
        uint16[] calldata yCoords
    )
        external
        view
        returns (Pixel[] memory resultPixels, bool[] memory exists)
    {
        if (xCoords.length != yCoords.length) revert ArrayLengthMismatch();

        resultPixels = new Pixel[](xCoords.length);
        exists = new bool[](xCoords.length);

        for (uint256 i = 0; i < xCoords.length; i++) {
            bytes32 coordHash = keccak256(
                abi.encodePacked(xCoords[i], yCoords[i])
            );
            uint256 tokenId = coordinateToTokenId[coordHash];
            if (tokenId != 0) {
                resultPixels[i] = pixels[tokenId];
                exists[i] = true;
            }
        }
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

    bool public paused = false;

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}

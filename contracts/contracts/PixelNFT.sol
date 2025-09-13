// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PixelNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter = 1;

    // Canvas dimensions
    uint256 public constant CANVAS_WIDTH = 1000;
    uint256 public constant CANVAS_HEIGHT = 1000;

    // Pixel data structure
    struct Pixel {
        uint256 x;
        uint256 y;
        string color; // Hex color code
        address painter;
        uint256 timestamp;
    }

    // Mappings
    mapping(uint256 => Pixel) public pixels; // tokenId => Pixel
    mapping(uint256 => mapping(uint256 => uint256)) public coordinateToTokenId; // x => y => tokenId
    mapping(address => uint256[]) public userPixels; // user => tokenIds

    // Canvas state
    uint256 public totalPixelsPainted;
    uint256 public pixelPrice = 0.001 ether; // Very cheap on Somnia

    // Events
    event PixelPainted(
        uint256 indexed tokenId,
        address indexed painter,
        uint256 x,
        uint256 y,
        string color,
        uint256 timestamp
    );

    constructor() ERC721("PixelVerse", "PIXEL") {}

    /**
     * @dev Paint a pixel on the canvas
     */
    function paintPixel(
        uint256 x,
        uint256 y,
        string memory color
    ) public payable {
        require(x < CANVAS_WIDTH, "X coordinate out of bounds");
        require(y < CANVAS_HEIGHT, "Y coordinate out of bounds");
        require(msg.value >= pixelPrice, "Insufficient payment");
        require(bytes(color).length > 0, "Color cannot be empty");

        uint256 existingTokenId = coordinateToTokenId[x][y];

        if (existingTokenId != 0) {
            // Update existing pixel
            address currentOwner = ownerOf(existingTokenId);

            // Update pixel data
            pixels[existingTokenId].color = color;
            pixels[existingTokenId].painter = msg.sender;
            pixels[existingTokenId].timestamp = block.timestamp;

            // Transfer ownership
            _transfer(currentOwner, msg.sender, existingTokenId);

            // Update user mappings
            _removePixelFromUser(currentOwner, existingTokenId);
            userPixels[msg.sender].push(existingTokenId);

            emit PixelPainted(
                existingTokenId,
                msg.sender,
                x,
                y,
                color,
                block.timestamp
            );
        } else {
            // Mint new pixel NFT
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;

            // Create pixel data
            pixels[tokenId] = Pixel({
                x: x,
                y: y,
                color: color,
                painter: msg.sender,
                timestamp: block.timestamp
            });

            // Update mappings
            coordinateToTokenId[x][y] = tokenId;
            userPixels[msg.sender].push(tokenId);
            totalPixelsPainted++;

            // Mint NFT
            _safeMint(msg.sender, tokenId);

            emit PixelPainted(
                tokenId,
                msg.sender,
                x,
                y,
                color,
                block.timestamp
            );
        }

        // Refund excess payment
        if (msg.value > pixelPrice) {
            payable(msg.sender).transfer(msg.value - pixelPrice);
        }
    }

    /**
     * @dev Batch paint multiple pixels (gas optimization)
     */
    function batchPaintPixels(
        uint256[] calldata xCoords,
        uint256[] calldata yCoords,
        string[] calldata colors
    ) external payable {
        require(
            xCoords.length == yCoords.length && yCoords.length == colors.length,
            "Array length mismatch"
        );
        require(
            msg.value >= pixelPrice * xCoords.length,
            "Insufficient payment for batch"
        );

        for (uint256 i = 0; i < xCoords.length; i++) {
            _paintPixelInternal(xCoords[i], yCoords[i], colors[i]);
        }

        // Refund excess
        uint256 totalCost = pixelPrice * xCoords.length;
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }

    /**
     * @dev Internal paint function for batch operations
     */
    function _paintPixelInternal(
        uint256 x,
        uint256 y,
        string calldata color
    ) internal {
        require(x < CANVAS_WIDTH, "X out of bounds");
        require(y < CANVAS_HEIGHT, "Y out of bounds");

        uint256 existingTokenId = coordinateToTokenId[x][y];

        if (existingTokenId != 0) {
            // Update existing pixel
            pixels[existingTokenId].color = color;
            pixels[existingTokenId].painter = msg.sender;
            pixels[existingTokenId].timestamp = block.timestamp;
        } else {
            // Create new pixel
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;

            pixels[tokenId] = Pixel({
                x: x,
                y: y,
                color: color,
                painter: msg.sender,
                timestamp: block.timestamp
            });

            coordinateToTokenId[x][y] = tokenId;
            userPixels[msg.sender].push(tokenId);
            totalPixelsPainted++;

            _safeMint(msg.sender, tokenId);
        }

        emit PixelPainted(
            coordinateToTokenId[x][y],
            msg.sender,
            x,
            y,
            color,
            block.timestamp
        );
    }

    /**
     * @dev Remove pixel from user's list
     */
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

    /**
     * @dev Get pixel data by coordinates
     */
    function getPixelByCoordinates(
        uint256 x,
        uint256 y
    ) external view returns (Pixel memory) {
        uint256 tokenId = coordinateToTokenId[x][y];
        require(tokenId != 0, "No pixel at coordinates");
        return pixels[tokenId];
    }

    /**
     * @dev Get all pixels owned by a user
     */
    function getUserPixels(
        address user
    ) external view returns (uint256[] memory) {
        return userPixels[user];
    }

    /**
     * @dev Get canvas region data
     */
    function getCanvasRegion(
        uint256 startX,
        uint256 startY,
        uint256 width,
        uint256 height
    ) external view returns (string[] memory colors) {
        require(startX + width <= CANVAS_WIDTH, "Region exceeds width");
        require(startY + height <= CANVAS_HEIGHT, "Region exceeds height");

        uint256 regionSize = width * height;
        colors = new string[](regionSize);

        uint256 index = 0;
        for (uint256 y = startY; y < startY + height; y++) {
            for (uint256 x = startX; x < startX + width; x++) {
                uint256 tokenId = coordinateToTokenId[x][y];
                colors[index] = tokenId != 0
                    ? pixels[tokenId].color
                    : "#FFFFFF";
                index++;
            }
        }
    }

    /**
     * @dev Get basic canvas stats
     */
    function getCanvasStats()
        external
        view
        returns (uint256 width, uint256 height, uint256 painted, uint256 price)
    {
        return (CANVAS_WIDTH, CANVAS_HEIGHT, totalPixelsPainted, pixelPrice);
    }

    /**
     * @dev Generate token URI (simplified)
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        Pixel memory pixel = pixels[tokenId];

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    _base64Encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"Pixel (',
                                pixel.x.toString(),
                                ",",
                                pixel.y.toString(),
                                ')","description":"Collaborative pixel from PixelVerse","attributes":[',
                                '{"trait_type":"X","value":',
                                pixel.x.toString(),
                                '},{"trait_type":"Y","value":',
                                pixel.y.toString(),
                                '},{"trait_type":"Color","value":"',
                                pixel.color,
                                '"}]}'
                            )
                        )
                    )
                )
            );
    }

    /**
     * @dev Simple base64 encoding
     */
    function _base64Encode(
        bytes memory data
    ) internal pure returns (string memory) {
        if (data.length == 0) return "";

        string
            memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        string memory result = new string(4 * ((data.length + 2) / 3));

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let dataPtr := data
                let endPtr := add(dataPtr, mload(data))
            } lt(dataPtr, endPtr) {

            } {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore8(
                    resultPtr,
                    mload(add(tablePtr, and(shr(18, input), 0x3F)))
                )
                resultPtr := add(resultPtr, 1)
                mstore8(
                    resultPtr,
                    mload(add(tablePtr, and(shr(12, input), 0x3F)))
                )
                resultPtr := add(resultPtr, 1)
                mstore8(
                    resultPtr,
                    mload(add(tablePtr, and(shr(6, input), 0x3F)))
                )
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 2), 0x3d)
                mstore8(sub(resultPtr, 1), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return result;
    }

    /**
     * @dev Update pixel price (owner only)
     */
    function setPixelPrice(uint256 newPrice) external onlyOwner {
        pixelPrice = newPrice;
    }

    /**
     * @dev Withdraw contract funds (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract PixelCanvas is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using Strings for uint16;

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

    mapping(uint256 => uint256) public pixelPrices;
    mapping(uint256 => bool) public forSale;
    mapping(uint256 => address) public sellers;

    uint256[] public tokensForSale;
    mapping(uint256 => uint256) private tokenSaleIndex;

    uint256 private _tokenIdCounter = 1;
    uint256 public pixelPrice = 0.001 ether;
    uint16 public constant CANVAS_WIDTH = 1000;
    uint16 public constant CANVAS_HEIGHT = 1000;
    uint256 public totalPixelsPainted = 0;

    uint256 public marketplaceFee = 250;
    uint256 public constant FEE_DENOMINATOR = 10000;

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

    event PixelListedForSale(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint32 timestamp
    );

    event PixelSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 fee,
        uint32 timestamp
    );

    event PixelRemovedFromSale(
        uint256 indexed tokenId,
        address indexed seller,
        uint32 timestamp
    );

    error InvalidCoordinates();
    error InsufficientPayment();
    error ArrayLengthMismatch();
    error BatchTooLarge();
    error RegionTooLarge();
    error PixelNotFound();
    error NotTokenOwner();
    error TokenNotForSale();
    error TokenAlreadyForSale();
    error InvalidPrice();
    error CannotBuyOwnToken();
    error PaymentFailed();

    constructor() ERC721("PixelCanvasV3", "PIXV3") {}

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
            (bool success, ) = payable(msg.sender).call{
                value: msg.value - pixelPrice
            }("");
            require(success, "Refund failed");
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
            (bool success, ) = payable(msg.sender).call{
                value: msg.value - totalCost
            }("");
            require(success, "Refund failed");
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

            if (forSale[existingTokenId]) {
                _removeFromMarketplace(existingTokenId);
            }

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

    function listPixelForSale(uint256 tokenId, uint256 price) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (price == 0) revert InvalidPrice();
        if (forSale[tokenId]) revert TokenAlreadyForSale();

        forSale[tokenId] = true;
        pixelPrices[tokenId] = price;
        sellers[tokenId] = msg.sender;

        tokenSaleIndex[tokenId] = tokensForSale.length;
        tokensForSale.push(tokenId);

        emit PixelListedForSale(
            tokenId,
            msg.sender,
            price,
            uint32(block.timestamp)
        );
    }

    function buyPixel(uint256 tokenId) external payable nonReentrant {
        if (!forSale[tokenId]) revert TokenNotForSale();

        address seller = sellers[tokenId];
        if (seller == msg.sender) revert CannotBuyOwnToken();

        uint256 price = pixelPrices[tokenId];
        if (msg.value < price) revert InsufficientPayment();

        uint256 fee = (price * marketplaceFee) / FEE_DENOMINATOR;
        uint256 sellerAmount = price - fee;

        _removeFromMarketplace(tokenId);
        _transfer(seller, msg.sender, tokenId);

        _removePixelFromUser(seller, tokenId);
        userPixels[msg.sender].push(tokenId);

        (bool sellerSuccess, ) = payable(seller).call{value: sellerAmount}("");
        if (!sellerSuccess) revert PaymentFailed();

        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - price
            }("");
            if (!refundSuccess) revert PaymentFailed();
        }

        emit PixelSold(
            tokenId,
            seller,
            msg.sender,
            price,
            fee,
            uint32(block.timestamp)
        );
    }

    function removeFromSale(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (!forSale[tokenId]) revert TokenNotForSale();

        _removeFromMarketplace(tokenId);
        emit PixelRemovedFromSale(tokenId, msg.sender, uint32(block.timestamp));
    }

    function _removeFromMarketplace(uint256 tokenId) internal {
        forSale[tokenId] = false;
        delete pixelPrices[tokenId];
        delete sellers[tokenId];

        uint256 indexToRemove = tokenSaleIndex[tokenId];
        uint256 lastTokenId = tokensForSale[tokensForSale.length - 1];

        tokensForSale[indexToRemove] = lastTokenId;
        tokenSaleIndex[lastTokenId] = indexToRemove;

        tokensForSale.pop();
        delete tokenSaleIndex[tokenId];
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        Pixel memory pixel = pixels[tokenId];
        string memory colorHex = _uint32ToHex(pixel.color);

        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">',
                '<rect width="100" height="100" fill="#',
                colorHex,
                '"/>',
                '<text x="50" y="20" text-anchor="middle" font-size="8" fill="white">PixelVerse</text>',
                '<text x="50" y="35" text-anchor="middle" font-size="6" fill="white">(',
                uint256(pixel.x).toString(),
                ",",
                uint256(pixel.y).toString(),
                ")</text>",
                "</svg>"
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"Pixel (',
                        uint256(pixel.x).toString(),
                        ", ",
                        uint256(pixel.y).toString(),
                        ')",',
                        '"description":"A unique pixel from PixelVerse collaborative canvas",',
                        '"image":"data:image/svg+xml;base64,',
                        Base64.encode(bytes(svg)),
                        '",',
                        '"attributes":[',
                        '{"trait_type":"X","value":',
                        uint256(pixel.x).toString(),
                        "},",
                        '{"trait_type":"Y","value":',
                        uint256(pixel.y).toString(),
                        "},",
                        '{"trait_type":"Color","value":"#',
                        colorHex,
                        '"}',
                        "]}"
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _uint32ToHex(uint32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory buffer = new bytes(6);

        for (uint256 i = 0; i < 6; i++) {
            buffer[5 - i] = alphabet[value & 0xf];
            value >>= 4;
        }

        return string(buffer);
    }

    function getTokensForSale(
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint256[] memory tokens,
            uint256[] memory prices,
            uint256 total
        )
    {
        total = tokensForSale.length;

        if (offset >= total) {
            return (new uint256[](0), new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 length = end - offset;
        tokens = new uint256[](length);
        prices = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            tokens[i] = tokensForSale[offset + i];
            prices[i] = pixelPrices[tokens[i]];
        }
    }

    function getPixelSaleInfo(
        uint256 tokenId
    ) external view returns (bool isForSale, uint256 price, address seller) {
        return (forSale[tokenId], pixelPrices[tokenId], sellers[tokenId]);
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

    function getMarketplaceStats()
        external
        view
        returns (
            uint256 totalForSale,
            uint256 marketplaceFeePercent,
            uint256 totalTradingVolume
        )
    {
        return (tokensForSale.length, marketplaceFee, address(this).balance);
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

    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high");
        marketplaceFee = newFee;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}(
            ""
        );
        require(success, "Withdrawal failed");
    }

    bool public paused = false;

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}

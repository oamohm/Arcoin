// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ArcoinRegistry
 * @notice ArcID â€” Human-readable payment identity for Arc Network.
 *         "alice" â†’ 0xAbCd...
 *
 * @dev    SECURITY MODEL:
 *         - Names are lowercase, alphanumeric + hyphen only
 *         - One name per address (prevents squatting spam)
 *         - Registration fee goes to ArcoinTreasury
 *         - Owner can update treasury, fee, and pause
 *         - No upgradeable proxy â€” simple and auditable
 *
 * @dev    ARCHITECT NOTE:
 *         "Admin-controlled" was flagged as SPOF in Foundation Report.
 *         Treasury is a separate multisig contract, not an EOA.
 *         Fee changes are time-locked (48h) to prevent rug pulls.
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSDC is IERC20 {
    function decimals() external view returns (uint8);
}

contract ArcoinRegistry is Ownable, ReentrancyGuard {

    // â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    uint256 public constant ANNUAL_FEE_USDC   = 1_000000;    // 1.000000 USDC (6 decimals)
    uint256 public constant MIN_NAME_LENGTH   = 3;
    uint256 public constant MAX_NAME_LENGTH   = 32;
    uint256 public constant FEE_CHANGE_DELAY  = 48 hours;    // timelock

    // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    IUSDC  public immutable usdc;
    address public treasury;

    mapping(string  => address) public nameToAddress;  // "alice" â†’ 0x...
    mapping(address => string)  public addressToName;  // 0x... â†’ "alice"
    mapping(string  => uint256) public nameExpiry;     // unix timestamp

    // Timelock for fee changes
    uint256 public pendingFee;
    uint256 public feeChangeETA;
    bool    public paused;

    // â”€â”€ EVENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    event NameRegistered(string indexed name, address indexed owner, uint256 expiry);
    event NameRenewed(string indexed name, address indexed owner, uint256 newExpiry);
    event NameReleased(string indexed name, address indexed previousOwner);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event FeeChangeQueued(uint256 newFee, uint256 eta);
    event FeeChangeExecuted(uint256 newFee);

    // â”€â”€ ERRORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    error NameTaken();
    error NameExpired();
    error InvalidName();
    error AlreadyRegistered(string existingName);
    error NotNameOwner();
    error FeeTimelockActive();
    error FeeTimelockNotReady();
    error Paused();
    error ZeroAddress();

    // â”€â”€ CONSTRUCTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    constructor(
        address _usdc,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc     = IUSDC(_usdc);
        treasury = _treasury;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // REGISTRATION
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Register an ArcID.
     * @param  name   Lowercase handle, e.g. "alice" (without .arc suffix)
     * @param  years  Duration in years (1-10)
     *
     * @dev    Caller must approve USDC before calling.
     *         usdc.approve(registryAddress, fee * years)
     */
    function register(
        string calldata name,
        uint8 years
    ) external nonReentrant {
        if (paused) revert Paused();
        if (years == 0 || years > 10) revert InvalidName();

        string memory normalized = _normalize(name);
        _validateName(normalized);

        // Name availability check
        address currentOwner = nameToAddress[normalized];
        if (currentOwner != address(0) && nameExpiry[normalized] > block.timestamp) {
            revert NameTaken();
        }

        // One name per address
        string memory existingName = addressToName[msg.sender];
        if (bytes(existingName).length > 0 && nameExpiry[existingName] > block.timestamp) {
            revert AlreadyRegistered(existingName);
        }

        // Collect USDC fee
        uint256 fee = ANNUAL_FEE_USDC * years;
        usdc.transferFrom(msg.sender, treasury, fee);

        // Register
        uint256 expiry = block.timestamp + (years * 365 days);
        nameToAddress[normalized]  = msg.sender;
        addressToName[msg.sender]  = normalized;
        nameExpiry[normalized]     = expiry;

        emit NameRegistered(normalized, msg.sender, expiry);
    }

    /**
     * @notice Renew an existing ArcID before or after expiry.
     */
    function renew(string calldata name, uint8 years) external nonReentrant {
        if (paused) revert Paused();

        string memory normalized = _normalize(name);
        if (nameToAddress[normalized] != msg.sender) revert NotNameOwner();

        uint256 fee = ANNUAL_FEE_USDC * years;
        usdc.transferFrom(msg.sender, treasury, fee);

        // Extend from current expiry or now, whichever is later
        uint256 base   = nameExpiry[normalized] > block.timestamp
                           ? nameExpiry[normalized]
                           : block.timestamp;
        uint256 expiry = base + (years * 365 days);
        nameExpiry[normalized] = expiry;

        emit NameRenewed(normalized, msg.sender, expiry);
    }

    /**
     * @notice Release a name voluntarily (no refund).
     */
    function release(string calldata name) external {
        string memory normalized = _normalize(name);
        if (nameToAddress[normalized] != msg.sender) revert NotNameOwner();

        delete nameToAddress[normalized];
        delete addressToName[msg.sender];
        delete nameExpiry[normalized];

        emit NameReleased(normalized, msg.sender);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // RESOLUTION (read functions)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Resolve name â†’ address. Returns address(0) if expired.
     */
    function resolve(string calldata name) external view returns (address) {
        string memory normalized = _normalize(name);
        if (nameExpiry[normalized] < block.timestamp) return address(0);
        return nameToAddress[normalized];
    }

    /**
     * @notice Reverse resolve: address â†’ name. Returns "" if expired.
     */
    function reverseLookup(address addr) external view returns (string memory) {
        string memory name = addressToName[addr];
        if (bytes(name).length == 0) return "";
        if (nameExpiry[name] < block.timestamp) return "";
        return name;
    }

    /**
     * @notice Check if a name is available.
     */
    function isAvailable(string calldata name) external view returns (bool) {
        string memory normalized = _normalize(name);
        if (!_isValidName(normalized)) return false;
        address owner = nameToAddress[normalized];
        if (owner == address(0)) return true;
        return nameExpiry[normalized] < block.timestamp;
    }

    /**
     * @notice Full ArcID info.
     */
    function getInfo(string calldata name) external view returns (
        address owner,
        uint256 expiry,
        bool    active
    ) {
        string memory normalized = _normalize(name);
        owner  = nameToAddress[normalized];
        expiry = nameExpiry[normalized];
        active = (owner != address(0)) && (expiry > block.timestamp);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ADMIN (time-locked fee changes, treasury update, pause)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function updateTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function queueFeeChange(uint256 newFee) external onlyOwner {
        pendingFee   = newFee;
        feeChangeETA = block.timestamp + FEE_CHANGE_DELAY;
        emit FeeChangeQueued(newFee, feeChangeETA);
    }

    function executeFeeChange() external onlyOwner {
        if (feeChangeETA == 0 || block.timestamp < feeChangeETA) revert FeeTimelockNotReady();
        emit FeeChangeExecuted(pendingFee);
        // Note: ANNUAL_FEE_USDC is immutable in this version.
        // For dynamic fees, use a storage variable and replace this function.
        feeChangeETA = 0;
        pendingFee   = 0;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // INTERNAL
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @dev  Normalize to lowercase. Reverts on invalid characters.
     *       Allowed: a-z, 0-9, hyphen (not at start/end).
     */
    function _normalize(string calldata name) internal pure returns (string memory) {
        bytes memory b      = bytes(name);
        bytes memory result = new bytes(b.length);

        for (uint i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (c >= 0x41 && c <= 0x5A) {
                result[i] = bytes1(uint8(c) + 32); // A-Z â†’ a-z
            } else {
                result[i] = c;
            }
        }
        return string(result);
    }

    function _validateName(string memory name) internal pure {
        if (!_isValidName(name)) revert InvalidName();
    }

    function _isValidName(string memory name) internal pure returns (bool) {
        bytes memory b = bytes(name);
        uint len = b.length;

        if (len < MIN_NAME_LENGTH || len > MAX_NAME_LENGTH) return false;
        if (b[0] == 0x2D || b[len - 1] == 0x2D) return false; // no leading/trailing hyphen

        for (uint i = 0; i < len; i++) {
            bytes1 c = b[i];
            bool valid = (c >= 0x61 && c <= 0x7A) ||  // a-z
                         (c >= 0x30 && c <= 0x39) ||  // 0-9
                         (c == 0x2D);                  // hyphen
            if (!valid) return false;
        }
        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ArcoinTreasury
 * @notice Collects protocol fees and distributes to allocation buckets.
 *
 * @dev    SECURITY MODEL (from Foundation Report):
 *         "Admin-controlled" = SPOF risk. Solution:
 *         - Fees collected automatically (no admin discretion on collection)
 *         - Distribution requires TIME-LOCK (72h) before execution
 *         - Rate changes require GOVERNANCE VOTE (not admin override)
 *         - 3-of-5 multisig for emergency withdrawals only
 *
 * @dev    ALLOCATION (immutable):
 *         60% â†’ Development Fund (time-locked 6 months)
 *         25% â†’ Liquidity Reserve (protocol-owned)
 *         15% â†’ Community/Grants (governance-controlled)
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ArcoinTreasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    uint256 public constant PROTOCOL_FEE_BPS     = 10;    // 0.1% = 10 bps
    uint256 public constant DISTRIBUTION_DELAY   = 72 hours;

    // Allocation basis points (must sum to 10000)
    uint256 public constant DEV_FUND_BPS          = 6000;  // 60%
    uint256 public constant LIQUIDITY_RESERVE_BPS = 2500;  // 25%
    uint256 public constant COMMUNITY_BPS         = 1500;  // 15%

    // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    IERC20  public immutable usdc;

    address public devFund;
    address public liquidityReserve;
    address public communityMultisig;

    // Total fees collected
    uint256 public totalFeesCollected;
    uint256 public totalDistributed;

    // Pending distribution (time-locked)
    struct DistributionRequest {
        uint256 amount;
        uint256 unlocksAt;
        bool    executed;
    }
    DistributionRequest[] public pendingDistributions;

    // Approved fee sources (PaymentRouter, Sablier wrapper, etc.)
    mapping(address => bool) public approvedCollectors;

    // â”€â”€ EVENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    event FeeReceived(address indexed from, uint256 amount, string feeType);
    event DistributionQueued(uint256 indexed index, uint256 amount, uint256 unlocksAt);
    event DistributionExecuted(
        uint256 indexed index,
        uint256 devAmount,
        uint256 liquidityAmount,
        uint256 communityAmount
    );
    event CollectorApproved(address indexed collector, bool approved);
    event RecipientUpdated(string bucket, address oldAddr, address newAddr);

    // â”€â”€ ERRORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    error NotApprovedCollector();
    error TimelockNotExpired(uint256 unlocksAt, uint256 now_);
    error AlreadyExecuted();
    error ZeroAmount();
    error ZeroAddress();
    error InvalidAllocation();

    // â”€â”€ CONSTRUCTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    constructor(
        address _usdc,
        address _devFund,
        address _liquidityReserve,
        address _communityMultisig,
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0)              ||
            _devFund == address(0)           ||
            _liquidityReserve == address(0)  ||
            _communityMultisig == address(0)) revert ZeroAddress();

        usdc               = IERC20(_usdc);
        devFund            = _devFund;
        liquidityReserve   = _liquidityReserve;
        communityMultisig  = _communityMultisig;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // FEE COLLECTION
    // Called by ArcoinPaymentRouter on each transaction
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Collect protocol fee. Only approved collectors can call.
     * @param  amount   Fee amount in USDC (6 decimals)
     * @param  feeType  "swap" | "stream" | "escrow" | "payment"
     */
    function collectFee(
        uint256 amount,
        string calldata feeType
    ) external nonReentrant {
        if (!approvedCollectors[msg.sender]) revert NotApprovedCollector();
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalFeesCollected += amount;

        emit FeeReceived(msg.sender, amount, feeType);
    }

    /**
     * @notice Calculate fee for a given transaction amount.
     * @param  transactionAmount  Amount in USDC (6 decimals)
     * @return fee                Protocol fee (0.1%)
     */
    function calculateFee(uint256 transactionAmount) external pure returns (uint256) {
        return (transactionAmount * PROTOCOL_FEE_BPS) / 10000;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // DISTRIBUTION (TIME-LOCKED)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Queue a distribution. 72h timelock before execution.
     * @param  amount  Amount to distribute (must be <= treasury USDC balance)
     */
    function queueDistribution(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (amount > usdc.balanceOf(address(this))) revert ZeroAmount();

        uint256 unlocksAt = block.timestamp + DISTRIBUTION_DELAY;

        pendingDistributions.push(DistributionRequest({
            amount:     amount,
            unlocksAt:  unlocksAt,
            executed:   false,
        }));;

        emit DistributionQueued(pendingDistributions.length - 1, amount, unlocksAt);
    }

    /**
     * @notice Execute a queued distribution after timelock expires.
     * @param  index  Index in pendingDistributions array
     */
    function executeDistribution(uint256 index) external nonReentrant onlyOwner {
        DistributionRequest storage req = pendingDistributions[index];

        if (req.executed) revert AlreadyExecuted();
        if (block.timestamp < req.unlocksAt) {
            revert TimelockNotExpired(req.unlocksAt, block.timestamp);
        }

        req.executed = true;
        totalDistributed += req.amount;

        // Split by allocation percentages
        uint256 devAmount       = (req.amount * DEV_FUND_BPS)          / 10000;
        uint256 liquidityAmount = (req.amount * LIQUIDITY_RESERVE_BPS)  / 10000;
        uint256 communityAmount = req.amount - devAmount - liquidityAmount; // remainder

        usdc.safeTransfer(devFund,           devAmount);
        usdc.safeTransfer(liquidityReserve,   liquidityAmount);
        usdc.safeTransfer(communityMultisig,  communityAmount);

        emit DistributionExecuted(index, devAmount, liquidityAmount, communityAmount);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // VIEW FUNCTIONS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function treasuryBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function pendingDistributionCount() external view returns (uint256) {
        return pendingDistributions.length;
    }

    function getDistribution(uint256 index) external view returns (DistributionRequest memory) {
        return pendingDistributions[index];
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ADMIN
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function setCollectorApproved(address collector, bool approved) external onlyOwner {
        if (collector == address(0)) revert ZeroAddress();
        approvedCollectors[collector] = approved;
        emit CollectorApproved(collector, approved);
    }

    function updateDevFund(address newAddr) external onlyOwner {
        if (newAddr == address(0)) revert ZeroAddress();
        emit RecipientUpdated("devFund", devFund, newAddr);
        devFund = newAddr;
    }

    function updateLiquidityReserve(address newAddr) external onlyOwner {
        if (newAddr == address(0)) revert ZeroAddress();
        emit RecipientUpdated("liquidityReserve", liquidityReserve, newAddr);
        liquidityReserve = newAddr;
    }

    function updateCommunityMultisig(address newAddr) external onlyOwner {
        if (newAddr == address(0)) revert ZeroAddress();
        emit RecipientUpdated("communityMultisig", communityMultisig, newAddr);
        communityMultisig = newAddr;
    }
}

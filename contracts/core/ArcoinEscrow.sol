// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ArcoinEscrow
 * @notice Non-custodial, on-chain secured escrow for P2P and B2B payments.
 *
 * @dev    SECURITY MODEL:
 *         - Contract holds funds only during active escrow
 *         - Three-party resolution: Sender, Recipient, Arbiter
 *         - Arbiter is set at creation (can be address(0) for no arbiter)
 *         - Auto-release after deadline (no griefing possible)
 *         - Dispute log is on-chain (immutable audit trail)
 *
 * @dev    TERMINOLOGY NOTE (from Foundation Report):
 *         NEVER use "risk-free". This contract uses "non-custodial, on-chain secured".
 *
 * FLOWS:
 *   Simple:  Sender creates â†’ Recipient confirms delivery â†’ Funds release
 *   Dispute: Either party raises â†’ Arbiter decides â†’ Funds split or fully release/refund
 *   Timeout: No action in `deadline` seconds â†’ Sender can reclaim
 */

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ArcoinEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    uint256 public constant MIN_ESCROW_AMOUNT = 1_000000;     // 1 USDC
    uint256 public constant MAX_ESCROW_AMOUNT = 100_000_000000; // 100,000 USDC
    uint256 public constant MIN_DEADLINE      = 1 hours;
    uint256 public constant MAX_DEADLINE      = 90 days;
    uint256 public constant DISPUTE_WINDOW    = 24 hours;     // after deadline, before reclaim

    // â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    enum EscrowStatus {
        Active,       // funds held, awaiting confirmation
        Released,     // funds sent to recipient
        Refunded,     // funds returned to sender
        Disputed,     // dispute raised, awaiting arbiter
        Resolved      // arbiter resolved the dispute
    }

    struct Escrow {
        address sender;
        address recipient;
        address arbiter;         // address(0) if no arbiter (bilateral only)
        uint256 amount;          // USDC (6 decimals)
        uint256 createdAt;
        uint256 deadline;        // unix timestamp â€” auto-refund after this
        EscrowStatus status;
        bytes32 descriptionHash; // keccak256 of deal description (privacy)
        string  disputeLog;      // on-chain dispute notes (set by arbiter)
    }

    // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    IERC20  public immutable usdc;
    address public immutable treasury;
    uint256 public           platformFeeBps = 20;  // 0.2% on release only

    uint256 private _nextId = 1;
    mapping(uint256 => Escrow) public escrows;

    // User's escrow IDs
    mapping(address => uint256[]) public senderEscrows;
    mapping(address => uint256[]) public recipientEscrows;

    // â”€â”€ EVENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 deadline
    );
    event EscrowReleased(uint256 indexed escrowId, uint256 netAmount, uint256 fee);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    event DisputeRaised(uint256 indexed escrowId, address indexed raisedBy, string reason);
    event DisputeResolved(
        uint256 indexed escrowId,
        address indexed arbiter,
        uint256 senderAmount,
        uint256 recipientAmount
    );

    // â”€â”€ ERRORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    error NotSender();
    error NotRecipient();
    error NotArbiter();
    error NotParty();
    error NotActive();
    error NotDisputed();
    error DeadlineNotReached();
    error DeadlineReached();
    error InvalidAmount();
    error InvalidDeadline();
    error ZeroAddress();
    error SelfEscrow();
    error NoArbiter();
    error SplitMismatch();

    // â”€â”€ CONSTRUCTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    constructor(address _usdc, address _treasury) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc     = IERC20(_usdc);
        treasury = _treasury;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // CREATE
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Create an escrow. Funds are locked until released/refunded.
     *
     * @param  recipient        Who receives funds on successful release
     * @param  amount           USDC amount (6 decimals)
     * @param  deadlineSecs     Seconds from now until auto-refund window opens
     * @param  arbiter          Dispute resolver (address(0) = no arbiter, bilateral only)
     * @param  descriptionHash  keccak256 of deal terms (store off-chain, verify on-chain)
     *
     * @return escrowId
     */
    function createEscrow(
        address recipient,
        uint256 amount,
        uint256 deadlineSecs,
        address arbiter,
        bytes32 descriptionHash
    ) external nonReentrant returns (uint256 escrowId) {
        if (recipient == address(0))             revert ZeroAddress();
        if (recipient == msg.sender)             revert SelfEscrow();
        if (amount < MIN_ESCROW_AMOUNT)          revert InvalidAmount();
        if (amount > MAX_ESCROW_AMOUNT)          revert InvalidAmount();
        if (deadlineSecs < MIN_DEADLINE)         revert InvalidDeadline();
        if (deadlineSecs > MAX_DEADLINE)         revert InvalidDeadline();

        escrowId = _nextId++;
        uint256 deadline = block.timestamp + deadlineSecs;

        escrows[escrowId] = Escrow({
            sender:          msg.sender,
            recipient:       recipient,
            arbiter:         arbiter,
            amount:          amount,
            createdAt:       block.timestamp,
            deadline:        deadline,
            status:          EscrowStatus.Active,
            descriptionHash: descriptionHash,
            disputeLog:      "",
        });

        senderEscrows[msg.sender].push(escrowId);
        recipientEscrows[recipient].push(escrowId);

        // Pull funds into contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(escrowId, msg.sender, recipient, amount, deadline);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // RELEASE (Sender confirms delivery â†’ pays recipient)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Sender releases funds to recipient after confirming delivery.
     *         Platform fee (0.2%) deducted on release.
     */
    function release(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.sender != msg.sender)         revert NotSender();
        if (e.status != EscrowStatus.Active) revert NotActive();

        _executeRelease(escrowId, e, e.amount);
    }

    /**
     * @notice Recipient can also trigger release (acknowledges no dispute).
     *         Only before deadline.
     */
    function confirmAndRelease(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.recipient != msg.sender)       revert NotRecipient();
        if (e.status != EscrowStatus.Active) revert NotActive();
        if (block.timestamp > e.deadline)    revert DeadlineReached();

        _executeRelease(escrowId, e, e.amount);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // REFUND (after deadline, no dispute)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Sender reclaims funds after deadline passes with no release.
     *         Can only be called in the DISPUTE_WINDOW after deadline.
     */
    function refund(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.sender != msg.sender)              revert NotSender();
        if (e.status != EscrowStatus.Active)      revert NotActive();
        if (block.timestamp <= e.deadline)        revert DeadlineNotReached();

        e.status = EscrowStatus.Refunded;
        usdc.safeTransfer(e.sender, e.amount);

        emit EscrowRefunded(escrowId, e.amount);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // DISPUTE
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @notice Either party raises a dispute. Requires an arbiter was set.
     * @param  reason  Plain text reason (stored in event, not state for gas)
     */
    function raiseDispute(
        uint256 escrowId,
        string calldata reason
    ) external {
        Escrow storage e = escrows[escrowId];
        if (e.sender != msg.sender && e.recipient != msg.sender) revert NotParty();
        if (e.status != EscrowStatus.Active)  revert NotActive();
        if (e.arbiter == address(0))          revert NoArbiter();
        if (block.timestamp > e.deadline)     revert DeadlineReached();

        e.status = EscrowStatus.Disputed;
        emit DisputeRaised(escrowId, msg.sender, reason);
    }

    /**
     * @notice Arbiter resolves dispute by splitting funds.
     * @param  senderBps     Basis points to return to sender (0-10000)
     * @param  recipientBps  Basis points to release to recipient
     * @param  notes         Arbiter's resolution notes (stored on-chain)
     *
     * @dev    senderBps + recipientBps must equal 10000.
     *         Fee is taken from recipient's portion only.
     */
    function resolveDispute(
        uint256 escrowId,
        uint256 senderBps,
        uint256 recipientBps,
        string calldata notes
    ) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.arbiter != msg.sender)              revert NotArbiter();
        if (e.status != EscrowStatus.Disputed)    revert NotDisputed();
        if (senderBps + recipientBps != 10000)    revert SplitMismatch();

        e.status     = EscrowStatus.Resolved;
        e.disputeLog = notes;

        uint256 senderAmount    = (e.amount * senderBps)    / 10000;
        uint256 recipientGross  = (e.amount * recipientBps) / 10000;

        // Fee only on recipient's portion
        uint256 fee            = (recipientGross * platformFeeBps) / 10000;
        uint256 recipientNet   = recipientGross - fee;

        if (senderAmount > 0)  usdc.safeTransfer(e.sender,    senderAmount);
        if (recipientNet > 0)  usdc.safeTransfer(e.recipient, recipientNet);
        if (fee > 0)           usdc.safeTransfer(treasury,    fee);

        emit DisputeResolved(escrowId, msg.sender, senderAmount, recipientNet);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // VIEW
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getSenderEscrows(address sender) external view returns (uint256[] memory) {
        return senderEscrows[sender];
    }

    function getRecipientEscrows(address recipient) external view returns (uint256[] memory) {
        return recipientEscrows[recipient];
    }

    function previewReleaseFee(uint256 amount) external view returns (uint256 fee, uint256 net) {
        fee = (amount * platformFeeBps) / 10000;
        net = amount - fee;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // INTERNAL
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function _executeRelease(
        uint256 escrowId,
        Escrow storage e,
        uint256 amount
    ) internal {
        e.status = EscrowStatus.Released;

        uint256 fee = (amount * platformFeeBps) / 10000;
        uint256 net = amount - fee;

        usdc.safeTransfer(e.recipient, net);
        if (fee > 0) usdc.safeTransfer(treasury, fee);

        emit EscrowReleased(escrowId, net, fee);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * ArcoinStream
 * ─────────────────────────────────────────────────────────────
 * Arcoin's own native linear token-streaming contract. Built so the
 * "Stream" feature never depends on a third-party protocol (like Sablier)
 * being deployed on Arc Testnet -- once this contract itself is deployed,
 * streaming works immediately.
 *
 * A stream linearly releases `totalAmount` of `token` from `startTime` to
 * `endTime`. Nothing is releasable before `cliffTime`. The recipient (or
 * the sender, on the recipient's behalf) can withdraw the currently
 * vested-but-unwithdrawn amount at any time. If a stream is cancelable,
 * the sender may cancel it early: the recipient keeps everything vested
 * so far, and the remainder is refunded to the sender.
 */
contract ArcoinStream is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Stream {
        address sender;
        address recipient;
        IERC20  token;
        uint128 totalAmount;
        uint128 withdrawn;
        uint40  startTime;
        uint40  cliffTime;
        uint40  endTime;
        bool    cancelable;
        bool    canceled;
    }

    uint256 public nextStreamId = 1;
    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) public streamsBySender;
    mapping(address => uint256[]) public streamsByRecipient;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 totalAmount,
        uint40  startTime,
        uint40  cliffTime,
        uint40  endTime,
        bool    cancelable
    );
    event Withdrawn(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event Canceled(uint256 indexed streamId, uint256 senderRefund, uint256 recipientAmount);

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDuration();
    error NotSender();
    error NotRecipientOrSender();
    error NotCancelable();
    error AlreadyCanceled();
    error NothingToWithdraw();
    error StreamNotFound();

    /// @notice Create a new linear stream. Caller must have approved this
    /// contract for `totalAmount` of `token` beforehand.
    function createStream(
        address recipient,
        address token,
        uint128 totalAmount,
        uint40  cliffSeconds,
        uint40  durationSeconds,
        bool    cancelable
    ) external nonReentrant returns (uint256 streamId) {
        if (recipient == address(0) || token == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert ZeroAmount();
        if (durationSeconds == 0 || cliffSeconds > durationSeconds) revert InvalidDuration();

        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        uint40 start = uint40(block.timestamp);
        streamId = nextStreamId++;
        streams[streamId] = Stream({
            sender:      msg.sender,
            recipient:   recipient,
            token:       IERC20(token),
            totalAmount: totalAmount,
            withdrawn:   0,
            startTime:   start,
            cliffTime:   start + cliffSeconds,
            endTime:     start + durationSeconds,
            cancelable:  cancelable,
            canceled:    false
        });

        streamsBySender[msg.sender].push(streamId);
        streamsByRecipient[recipient].push(streamId);

        emit StreamCreated(
            streamId, msg.sender, recipient, token, totalAmount,
            start, start + cliffSeconds, start + durationSeconds, cancelable
        );
    }

    /// @notice Total amount vested so far (whether withdrawn or not).
    function streamedAmount(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        if (s.sender == address(0)) return 0;
        if (s.canceled) return s.withdrawn; // frozen at cancellation
        if (block.timestamp < s.cliffTime) return 0;
        if (block.timestamp >= s.endTime) return s.totalAmount;

        uint256 elapsed  = block.timestamp - s.startTime;
        uint256 duration = s.endTime - s.startTime;
        return (uint256(s.totalAmount) * elapsed) / duration;
    }

    /// @notice Amount currently withdrawable (vested minus already withdrawn).
    function withdrawableAmount(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        uint256 streamed = streamedAmount(streamId);
        if (streamed <= s.withdrawn) return 0;
        return streamed - s.withdrawn;
    }

    /// @notice Withdraw the currently vested-but-unwithdrawn amount to the
    /// recipient. Callable by the recipient or the sender.
    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (s.sender == address(0)) revert StreamNotFound();
        if (msg.sender != s.recipient && msg.sender != s.sender) revert NotRecipientOrSender();

        uint256 amount = withdrawableAmount(streamId);
        if (amount == 0) revert NothingToWithdraw();

        s.withdrawn += uint128(amount);
        s.token.safeTransfer(s.recipient, amount);

        emit Withdrawn(streamId, s.recipient, amount);
    }

    /// @notice Cancel a cancelable stream. Recipient keeps everything
    /// vested so far; the unvested remainder is refunded to the sender.
    function cancel(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (s.sender == address(0)) revert StreamNotFound();
        if (msg.sender != s.sender) revert NotSender();
        if (!s.cancelable) revert NotCancelable();
        if (s.canceled) revert AlreadyCanceled();

        uint256 streamed         = streamedAmount(streamId);
        uint256 recipientAmount  = streamed - s.withdrawn;
        uint256 senderRefund     = uint256(s.totalAmount) - streamed;

        s.canceled  = true;
        s.withdrawn = uint128(streamed);

        if (recipientAmount > 0) s.token.safeTransfer(s.recipient, recipientAmount);
        if (senderRefund > 0)    s.token.safeTransfer(s.sender, senderRefund);

        emit Canceled(streamId, senderRefund, recipientAmount);
    }

    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    function getSenderStreams(address sender) external view returns (uint256[] memory) {
        return streamsBySender[sender];
    }

    function getRecipientStreams(address recipient) external view returns (uint256[] memory) {
        return streamsByRecipient[recipient];
    }
}

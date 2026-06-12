// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Minimal interface for a burnable ERC20 supporting allowance-based burns.
 */
interface IERC20Burnable is IERC20 {
    function burnFrom(address from, uint256 amount) external;
}

/**
 * @title ProvingGrounds
 * @notice Onchain registry for LeftClaw-verified builds on Base. Provides four mechanics:
 *         a permissioned build registry, soulbound stamps (gated by a CLAWD burn), reviews
 *         with optional ETH tips, and anti-gaming bounty pools distributed equally to all
 *         stamp-holders of a build.
 * @dev Security: Ownable2Step for ownership, ReentrancyGuard on every external state-changing
 *      function, SafeERC20 for token calls, and Checks-Effects-Interactions throughout.
 */
contract ProvingGrounds is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Build {
        string name;
        string url;
        string description;
        bool registered;
    }

    struct Review {
        address reviewer;
        string text;
        uint256 tipAmount;
        uint256 timestamp;
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    /// @notice CLAWD token burned to claim a stamp.
    IERC20Burnable public immutable clawd;

    /// @notice Amount of CLAWD burned per stamp claim. Configurable by owner.
    uint256 public stampBurnAmount;

    // Registry
    mapping(address buildContract => Build) private _builds;
    address[] private _allBuilds;

    // Stamps (soulbound)
    mapping(address user => mapping(address buildContract => bool)) private _hasStamp;
    mapping(address buildContract => address[] stampers) private _stampers;
    mapping(address user => address[] stampedBuilds) private _userStamps;

    // Reviews
    mapping(address buildContract => Review[]) private _reviews;
    mapping(address buildContract => uint256 totalTips) private _buildTotalTips;

    // Bounties
    mapping(address buildContract => uint256 pool) private _bountyPool;

    /// @notice ETH held by the contract attributable to tips, redeemable via withdrawTips().
    uint256 public totalTipsBalance;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event BuildRegistered(address indexed buildContract, string name);
    event BuildUnregistered(address indexed buildContract);
    event StampBurnAmountUpdated(uint256 newAmount);
    event StampClaimed(address indexed user, address indexed buildContract, uint256 burnedAmount);
    event ReviewSubmitted(address indexed buildContract, address indexed reviewer, uint256 tip);
    event TipsWithdrawn(address indexed to, uint256 amount);
    event BountyFunded(address indexed buildContract, address indexed funder, uint256 amount);
    event BountyDistributed(address indexed buildContract, uint256 perStamp, uint256 totalStamps);
    event BountyCancelled(address indexed buildContract, address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroAddress();
    error BuildNotRegistered(address buildContract);
    error BuildAlreadyRegistered(address buildContract);
    error AlreadyStamped(address user, address buildContract);
    error NotStampHolder(address user, address buildContract);
    error NoStampHolders(address buildContract);
    error NoBountyPool(address buildContract);
    error NothingToWithdraw();
    error EthTransferFailed();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /**
     * @param clawdToken Address of the CLAWD burnable ERC20 token.
     * @param initialStampBurnAmount Amount of CLAWD burned per stamp claim.
     */
    constructor(address clawdToken, uint256 initialStampBurnAmount) Ownable(msg.sender) {
        if (clawdToken == address(0)) revert ZeroAddress();
        clawd = IERC20Burnable(clawdToken);
        stampBurnAmount = initialStampBurnAmount;
    }

    // ---------------------------------------------------------------------
    // 1. Registry (permissioned)
    // ---------------------------------------------------------------------

    function registerBuild(
        address buildContract,
        string calldata name,
        string calldata url,
        string calldata description
    ) external onlyOwner nonReentrant {
        if (buildContract == address(0)) revert ZeroAddress();
        if (_builds[buildContract].registered) revert BuildAlreadyRegistered(buildContract);

        _builds[buildContract] = Build({ name: name, url: url, description: description, registered: true });
        _allBuilds.push(buildContract);

        emit BuildRegistered(buildContract, name);
    }

    function unregisterBuild(address buildContract) external onlyOwner nonReentrant {
        if (!_builds[buildContract].registered) revert BuildNotRegistered(buildContract);

        _builds[buildContract].registered = false;

        // Remove from the enumerable list (swap-and-pop).
        uint256 len = _allBuilds.length;
        for (uint256 i = 0; i < len; i++) {
            if (_allBuilds[i] == buildContract) {
                _allBuilds[i] = _allBuilds[len - 1];
                _allBuilds.pop();
                break;
            }
        }

        emit BuildUnregistered(buildContract);
    }

    function getBuild(address buildContract) external view returns (Build memory) {
        return _builds[buildContract];
    }

    function getAllBuilds() external view returns (address[] memory) {
        return _allBuilds;
    }

    function isRegistered(address buildContract) public view returns (bool) {
        return _builds[buildContract].registered;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setStampBurnAmount(uint256 newAmount) external onlyOwner {
        stampBurnAmount = newAmount;
        emit StampBurnAmountUpdated(newAmount);
    }

    // ---------------------------------------------------------------------
    // 2. Stamp (soulbound, gated by CLAWD burn)
    // ---------------------------------------------------------------------

    /**
     * @notice Claim a soulbound stamp for a registered build by burning CLAWD.
     * @dev Caller must `approve(provingGrounds, stampBurnAmount)` on CLAWD first.
     */
    function claimStamp(address buildContract) external nonReentrant {
        // Checks
        if (!_builds[buildContract].registered) revert BuildNotRegistered(buildContract);
        if (_hasStamp[msg.sender][buildContract]) revert AlreadyStamped(msg.sender, buildContract);

        uint256 burnAmount = stampBurnAmount;

        // Effects
        _hasStamp[msg.sender][buildContract] = true;
        _stampers[buildContract].push(msg.sender);
        _userStamps[msg.sender].push(buildContract);

        // Interactions
        if (burnAmount > 0) {
            clawd.burnFrom(msg.sender, burnAmount);
        }

        emit StampClaimed(msg.sender, buildContract, burnAmount);
    }

    function hasStamp(address user, address buildContract) external view returns (bool) {
        return _hasStamp[user][buildContract];
    }

    function getStampCount(address buildContract) public view returns (uint256) {
        return _stampers[buildContract].length;
    }

    function getStampers(address buildContract) external view returns (address[] memory) {
        return _stampers[buildContract];
    }

    function getUserStamps(address user) external view returns (address[] memory) {
        return _userStamps[user];
    }

    // ---------------------------------------------------------------------
    // 3. Review (stamp-holders only)
    // ---------------------------------------------------------------------

    /**
     * @notice Submit a review for a build. Only stamp-holders may review. ETH tip optional.
     */
    function submitReview(address buildContract, string calldata text) external payable nonReentrant {
        // Checks
        if (!_builds[buildContract].registered) revert BuildNotRegistered(buildContract);
        if (!_hasStamp[msg.sender][buildContract]) revert NotStampHolder(msg.sender, buildContract);

        // Effects
        _reviews[buildContract].push(
            Review({ reviewer: msg.sender, text: text, tipAmount: msg.value, timestamp: block.timestamp })
        );

        if (msg.value > 0) {
            _buildTotalTips[buildContract] += msg.value;
            totalTipsBalance += msg.value;
        }

        emit ReviewSubmitted(buildContract, msg.sender, msg.value);
    }

    function getReviews(address buildContract) external view returns (Review[] memory) {
        return _reviews[buildContract];
    }

    function getReviewCount(address buildContract) external view returns (uint256) {
        return _reviews[buildContract].length;
    }

    function getBuildTotalTips(address buildContract) external view returns (uint256) {
        return _buildTotalTips[buildContract];
    }

    /**
     * @notice Owner withdraws all accumulated ETH tips. Bounty pools are tracked separately
     *         and are not touched here.
     */
    function withdrawTips() external onlyOwner nonReentrant {
        uint256 amount = totalTipsBalance;
        if (amount == 0) revert NothingToWithdraw();

        // Effects
        totalTipsBalance = 0;

        // Interactions
        _sendEth(owner(), amount);

        emit TipsWithdrawn(owner(), amount);
    }

    // ---------------------------------------------------------------------
    // 4. Bounty (equal distribution to all stamp-holders)
    // ---------------------------------------------------------------------

    function fundBounty(address buildContract) external payable nonReentrant {
        // Checks
        if (!_builds[buildContract].registered) revert BuildNotRegistered(buildContract);
        if (msg.value == 0) revert NoBountyPool(buildContract);

        // Effects
        _bountyPool[buildContract] += msg.value;

        emit BountyFunded(buildContract, msg.sender, msg.value);
    }

    /**
     * @notice Distribute a build's entire bounty pool equally across all current stamp-holders.
     * @dev Anti-gaming: every stamp-holder receives an equal share rather than rewarding the
     *      first N claimants. Any wei remainder from integer division stays in the pool.
     */
    function distributeBounty(address buildContract) external onlyOwner nonReentrant {
        // Checks
        uint256 pool = _bountyPool[buildContract];
        if (pool == 0) revert NoBountyPool(buildContract);

        address[] storage stampers = _stampers[buildContract];
        uint256 count = stampers.length;
        if (count == 0) revert NoStampHolders(buildContract);

        uint256 perStamp = pool / count;
        if (perStamp == 0) revert NoBountyPool(buildContract);

        uint256 distributed = perStamp * count;

        // Effects: remaining dust (pool - distributed) stays in the pool for a later round.
        _bountyPool[buildContract] = pool - distributed;

        // Interactions
        for (uint256 i = 0; i < count; i++) {
            _sendEth(stampers[i], perStamp);
        }

        emit BountyDistributed(buildContract, perStamp, count);
    }

    /**
     * @notice Owner cancels a build's bounty pool and withdraws the funds.
     */
    function cancelBounty(address buildContract) external onlyOwner nonReentrant {
        // Checks
        uint256 pool = _bountyPool[buildContract];
        if (pool == 0) revert NoBountyPool(buildContract);

        // Effects
        _bountyPool[buildContract] = 0;

        // Interactions
        _sendEth(owner(), pool);

        emit BountyCancelled(buildContract, owner(), pool);
    }

    function getBountyPool(address buildContract) external view returns (uint256) {
        return _bountyPool[buildContract];
    }

    /**
     * @notice Returns the per-stamp ETH share if the pool were distributed right now.
     * @dev Returns 0 when there are no stamp-holders.
     */
    function getBountyPerStamp(address buildContract) external view returns (uint256) {
        uint256 count = _stampers[buildContract].length;
        if (count == 0) return 0;
        return _bountyPool[buildContract] / count;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _sendEth(address to, uint256 amount) private {
        (bool success,) = payable(to).call{ value: amount }("");
        if (!success) revert EthTransferFailed();
    }
}

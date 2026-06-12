// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import { ProvingGrounds } from "../contracts/ProvingGrounds.sol";

/**
 * @notice Deploy script for ProvingGrounds.
 * @dev Deploys with the deployer as initial owner (Ownable2Step), then initiates a transfer
 *      of ownership to the client. The client must call acceptOwnership() to complete it.
 *
 * Example:
 * yarn deploy --file DeployProvingGrounds.s.sol
 * yarn deploy --file DeployProvingGrounds.s.sol --network base
 */
contract DeployProvingGrounds is ScaffoldETHDeploy {
    // CLAWD burnable token on Base.
    address constant CLAWD = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

    // Client who will own the registry after deployment.
    address constant CLIENT = 0x1d266aae9E1f8cb9228821C40fB5DbC7C771cbce;

    // 1 CLAWD (18 decimals) burned per stamp claim.
    uint256 constant STAMP_BURN_AMOUNT = 1e18;

    function run() external ScaffoldEthDeployerRunner {
        ProvingGrounds provingGrounds = new ProvingGrounds(CLAWD, STAMP_BURN_AMOUNT);

        // Hand ownership to the client (Ownable2Step: client must accept).
        provingGrounds.transferOwnership(CLIENT);
    }
}

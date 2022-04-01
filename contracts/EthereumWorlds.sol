//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract EthereumWorlds is ERC20 {
    uint256 public constant MAX_SUPPLY = 1000000000 ether;

    constructor(address distributor) ERC20("Ethereum Worlds", "TWR") {
        _mint(distributor, MAX_SUPPLY);
    }
}

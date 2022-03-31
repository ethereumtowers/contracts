//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract EthereumWorlds is
    ERC20,
    ERC20Capped,
    Ownable
{
    constructor(address distributor)
        ERC20("Ethereum Worlds", "TWR")
        ERC20Capped(1000000000 ether)
    {
        _mint(distributor, cap());
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Capped)
    {
        super._mint(to, amount);
    }
}

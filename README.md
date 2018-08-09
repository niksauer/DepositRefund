# DepositRefund
<a href="http://solidity.readthedocs.io/en/v0.4.24/">
    <img src="http://img.shields.io/badge/solidity-0.4.24-brightgreen.svg" alt="Solidity 0.4.24">
</a>
<a href="https://coveralls.io/github/niksauer/DepositRefund?branch=coverage">
    <img src="https://coveralls.io/repos/github/niksauer/DepositRefund/badge.svg?branch=coverage" alt='Coverage Status'/>
</a>

Ethereum-powered incentivized deposit-refund system for bottled beverages in Germany.

### Setup 
1. `git clone <url>`
2. `npm install`

### Dependencies
- [Truffle](https://truffleframework.com/)
- [OpenZeppelin Solidity](https://github.com/OpenZeppelin/openzeppelin-solidity)

### Testing
1. `ganache-cli -p 7545 -e 200` (`-e` flag is only required for `DPGPenalty.test.js`)
2. `truffle test`

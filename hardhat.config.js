require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-ganache')
require('hardhat-tracer')
require('@nomiclabs/hardhat-waffle')
require("@nomiclabs/hardhat-etherscan");
require('solidity-coverage');

const deployerPrivateKey = process.env.DEPLOYER
const alicePrivateKey = process.env.TEST_USER_1
const bobPrivateKey = process.env.TEST_USER_2

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    ropsten: {
      url: 'https://eth-ropsten.alchemyapi.io/v2/NBpktksmgExwiNqsVSmdd6DQMs12MIKb',
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
    rinkeby: {
      url: 'https://eth-rinkeby.alchemyapi.io/v2/Calfh4vN8SEuP2Es5wK8OyZmqdAKZ2zU',
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/2952bf02ce35410693f107b451ab55e1',
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/9e349ff53f74485b8ee1ab71583f6c8e',
      chainId: 1,
      gasPrice: 35000000000, // 35 gwei
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
  },
  etherscan: {
    apiKey: process.env.SCAN_API_KEY
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 20000,
  },
}

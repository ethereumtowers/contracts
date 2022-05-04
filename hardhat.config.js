require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-ganache')
require('hardhat-tracer')
require('@nomiclabs/hardhat-waffle')
require("@nomiclabs/hardhat-etherscan");
require('solidity-coverage');

const privateKey = process.env.DEPLOYER
const privateKey1 = process.env.TEST_USER
const privateKey2 = process.env.TEST_USER_2
const privateKey3 = process.env.TEST_USER_3
const privateKey4 = process.env.TEST_USER_4
const privateKey5 = process.env.TEST_USER_5
const privateKey6 = process.env.TEST_USER_6
const privateKey7 = process.env.TEST_USER_7
const privateKey8 = process.env.TEST_USER_8
const privateKey9 = process.env.TEST_USER_9
const privateKey10 = process.env.TEST_USER_10

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    ropsten: {
      url: 'https://eth-ropsten.alchemyapi.io/v2/NBpktksmgExwiNqsVSmdd6DQMs12MIKb',
      accounts: [
        privateKey,
        privateKey1,
        privateKey2,
        privateKey3,
        privateKey4,
        privateKey5,
        privateKey6,
        privateKey7,
        privateKey8,
        privateKey9,
        privateKey10,
      ],
    },
    rinkeby: {
      url: 'https://eth-rinkeby.alchemyapi.io/v2/Calfh4vN8SEuP2Es5wK8OyZmqdAKZ2zU',
      gasPrice: 100000000000,
      accounts: [
        privateKey,
        privateKey1,
        privateKey2,
        privateKey3,
        privateKey4,
        privateKey5,
        privateKey6,
        privateKey7,
        privateKey8,
        privateKey9,
        privateKey10,
      ],
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/2952bf02ce35410693f107b451ab55e1',
      accounts: [privateKey],
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/9e349ff53f74485b8ee1ab71583f6c8e',
      chainId: 1,
      gasPrice: 150000000000, //Change to 8000000000
      accounts: [
        privateKey,
        privateKey1,
        privateKey2,
        privateKey3,
        privateKey4,
        privateKey5,
        privateKey6,
        privateKey7,
        privateKey8,
        privateKey9,
        privateKey10,
      ],
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

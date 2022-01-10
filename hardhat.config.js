require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
require("@nomiclabs/hardhat-ganache")
require("hardhat-tracer")
require("@nomiclabs/hardhat-waffle")

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
  defaultNetwork: 'rinkeby',
  networks: {
    hardhat: {},
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/9e349ff53f74485b8ee1ab71583f6c8e',
      gas: 2100000,
      gasPrice: 8000000000,
      accounts: [privateKey, privateKey1, privateKey2, privateKey3, privateKey4, privateKey5, privateKey6, privateKey7, privateKey8, privateKey9, privateKey10],
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/9e349ff53f74485b8ee1ab71583f6c8e',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [privateKey],
    },
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
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

require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-ganache')
require('hardhat-tracer')
require('@nomiclabs/hardhat-waffle')
require("@nomiclabs/hardhat-etherscan");
require('solidity-coverage');

const infuraProjectId = process.env.INFURA_PROJECT_ID;
const deployerPrivateKey = process.env.DEPLOYER;
const alicePrivateKey = process.env.TEST_USER_1;
const bobPrivateKey = process.env.TEST_USER_2;

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    ropsten: {
      url: `https://ropsten.infura.io/v3/${infuraProjectId}`,
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraProjectId}`,
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraProjectId}`,
      accounts: [deployerPrivateKey, alicePrivateKey, bobPrivateKey],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infuraProjectId}`,
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

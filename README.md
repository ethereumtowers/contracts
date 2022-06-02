# Ethereum Towers

**Requirements:**

```other
NodeJS: 16+
MongoDB: 4 +
IPFS: Latest IPFS node
```

**Getting Started:**

```other
cd ethereum-towers
npm install
docker-compose up -d

docker-compose down #If you went off MongoDB

Use one of aveliable commands:
```

Deployed contract on Rinkeby Ethereum network

```other
0x87C338D835e8624345B460FB8bAFB22911e590dF
```

**Aveliable commands:**

Run EthereumTowers test:

```other
npm run test --network hardhat
```

Deploy EthereumTowers smart contract to Rinkeby Testnet:

```other
npm run deploy-testnet
```

Deploy EthereumTowers smart contract to Ethereum mainnet:

```other
npm run deploy-mainnet
```

Deploy EthereumTowers smart contract to Rinkeby Testnet with test tokens:

```other
npm run deploy-testnet-airdrop
```

Generate JSON from parsed tokens & upload it to ipfs demo ENV:

```other
npm run generate:json
```

Get flattened EthereumTowers smart contract:

```other
npm run flatten:Tower
```

Default HardHat commands:

```other
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
```


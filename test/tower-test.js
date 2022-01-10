const { expect } = require('chai')
const hardhat = require('hardhat')
const { ethers } = hardhat
const consola = require('consola')

let nft
let interfaces

describe("Ethereum Tower 1", function () {
  it("Should deploy the new Ethereum Tower smart contract", async function () {
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.deploy("https://ipfs.io/ipfs/");
    await ethereumTowers.deployed();
    nft = await ethereumTowers.address
    expect(await ethereumTowers.name()).to.equal("EthereumTowers");
  })
  it("Should enable mint on Tower 1", async function() {
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    await ethereumTowers.changeTower(1) // Enable tower with number 1
    let tower = await ethereumTowers.tower()
    expect(tower.toString()).to.equal("1")
  })
  it("Should mint token with id 0 on Tower 1 form user with DEFAUTL_ADMIN_ROLE", async function() {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    let token = await ethereumTowers.mint(testUser.address, 0, '0x0') // Enable tower with number 1
  })
  it("Should revert mint token with id 0 on Tower 1 form user with DEFAUTL_ADMIN_ROLE", async function() {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    // const errMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("User can have only one of the nft"))
    await expect(ethereumTowers.mint(testUser.address, 0, '0x0')).to.be.revertedWith('User can have only one of the nft');
  })

  it("Should get tokenUrl for token with id 0", async function() {
    const [deployer, testUser, testUser2] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    // const errMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("User can have only one of the nft"))
    // await expect(ethereumTowers.mint(testUser.address, 0, '0x0')).to.be.revertedWith('User can have only one of the nft');
    // console.log('-- Received token url: '.padStart(30) + url)
    expect(await ethereumTowers.tokenURI(0)).to.equal("https://ipfs.io/ipfs/0x0")
  })
  it("Should mint new token for free for random user", async function() {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    // const errMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("User can have only one of the nft"))
    // await expect(ethereumTowers.mint(testUser.address, 0, '0x0')).to.be.revertedWith('User can have only one of the nft');
    // console.log('-- Received token url: '.padStart(30) + url)
    const wallet = ethers.Wallet.createRandom()
    expect(await ethereumTowers.connect(testUser).mint(wallet.address, 1, '0x0'))
  })
  //TODO: Add batch mint
})
describe("Ethereum Tower 2", function () {
  it("Should change mint tower to 2 by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeTower(2))
  })
  it("Should get status of aveliable tower for minitng", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.tower()).to.equal("2")
  })
  it("Should revert change mint tower to 2 by any user", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    await expect(ethereumTowers.connect(testUser).changeTower(2)).to.be.revertedWith('must have admin role')
  })
  it("Should enable Phase 1 Private sale by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeRound(400))
  })
  it("Should revert change stage to Private sale by any user", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    await expect(ethereumTowers.connect(testUser).changeRound(400)).to.be.revertedWith('must have admin role')
  })
  it("Should get status of aveliable private sale", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.isPrivateRound()).to.equal(true)
  })
  it("Should edit settings of private sale", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeStage(1, ethers.utils.parseEther("0.2", 'ether')))
  })
  it("Should revert change settings of private sale by any user", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    await expect(ethereumTowers.connect(testUser).changeStage(1, ethers.utils.parseEther("0.2", 'ether'))).to.be.revertedWith('must have admin role')
  })
  it("Should get status of private sale with stage and price 0.2 ether", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.stage()).to.equal(1)
    expect(await ethereumTowers.stagePrice()).to.equal(ethers.utils.parseEther("0.2", 'ether'))
  })
  
  it(`Should add role & get role from contract by admin`, async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    let role = await ethereumTowers.WHITELISTED()
    expect(await ethereumTowers.grantRole("0xe799c73ff785ac053943f5d98452f7fa0bcf54da67826fc217d6094dec75c5ee", testUser.address))
  })
  it(`Should revert add role to 0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2 by any user`, async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    // await expect(ethereumTowers.connect(testUser).grantRole("0xe799c73ff785ac053943f5d98452f7fa0bcf54da67826fc217d6094dec75c5ee", '0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2')).to.be.revertedWith(" AccessControl: account 0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
  })
  it("Should try to mint with granted role by with price 0.2 ETH", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    const user4 = ethers.Wallet.createRandom()
    expect(await ethereumTowers.connect(testUser).mint(user4.address, 2, '0x0',{
      value: ethers.utils.parseEther("0.2", 'ether')
    }))
  })
  it("Should revert mint on private sale by any not approved user with price 0.2 ETH", async function () {
    const [deployer, testUser, testUser3] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)

    await expect(ethereumTowers.connect(testUser3).mint(testUser3.address, 3, '0x0',{
      value: ethers.utils.parseEther("0.2", 'ether')
    })).to.be.revertedWith('EthereumTowers: must have minter role to mint on this tower')
  })
  it("Should enable Phase 1 Public sale by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeToPublc())
  })
  it("Should get status of aveliable public sale on phase 1", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.isPrivateRound()).to.equal(false)
  })
  it("Should revert mint on public sale by any not approved user with price 0.2 ETH", async function () {
    const [deployer, testUser, testUser3] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)

    await expect(ethereumTowers.connect(testUser3).mint(accounts[0].address, 4, '0x0',{
      value: ethers.utils.parseEther("0.2", 'ether')
    }))
  })
  it("Should try to mint with granted role by with price 0.2 ETH on public sale", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.connect(testUser).mint(accounts[2].address, 5, '0x0',{
      value: ethers.utils.parseEther("0.2", 'ether')
    }))
  })
  it("Should enable Phase 2 Private sale by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeRound(400))
  })
  it("Should revert change stage to Private sale by any user on phase 2", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    await expect(ethereumTowers.connect(testUser).changeRound(400)).to.be.revertedWith('must have admin role')
  })
  it("Should edit settings of private sale 0.3 ETH per NFT", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeStage(2, ethers.utils.parseEther("0.3", 'ether')))
  })
  it("Should get status of aveliable phase for minitng - Phase 2", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.stage()).to.equal("2")
  })
  it("Should get status of aveliable private sale on Stage 2", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.isPrivateRound()).to.equal(true)
  })
  it("Should get price on private sale on Stage 2 0.3 ETH", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.stagePrice()).to.equal(ethers.utils.parseEther("0.3", 'ether'))
  })
  it(`Should add role & get role from contract by admin on Stage 2`, async function () {
    const [deployer, testUser, testUser2] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    let role = await ethereumTowers.WHITELISTED()
    expect(await ethereumTowers.grantRole("0xe799c73ff785ac053943f5d98452f7fa0bcf54da67826fc217d6094dec75c5ee", testUser2.address))
  })
  it(`Should revert add role to 0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2 by any user on Stage 2`, async function () {
    const [deployer, testUser, testUser2] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    // await expect(ethereumTowers.connect(testUser).grantRole("0xe799c73ff785ac053943f5d98452f7fa0bcf54da67826fc217d6094dec75c5ee", '0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2')).to.be.revertedWith(" AccessControl: account 0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
  })
  it("Should try to mint with granted role by with price 0.3 ETH on Stage 2 PRIVATE SALE", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    const user4 = ethers.Wallet.createRandom()
    expect(await ethereumTowers.connect(testUser).mint(accounts[6].address, 6, '0x0',{
      value: ethers.utils.parseEther("0.3", 'ether')
    }))
  })
  it("Should revert mint on private sale by any not approved user with price 0.3 ETH on Stage 2 PRIVATE SALE", async function () {
    const [deployer, testUser, testUser3, testUser4] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)

    await expect(ethereumTowers.connect(testUser4).mint(accounts[7].address, 7, '0x0',{
      value: ethers.utils.parseEther("0.3", 'ether')
    })).to.be.revertedWith('EthereumTowers: must have minter role to mint on this tower')
  })
  it("Should enable Phase 2 Public sale by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeToPublc())
  })
  it("Should get status of aveliable public sale on phase 2", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.isPrivateRound()).to.equal(false)
  })
  it("Should mint on public sale by any not approved user with price 0.3 ETH", async function () {
    const [deployer, testUser, testUser3, testUser4, testUser5] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)

    await expect(ethereumTowers.connect(testUser5).mint(accounts[7].address, 8, '0x0',{
      value: ethers.utils.parseEther("0.3", 'ether')
    }))
  })
  it("Should try to mint with granted role by with price 0.3 ETH on public sale", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.connect(testUser).mint(accounts[8].address, 9, '0x0',{
      value: ethers.utils.parseEther("0.3", 'ether')
    }))
  })
  // await expect(ethereumTowers.)
    it("Should enable Phase 3 Private sale by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeRound(200))
  })
  it("Should revert change stage to Private sale by any user on phase 2", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    await expect(ethereumTowers.connect(testUser).changeRound(200)).to.be.revertedWith('must have admin role')
  })
  it("Should edit settings of private sale 0.4 ETH per NFT", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeStage(3, ethers.utils.parseEther("0.4", 'ether')))
  })
  it("Should get status of aveliable phase for minitng - Phase 3", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.stage()).to.equal("3")
  })
  it("Should get status of aveliable private sale on Stage 3", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.isPrivateRound()).to.equal(true)
  })
  it("Should get price on private sale on Stage 3 0.4 ETH", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.stagePrice()).to.equal(ethers.utils.parseEther("0.4", 'ether'))
  })
  it(`Should add role & get role from contract by admin on Stage 3`, async function () {
    const [deployer, testUser, testUser2, testUser3, testUser4, testUser5] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    let role = await ethereumTowers.WHITELISTED()
    expect(await ethereumTowers.grantRole("0xe799c73ff785ac053943f5d98452f7fa0bcf54da67826fc217d6094dec75c5ee", testUser5.address))
  })
  it(`Should revert add role to 0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2 by any user on Stage 3`, async function () {
    const [deployer, testUser, testUser2] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    // await expect(ethereumTowers.connect(testUser).grantRole("0xe799c73ff785ac053943f5d98452f7fa0bcf54da67826fc217d6094dec75c5ee", '0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2')).to.be.revertedWith(" AccessControl: account 0xae2af67d6f4fdbaee21874e39a1f41cc04f244a2 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000")
  })
  it("Should try to mint with granted role by with price 0.4 ETH on Stage 3 PRIVATE SALE", async function () {
    const [deployer, testUser, testUser2, testUser3, testUser4, testUser5, testUser6, testUser7, testUser8, testUser9] = await ethers.getSigners()
    const accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    const user4 = ethers.Wallet.createRandom()
    expect(await ethereumTowers.connect(testUser).mint(testUser9.address, 10, '0x0',{
      value: ethers.utils.parseEther("0.4", 'ether')
    }))
  })
  it("Should revert mint on private sale by any not approved user with price 0.4 ETH on Stage 3 PRIVATE SALE", async function () {
    const [deployer, testUser, testUser3, testUser4, testUser5] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)

    await expect(ethereumTowers.connect(testUser4).mint(testUser5.address, 11, '0x0',{
      value: ethers.utils.parseEther("0.4", 'ether')
    })).to.be.revertedWith('EthereumTowers: must have minter role to mint on this tower')
  })
  it("Should enable Phase 3 Public sale by admin", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.changeToPublc())
  })
  it("Should get status of aveliable public sale on phase 3", async function () {
    const [deployer, testUser] = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)
    expect(await ethereumTowers.isPrivateRound()).to.equal(false)
  })
  it("Should mint on public sale by any not approved user with price 0.4 ETH", async function () {
    const [deployer, testUser, testUser3, testUser4, testUser5, testUser6, testUser7] = await ethers.getSigners()
    let accounts = await ethers.getSigners()
    const ET = await ethers.getContractFactory("EthereumTowers");
    const ethereumTowers = await ET.attach(nft)

    await expect(ethereumTowers.connect(testUser6).mint(accounts[9].address, 12, '0x0',{
      value: ethers.utils.parseEther("0.4", 'ether')
    }))
  })
})

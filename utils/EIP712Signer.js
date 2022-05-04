const StakeVoucherType = {
  StakeVoucher: [
    { name: "tokenIds", type: "uint256[]" },
    { name: "rentable", type: "bool" },
    { name: "minRentPeriod", type: "uint32" },
    { name: "rentableUntil", type: "uint32" },
    { name: "rentalDailyPrice", type: "uint96" },
    { name: "deposit", type: "uint96" },
    { name: "nonce", type: "uint256" },
    { name: "owner", type: "address" }
  ]
};

const UnstakeVoucherType = {
  UnstakeVoucher: [
    { name: "tokenIds", type: "uint256[]" },
    { name: "nonce", type: "uint256" },
    { name: "owner", type: "address" }
  ]
};

const ClaimVoucherType = {
  ClaimVoucher: [
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "owner", type: "address" }
  ]
};

class EIP712Signer {
  constructor({ signing_domain, signature_version, contract }) {
    this.signing_domain = signing_domain;
    this.signature_version = signature_version;
    this.contract = contract;
  }

  async signVoucher(voucher, types, signer) {
    const domain = await this._signingDomain();
    const signature = await signer._signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature
    }
  }

  async _signingDomain() {
    if (this._domain != void (0)) {
      return this._domain;
    }

    const chainId = await this.contract.getChainId();
    this._domain = {
      name: this.signing_domain,
      version: this.signature_version,
      verifyingContract: this.contract.address,
      chainId
    };

    return this._domain;
  }
}

module.exports = {
  EIP712Signer,
  StakeVoucherType,
  UnstakeVoucherType,
  ClaimVoucherType
}

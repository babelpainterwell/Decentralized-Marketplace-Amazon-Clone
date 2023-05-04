const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

const ID = 1;
const NAME = "Air Force 1";
const CATEGORY = "Shoes";
const IMAGE =
  "https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg";
const COST = tokens(1);
const RATING = 5;
const STOCK = 2000;

describe("Dappazon", () => {
  let dappazon;
  let deployer, buyer;

  beforeEach(async () => {
    // Setup accounts
    [deployer, buyer] = await ethers.getSigners();

    // Deploy contract
    const Dappazon = await ethers.getContractFactory("Dappazon");
    dappazon = await Dappazon.deploy();
  });

  describe("Deployment", () => {
    it("Sets the owner", async () => {
      expect(await dappazon.owner()).to.equal(deployer.address);
    });
  });

  describe("Listing", () => {
    let transaction;

    beforeEach(async () => {
      transaction = await dappazon
        .connect(deployer)
        .list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
      await transaction.wait();
    });

    it("returns item attributes", async () => {
      const item = await dappazon.items(1);
      expect(await item.id).to.equal(ID);
      expect(await item.name).to.equal(NAME);
      expect(await item.category).to.equal(CATEGORY);
      expect(await item.image).to.equal(IMAGE);
      expect(await item.cost).to.equal(COST);
      expect(await item.rating).to.equal(RATING);
      expect(await item.stock).to.equal(STOCK);
    });

    it("emits newList event", async () => {
      await expect(transaction).to.emit(dappazon, "newList");
    });

    it("only owner can access", async () => {
      await expect(
        dappazon
          .connect(buyer)
          .list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
      ).to.be.revertedWithCustomError(dappazon, "Dappazon__OnlyOwner");
    });
  });

  describe("Purchase", () => {
    let transaction;

    beforeEach(async () => {
      // there has to be listed items
      // Listing
      transaction = await dappazon
        .connect(deployer)
        .list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
      await transaction.wait();

      // Buy the item
      transaction = await dappazon.connect(buyer).buy(ID, { value: COST });
    });

    it("contract address balance has been updated", async () => {
      const balance = await ethers.provider.getBalance(dappazon.address);
      // the gas might be extra, so the real amount of money buyer pays should
      // be COST + gasUsed
      // {gasUsed, effectiveGasPrice} = transactionReceipt
      await expect(balance).to.equal(COST);
    });

    it("update buyer's order count", async () => {
      const result = await dappazon.orderCountHistory(buyer.address);
      await expect(result).to.equal(1);
    });

    it("Adds the order to buyer's order history", async () => {
      const order = await dappazon.orderTracker(buyer.address, 1);

      await expect(order.time).to.be.greaterThan(0);
      await expect(order.item.name).to.equal(NAME);
    });

    it("decrease stock after place order", async () => {
      const item = await dappazon.items(ID);
      await expect(item.stock).to.equal(STOCK - 1);
    });

    it("it emits a buy event", async () => {
      await expect(transaction).to.emit(dappazon, "buyEvent");
    });
  });

  describe("Withdrawl", () => {
    beforeEach(async () => {
      // there has to be listed items
      transaction = await dappazon
        .connect(deployer)
        .list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
      await transaction.wait();

      // Buy the item
      transaction = await dappazon.connect(buyer).buy(ID, { value: COST });
      await transaction.wait();
    });

    it("address balance decreases to 0 after withdrawl", async () => {
      const balancebeforeWithdrawl = await ethers.provider.getBalance(
        dappazon.address
      );
      await expect(balancebeforeWithdrawl).to.equal(COST);
      await dappazon.connect(deployer).withdraw();
      const balanceAfterWithdrawl = await ethers.provider.getBalance(
        dappazon.address
      );
      await expect(balanceAfterWithdrawl).to.equal(0);
      console.log(balanceAfterWithdrawl);
    });

    it("updates the owner's balance", async () => {
      const ownerBalanceBeforeWithdrawl = await ethers.provider.getBalance(
        deployer.address
      );
      const addressBalanceBeforeWithdrawl = await ethers.provider.getBalance(
        dappazon.address
      );

      const transactionResponse = await dappazon.connect(deployer).withdraw();
      // Calculate the gas cost of invoking the withdrawing function
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const ownerBalanceAfterWithdrawl = await ethers.provider.getBalance(
        deployer.address
      );

      await expect(ownerBalanceAfterWithdrawl.add(gasCost)).to.equal(
        addressBalanceBeforeWithdrawl.add(ownerBalanceBeforeWithdrawl)
      );
    });
  });
});

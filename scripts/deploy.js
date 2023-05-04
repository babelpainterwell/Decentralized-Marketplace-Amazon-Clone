const hre = require("hardhat");
const { items } = require("../src/items.json");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};
// Returns a BigNumber representation of value, parsed with unit digits (if it is a number) or from the unit specified (if a string).

async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy Dappazon
  const Dappazon = await hre.ethers.getContractFactory("Dappazon");
  const dappazon = await Dappazon.deploy();
  // get the deployment copy
  await dappazon.deployed();

  console.log(
    `------Contract Dappazon has been deployed to ${dappazon.address}------\n`
  );

  // List all the items
  for (let i = 0; i < items.length; i++) {
    const transaction = await dappazon
      .connect(deployer)
      .list(
        items[i].id,
        items[i].name,
        items[i].category,
        items[i].image,
        tokens(items[i].cost),
        items[i].rating,
        items[i].stock
      );
    await transaction.wait();

    console.log(`Listed item ${items[i].id}: ${items[i].name}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

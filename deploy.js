const { ethers } = require("hardhat");

const localChainId = "31337";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Getting a previously deployed contract
  //  const daiContract = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
  //daiContract = await ethers.getContract("Dai", deployer);

 // const daiAddress  = "0x538eCC225Ee00fd2DA917031ACCCc4b49F36c28e"; //goerli token

  await deploy("Floor101", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
   // args: [MarketplaceContract.address ],
    log: true,
  });

  const floorContract = await ethers.getContract("Floor101", deployer);

  // Getting a previously deployed contract
 // const Floor101 = await ethers.getContract("Floor101", deployer);
  // await MarketplaceContract.addNFTCollection(Floor101.address);  // required for listing nfts for sale
  
};
module.exports.tags = ["Floor101"];

import { Button, Col, Menu, Row, List, InputNumber, Select } from "antd";

import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  // useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { getRPCPollTime, Transactor, Web3ModalSetup } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph } from "./views";
import { useStaticJsonRPC, useGasPrice } from "./hooks";
import { Alchemy, Network } from "alchemy-sdk";
import { useEventListener } from "eth-hooks/events/useEventListener";

const { ethers } = require("ethers");

// Optional Config object, but defaults to demo api-key and eth-mainnet.
const settings = {
  apiKey: 'lIguUBlNorQF0qVOvhyXc57Tkgk3JynZ', // Replace with your Alchemy API Key.
  network: Network.ARB_MAINNET, // Replace with your network.
};

const alchemy = new Alchemy(settings);
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.arbitrum; // <------- select your target frontend network (localhost, goerli, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = false;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "arbitrum"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);

  const mainnetProvider = useStaticJsonRPC(providers, localProvider);

  // Sensible pollTimes depending on the provider you are using
  const localProviderPollingTime = getRPCPollTime(localProvider);
  const mainnetProviderPollingTime = getRPCPollTime(mainnetProvider);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider, mainnetProviderPollingTime);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "FastGasPrice", localProviderPollingTime);
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address, localProviderPollingTime);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address, mainnetProviderPollingTime);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  // useOnBlock(mainnetProvider, () => {
  //   console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  // });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(
    mainnetContracts,
    "DAI",
    "balanceOf",
    ["0x34aA3F359A9D614239015126635CE7732c18fDF3"],
    mainnetProviderPollingTime,
  );

  // input number handler for NFT ID
  const changeLoan = value => {
    setLoanAmount(value);
  };

   // input number handler for NFT ID
   const onChange2 = value => {
    setNFTid(value);
  };

     // input number handler for NFT ID
     const collectionIDSet = value => {
      setCollectionID(value);
    };

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    //const provider = await web3Modal.connect();
    const provider = await web3Modal.requestProvider();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
    //automatically connect if it is a safe app
    const checkSafeApp = async () => {
      if (await web3Modal.isSafeApp()) {
        loadWeb3Modal();
      }
    };
    checkSafeApp();
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;


  const repayLoanEvent = useEventListener(readContracts, "FloorLendingV2", "repayLoanEvent", localProvider, 1); 
  const loanEvent = useEventListener(readContracts, "FloorLendingV2", "loanEvent", localProvider, 1);  
  const lendAddy =  "0x0CbD649a6bC932D5F9e5A4ed9522120bCb42E433";  // FloorLendingV2 address
 
  const [loanDays, setNFTDays] = useState(1);  // length of loan in days 
  const [loanAmount, setLoanAmount] = useState(.28);  
  const [setCollectionID, collectionID] = ("0");
  const [yourCollectibles2, setYourCollectibles2] = useState();
  const [collectionNumber, setCollectionNumber] = useState(0);  // indenitifies the NFT collection to be used
  const [NFTid, setNFTid] = useState("0");
  let maxLoanBerries = 0.286 ;

  const ethBalance = useBalance(localProvider, lendAddy);
  // displays NFTs that are minted
  const updateYourCollectibles2 = async () => {
    let counter=0
    const nftsForOwner = await alchemy.nft.getNftsForOwner("0xE90Eee57653633E7558838b98F543079649c9C2F");
    const nftList = nftsForOwner["ownedNfts"]; 
    const collectibleUpdate = [];
    for (let nft of nftList) {
      try{
        if (nft.contract.address == "0x17f4baa9d35ee54ffbcb2608e20786473c7aa49f")
        {console.log(` ${nft.tokenId} .${nft.rawMetadata.image}` );
        let addr = "https://ipfs.io/ipfs/QmSg4CMhmWdQ17i7pNbd8ENhW3B4Vb1kvMK3pgj7tryaNv/" + nft.tokenId + ".jpg";
        collectibleUpdate.push({ id: nft.tokenId, image: addr, owner: address});
        counter = counter +1
       }
      }
      catch(e) {alert (e, "NFT Error")}
    } 
    if (counter==0)
     {alert ("We couldnt find any NFTs for your wallet")
       return
  }
    setYourCollectibles2(collectibleUpdate);
  };
  let a =0

     // input number handler for NFT ID
     const changeDuration = value => {
      try{
       setNFTDays(value);
       a = (maxLoanBerries -(value * .005)).toFixed(2)
       console.log("a  = fixed 1 " , a)       
       setLoanAmount(a);
      } catch (e) {console.log(e);} 
   };  


  const getLoans= async ( ) => {
    let tokenURI = ""
    let str = ""
    let balance2 = await readContracts.FloorLendingV2.getMappingLength(address, 0);
    alert ( balance2)  
    for (let i = 0; i < balance2; i++)
     { tokenURI = await readContracts.FloorLendingV2.getLoanID(address, 0, i );
       let due = await readContracts.FloorLendingV2.getDueDate(tokenURI, 0);
        str=str.concat('NFT id : ', tokenURI , ' Due :' ,getDate(due) )
    }
    setDisplayLoans(str)
  };

  const handleClick = async (event, message) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract("0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f", berryAbi, provider);
    const marketWithSigner = marketContract.connect(signer); 
    try{  
      await marketWithSigner.approve(lendAddy, message);
    }catch(e) {alert (e, "approve error"); console.log(e);}
  };

  function getDate(dt) {
    const milliseconds = dt * 1000 // 1575909015000
    const dateObject = new Date(milliseconds)
    let humanDateFormat = dateObject.toLocaleString() //2019-12-9 10:30:15
    return humanDateFormat;
  }

  const lend = async (event, nftNumber) =>{ 
    console.log("nftNumber ", nftNumber, "loanAmount ", loanAmount, " loanDays ", loanDays , " collectionNumber ", collectionNumber)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract(lendAddy, floorLendAbi, provider);
    const marketWithSigner = marketContract.connect(signer); 
    try{  
      await marketWithSigner.lend(nftNumber, loanDays, collectionNumber,ethers.utils.parseEther(loanAmount + ""));
    }catch(e) {alert (e, "Lend error"); console.log(e);}

   }

  const [displayLoans, setDisplayLoans] = useState();  

  const berryAbi = [
    "function approve( address to, uint256 tokenId)", 
    "function balanceOf( address owner)",     
  ];

  const floorLendAbi = [
    "function lend( uint256 tokenId , uint256 loanLength ,uint256 collectionID,uint256  _loanAmount )",    
  ];

  const repayFloor = async (event, nftNumber) =>{ 
    try{
      const repayAmount = await readContracts.FloorLendingV2.calculateBorrowFee(nftNumber,0); 
      alert(repayAmount)
      return
      await tx( writeContracts.FloorLendingV2.repayLoan(nftNumber, 0,{value: repayAmount}));
    }
    catch(e) {alert (e, "repay error"); console.log(e);}
  }
  
  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header>
        {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1 }}>
            {USE_NETWORK_SELECTOR && (
              <div style={{ marginRight: 20 }}>
                <NetworkSwitch
                  networkOptions={networkOptions}
                  selectedNetwork={selectedNetwork}
                  setSelectedNetwork={setSelectedNetwork}
                />
              </div>
            )}
            <Account
              useBurner={USE_BURNER_WALLET}
              address={address}
              localProvider={localProvider}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              price={price}
              web3Modal={web3Modal}
              loadWeb3Modal={loadWeb3Modal}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              blockExplorer={blockExplorer}
            />
          </div>
        </div>
      </Header>

      {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
        <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
      )}

      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />

      <Menu style={{ textAlign: "center", marginTop: 0 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">Home</Link>
        </Menu.Item>
        <Menu.Item key="/repay">
          <Link to="/repay">Repay Loan</Link>
        </Menu.Item>       
        <Menu.Item key="/about">
          <Link to="/home">About</Link>
        </Menu.Item>     
      </Menu>
      <Switch>

<Route exact path="/">
<h2>FLOOR 101 - NFT LENDING</h2>
    <Select defaultValue="GMX Blueberry Club" style={{width: 200,}} 
      options={[
        {value: '0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f', label: 'GMX Blueberry Club',},
        {value: '',label: 'Coming soon', disabled: true},
      ]}
    /> 
 <p>For more info about lending <a href="./about">CLICK HERE</a></p>
 Connected to {address} <br />
 <div>Available ETH in lending contract ETH {ethers.utils.formatEther(ethBalance)}</div>
 If you know the ID of your NFT, just enter it below , otherwise click on the Display Eligible Blueberries below.
 <table padding = {25}>
<tr><td>Nft ID : </td><td><InputNumber min={1} max={10000} defaultValue={1} onChange={setNFTid} style={{ width: 200 }} /></td></tr>
<tr><td>Loan Duration : </td><td>
 <InputNumber min={1} max={28} placeholder={"Loan Duration"} defaultValue={1} onChange={changeDuration} style={{ width: 200 }} />
 </td></tr>
 <tr><td>Loan Amount : </td><td>
 <InputNumber min={.1} max={maxLoanBerries} step={0.01} value={loanAmount} onChange={changeLoan} style={{ width: 200 }} />
 </td></tr></table>
 <Button type="primary" shape="round" onClick={(event) => handleClick(event, NFTid)}  style={{ marginTop: 10 }}>Approve</Button>{" "}
 <Button type="primary" shape="round" onClick={(event) => lend(event, NFTid)} style={{ marginTop: 10 }}>LEND</Button><br />
 <div >
<Button type="primary" shape="round" onClick={() =>{updateYourCollectibles2()}} style={{ marginTop: 10 }}>Display Eligible Blueberries</Button>

<List id="centerWrapper !important" dataSource={yourCollectibles2} renderItem={item => {
                    return (
<List.Item>
  Item ID {item.id}<br />
{<img src= {item.image} width={100} class="center" />} 
<table padding = {25}>
<tr><td>Nft ID : </td><td><InputNumber min={1} max={10000} defaultValue={item.id} onChange={setNFTid} style={{ width: 200 }} /></td></tr>
<tr><td>Loan Duration : </td><td>
 <InputNumber min={1} max={28} placeholder={"Loan Duration"} defaultValue={1} onChange={changeDuration} style={{ width: 200 }} />
 </td></tr>
 <tr><td>Loan Amount : </td><td>
 <InputNumber min={.1} max={maxLoanBerries} step={0.01} value={loanAmount} onChange={changeLoan} style={{ width: 200 }} />
 </td></tr></table>
 <Button type="primary" shape="round" onClick={(event) => handleClick(event, item.id)}  style={{ marginTop: 10 }}>Approve</Button>{" "}
 <Button type="primary" shape="round" onClick={(event) => lend(event, item.id)} style={{ marginTop: 10 }}>LEND</Button><br />
 
 </List.Item>
);}}/>
<table padding = {25}>
<tr><td>
<List  id="centerWrapper!important" dataSource={loanEvent}   
             class="center"    renderItem={item => {
                  return (
   <List.Item key={item[0] }>
  <p><h2>Loan Details</h2>
  <b>NFT ID # </b>{item.args[1].toNumber()}<br />
  <b>Loan amount : </b>ETH : { ethers.utils.formatEther( item.args[3] ) }<br />
  <b>Due Date : </b> { getDate(item.args[4])   } <br />
  <b>Address : </b> {item.args[0]} </p>
  </List.Item>
                  );
                }}
              />
</td></tr></table>
   </div>

        </Route>

        <Route path="/repay">
        <div style={{ width: 460, margin: "auto", backgroundColor: "Off-White", border:2}}>
 <h1>Repay Loan</h1>
 <Select defaultValue="GMX Blueberry Club" style={{width: 200,}} onChange={collectionIDSet} 
      options={[
        {value: '0', label: 'GMX Blueberry Club',},
        {value: '1',label: 'Floor 101',},
      ]}
    /> <br />
 <Button type="primary" shape="round" onClick={() =>{getLoans()}} style={{ marginTop: 10 }} >Display Loans</Button>{' '}
 <h1>Your Loans</h1>
 {displayLoans}
 <p> Enter the number of your NFT and click Repay Loan to pay back your loan</p>

 <InputNumber min={1} max={10100} placeholder={"NFT ID"} onChange={onChange2} style={{width: 200, marginBottom: 10 }} /><br />
 <Button type="primary" shape="round" onClick={(event) => repayFloor(event, NFTid)} >REPAY LOAN</Button>
<br />
<List dataSource={repayLoanEvent}   
                renderItem={item => {
                  return (
 <List.Item key={item[0] }>
  <span style={{ fontSize: 16, marginRight: 8 }}><b>Loan for NFTID #{item.args[0].toNumber()} has been repaid</b></span>
  <span style={{ fontSize: 16, marginRight: 8 }}>Repayment amount { ethers.utils.formatEther( item.args[2] ) } ETH</span><br />
   Address {item.args[1]}  
                    </List.Item>
                  );
                }}
              />

     </div>

        </Route>
        <Route path="/home">
        <Home />
        </Route>

      </Switch>

    <ThemeSwitch />

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;

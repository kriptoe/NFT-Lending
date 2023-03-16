import Portis from "@portis/web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, Col, List, Menu, Row, InputNumber, Select } from "antd";
import "antd/dist/antd.css";
import Authereum from "authereum";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import { useEventListener } from "eth-hooks/events/useEventListener";
import Fortmatic from "fortmatic";
import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
//import Torus from "@toruslabs/torus-embed"
import WalletLink from "walletlink";
import Web3Modal from "web3modal";
import "./App.css";
import { Address, Account, Balance, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "./components";
import { INFURA_ID, NETWORK, NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor } from "./helpers";
// import Hints from "./Hints";
import { ExampleUI, Hints, Subgraph } from "./views";
// Setup: npm install alchemy-sdk
import { Alchemy, Network } from "alchemy-sdk";

// Optional Config object, but defaults to demo api-key and eth-mainnet.
const settings = {
  apiKey: 'lIguUBlNorQF0qVOvhyXc57Tkgk3JynZ', // Replace with your Alchemy API Key.
  network: Network.ARB_MAINNET, // Replace with your network.
};

const alchemy = new Alchemy(settings);
function importAll(r) {
  let images = {};
  r.keys().map((item, index) => {
    images[item.replace("./", "")] = r(item);
  });
  return images;
}

const { ethers } = require("ethers");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.goerli; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
  : null;
const poktMainnetProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider(
      "https://eth-mainnet.gateway.pokt.network/v1/lb/61853c567335c80036054a2b",
    )
  : null;
const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider(`https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`)
  : null;
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID
// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: "coinbase",
});

// WalletLink provider
const walletLinkProvider = walletLink.makeWeb3Provider(`https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`, 1);

const web3Modal = new Web3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "light", // optional. Change to "dark" for a dark theme.
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        bridge: "https://polygon.bridge.walletconnect.org",
        infuraId: INFURA_ID,
        rpc: {
          1: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`, // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          42: `https://kovan.infura.io/v3/${INFURA_ID}`,
          100: "https://dai.poa.network", // xDai
        },
      },
    },
    portis: {
      display: {
        logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
        name: "Portis",
        description: "Connect to Portis App",
      },
      package: Portis,
      options: {
        id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
      },
    },
    fortmatic: {
      package: Fortmatic, // required
      options: {
        key: "pk_live_5A7C91B2FC585A17", // required
      },
    },
    // torus: {
    //   package: Torus,
    //   options: {
    //     networkParams: {
    //       host: "https://localhost:8545", // optional
    //       chainId: 1337, // optional
    //       networkId: 1337 // optional
    //     },
    //     config: {
    //       buildEnv: "development" // optional
    //     },
    //   },
    // },
    "custom-walletlink": {
      display: {
        logo: "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
        name: "Coinbase",
        description: "Connect to Coinbase Wallet (not Coinbase App)",
      },
      package: walletLinkProvider,
      connector: async (provider, _options) => {
        await provider.enable();
        return provider;
      },
    },
    authereum: {
      package: Authereum, // required
    },
  },
});

function App(props) {
  const mainnetProvider =
    poktMainnetProvider && poktMainnetProvider._isProvider
      ? poktMainnetProvider
      : scaffoldEthProvider && scaffoldEthProvider._network
      ? scaffoldEthProvider
      : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();

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
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider);
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

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

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
  const lendAddy =  readContracts && readContracts.FloorLendingV2 && readContracts.FloorLendingV2.address;  

  // If you want to call a function on a new block
 // useOnBlock(mainnetProvider, () => {
  //  console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
 // });

  const loanEvent = useEventListener(readContracts, "FloorLendingV2", "loanEvent", localProvider, 1);
  const repayLoanEvent = useEventListener(readContracts, "FloorLendingV2", "repayLoanEvent", localProvider, 1); 
  const ethBalance = useBalance(localProvider, lendAddy);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

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
      //console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      //console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      //console.log("🌍 DAI contract on mainnet:", mainnetContracts);
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
  ]);

  let networkDisplay = "";
  if (NETWORKCHECK && localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <Button
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];
                    console.log("data", data);

                    let switchTx;
                    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
                    try {
                      switchTx = await ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: data[0].chainId }],
                      });
                    } catch (switchError) {
                      // not checking specific error code, because maybe we're not using MetaMask
                      try {
                        switchTx = await ethereum.request({
                          method: "wallet_addEthereumChain",
                          params: data,
                        });
                      } catch (addError) {
                        // handle "add" error
                      }
                    }

                    if (switchTx) {
                      console.log(switchTx);
                    }
                  }}
                >
                  <b>{networkLocal && networkLocal.name}</b>
                </Button>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
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
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId === 31337 &&
    yourLocalBalance &&
    ethers.utils.formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            faucetTx({
              to: address,
              value: ethers.utils.parseEther(".05"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }

  const handleClick2 = async ( ) => {
    await tx( writeContracts.Floor101.approve(lendAddy, NFTid));
  };

  const lend2 = async ( ) => {
    console.log("NFTid ----------------", NFTid, " loanDays ", loanDays , " collectionNumber ", collectionNumber)
    await tx( writeContracts.FloorLendingV2.lend(NFTid, loanDays , 1 ,ethers.utils.parseEther("0.2")));
  };

  const getLoans= async ( ) => {
    let str = ""
    let balance2 = await readContracts.FloorLendingV2.getMappingLength(address, 1);
    for (let i = 0; i < balance2; i++)
     { let tokenURI = await readContracts.FloorLendingV2.getLoanID(address, 1, i );
       let due = await readContracts.FloorLendingV2.getDueDate(tokenURI, 1);
        str=str.concat('NFT id : ', tokenURI , ' Due :' ,getDate(due) )
    }
    setDisplayLoans(str)
  };

  const handleClick = async (event, message) => {
    alert(message)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract("0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f", berryAbi, provider);
    const marketWithSigner = marketContract.connect(signer); 
    try{  
      await marketWithSigner.approve(lendAddy, message);
    }catch(e) {alert (e); console.log(e);}
  };

  function getDate(dt) {
    const milliseconds = dt * 1000 // 1575909015000
    const dateObject = new Date(milliseconds)
    let humanDateFormat = dateObject.toLocaleString() //2019-12-9 10:30:15
    return humanDateFormat;
  }

  // const marketContractAddress = useContractReader(readContracts, "Marketplace", "address");
  const balance = useContractReader(readContracts, "Floor101", "balanceOf", [address]);
  const yourBalance = balance && balance.toNumber && balance.toNumber();

  const [yourCollectibles, setYourCollectibles] = useState();
  const [yourCollectibles2, setYourCollectibles2] = useState(); // blueberry NFTs
  const [collectionNumber, setCollectionNumber] = useState(0);  // indenitifies the NFT collection to be used
  const [loanInfoString, setMaxLoanString] = useState("Maximum loan size for GMX Blueberries is .25 ETH");
  const [loanDays, setNFTDays] = useState(1);  // length of loan in days 
  const [loanAmount, setLoanAmount] = useState(.25);   
  const [displayLoans, setDisplayLoans] = useState();  

// displays NFTs that are minted
useEffect(() => {
  const updateYourCollectibles = async () => {
    const collectibleUpdate = [];
    for (let tokenIndex = 0; tokenIndex < balance; tokenIndex++) {
      try {
        const tokenId = await readContracts.Floor101.tokenOfOwnerByIndex(address, tokenIndex);
        let tokenURI = await readContracts.Floor101.tokenURI(tokenId);
        const jsonManifestString = atob(tokenURI.substring(29))
        try {
          const jsonManifest = JSON.parse(jsonManifestString);
          collectibleUpdate.push({ id: tokenId, uri: tokenURI, owner: address, ...jsonManifest });
        } catch (e) {
          console.log(e);
        }
      } catch (e) {
        console.log(e);
      }
    }
    setYourCollectibles(collectibleUpdate.reverse());
  };
  updateYourCollectibles();
}, [address, yourBalance]);

// displays NFTs that are minted
  const updateYourCollectibles2 = async () => {
    //alert(address)
    //const address = "0xa435530d50d7D17Fd9fc6E1c897Dbf7C08E12d35"; // Wallet address
    const nfts = await alchemy.nft.getNftsForOwner(address);
     if (nfts.totalCount == 0)
      { alert("No blueberries for this address"); return }
    const nftList = nfts["ownedNfts"]; 
    const collectibleUpdate = [];
    for (let nft of nftList) {
      if (nft.contract.address == "0x17f4baa9d35ee54ffbcb2608e20786473c7aa49f")
       {console.log(` ${nft.tokenId} .${nft.rawMetadata.image}` );
       let addr = "https://ipfs.io/ipfs/QmSg4CMhmWdQ17i7pNbd8ENhW3B4Vb1kvMK3pgj7tryaNv/" + nft.tokenId + ".jpg";
       collectibleUpdate.push({ id: nft.tokenId, image: addr, owner: address});
      }
    } 
    setYourCollectibles2(collectibleUpdate);
  };

let a = 0;

const [show,setShow]=useState(true);

const [NFTid, setNFTid] = useState("0");
    // input number handler for NFT ID
    const changeLoan = value => {
      setLoanAmount(value);
    };

     // input number handler for NFT ID
     const onChange2 = value => {
      setNFTid(value);
    };

     // input number handler for NFT ID
     const changeDuration = value => {
       try{
        setNFTDays(value);
        a = (.26 -(value * .005)).toFixed(2)
        console.log("a  = fixed 1 " , a)       
        setLoanAmount(a);
       } catch (e) {console.log(e);} 
    };    
    
  const date = new Date();

  const handleChange = (value) => {
    setShow(!show)
    setCollectionNumber(value)
    console.log("-------------------------", value)
    if(value==0)
     setMaxLoanString("Maximum loan size for GMX Blueberries is .25 ETH")
    else
     setMaxLoanString("Maximum loan size for Floor 101 is .1 ETH")    
  };

// approve Floor Lending Contract
const approveFloor = async () =>{
  await tx( writeContracts.Floor101.approve("0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f", 7844));
}
   // lending button function

   const lend = async () =>{ 
    console.log("loanAmount ", loanAmount, " loanDays ", loanDays , " collectionNumber ", collectionNumber)
    await tx( writeContracts.FloorLendingV2.lend(NFTid, loanDays, collectionNumber,ethers.utils.parseEther(loanAmount + "")));
   }


   // lending button function
   const Liquidate = async () =>{ 
    console.log("loanAmount ", loanAmount)
    await tx( writeContracts.FloorLendingV2.lend(NFTid,loanDays, collectionNumber,loanAmount));
   }

  const repay = async () =>{ 
    const repayAmount = await readContracts.FloorLendingV2.calculateBorrowFee(NFTid,0); 
    await tx( writeContracts.FloorLendingV2.repayLoan(NFTid,0,{value: repayAmount}));
  }

  const repayFLOOR = async () =>{ 
    const repayAmount = await readContracts.FloorLendingV2.calculateBorrowFee(NFTid,1); 
    alert(repayAmount)
    await tx( writeContracts.FloorLendingV2.repayLoan(NFTid,1,{value: repayAmount}));
  }

  const berryAbi = [
    "function approve( address to, uint256 tokenId)", 
  ];

// approve Floor Lending Contract
const approveBlueberry= async () =>{
  alert(NFTid)
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const marketContract = new ethers.Contract("0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f", berryAbi, provider);
  const marketWithSigner = marketContract.connect(signer); 
  try{  
    alert("nftid ", NFTid) 
    await marketWithSigner.approve(lendAddy, NFTid);
  }catch(e) {alert (e); console.log(e);}
}

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      {networkDisplay}
      <BrowserRouter>
        <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
           HOME
            </Link>
          </Menu.Item>
          <Menu.Item key="repay">
            <Link
              onClick={() => {
                setRoute("repay");
              }}
              to="repay"
            >
           REPAY
            </Link>
          </Menu.Item>
          <Menu.Item key="liquidate">
            <Link
              onClick={() => {
                setRoute("liquidate");
              }}
              to="liquidate"
            >
           Liquidate
            </Link>
          </Menu.Item> 
          <Menu.Item key="/about">
            <Link
              onClick={() => {
                setRoute("/about");
              }}
              to="/about"
            > About
            </Link>
          </Menu.Item>                            
          <Menu.Item key="/debug">
            <Link
              onClick={() => {
                setRoute("/debug");
              }}
              to="/debug"
            > Debug
            </Link>
          </Menu.Item>
        </Menu>

        <Switch>
          <Route exact path="/">
    <div id="centerWrapper" style={{ padding: 16 }}>
    <h2>FLOOR 101 - NFT LENDING</h2>
    <Select defaultValue="GMX Blueberry Club" style={{width: 200,}} onChange={handleChange}
      options={[
        {value: '0', label: 'GMX Blueberry Club',},
        {value: '1',label: 'Floor 101',},
      ]}
    /> 
    <p>For more info about lending <a href="./about">CLICK HERE</a></p>
   Connected Wallet Address {address}<br />
   <div>Available ETH in lending contract ETH {ethers.utils.formatEther(ethBalance)}</div>
   {loanInfoString}

 <div >
<Button type="primary" shape="round" onClick={() =>{updateYourCollectibles2()}}>Display Eligible Blueberries</Button>

<List id="centerWrapper !important" dataSource={yourCollectibles2} renderItem={item => {
                    return (
<List.Item>
  Item ID {item.id}<br />
{<img src= {item.image} width={100} class="center" />} 
<table padding = {25}>
  <tr><td>Nft ID : </td><td><InputNumber min={1} max={10000} defaultValue={item.id} disabled = {true} onChange={setNFTid} style={{ width: 200 }} /></td></tr>
<tr><td>Loan Duration : </td><td>
 <InputNumber min={1} max={28} placeholder={"Loan Duration"} defaultValue={1} onChange={changeDuration} style={{ width: 200 }} />
 </td></tr>
 <tr><td>Loan Amount : </td><td>
 <InputNumber min={.1} max={.25} step={0.01} value={loanAmount} onChange={changeLoan} style={{ width: 200 }} />
 </td></tr></table>
 <Button type="primary" shape="round" onClick={(event) => handleClick(event, item.id)} >Approve</Button>{" "}
 <Button type="primary" shape="round" onClick={lend}>LEND</Button><br />
 
 </List.Item>
);}}/>

   </div>
 </div>
 </Route>
<Route exact path="/repay">
  <div style={{ width: 460, margin: "auto", backgroundColor: "Off-White", border:2}}>
 <h1>Repay Loan</h1>
 <Select defaultValue="GMX Blueberry Club" visible={false } style={{width: 200,}} onChange={handleChange}
      options={[
        {value: '0', label: 'GMX Blueberry Club',},
        {value: '1',label: 'Floor 101',},
      ]}
    /> <br />
 <Button type="primary" shape="round" onClick={() =>{getLoans()}} >Display Loans</Button>{' '}
 <h1>Your Loans</h1>
 {displayLoans}
 <p> Enter the number of your NFT and click Repay Loan to pay back your loan</p>

 <InputNumber min={1} max={101} placeholder={"NFT ID"} onChange={onChange2} style={{width: 200, marginBottom: 10 }} /><br />
 <Button type="primary" shape="round" onClick={() =>{repayFLOOR()}}>REPAY LOAN</Button>
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
 <Route exact path="/liquidate">
 <h1>Liquidate Loan</h1>
 <Button type="primary" shape="round" onClick={Liquidate}>LIQUIDATE</Button><br /><br />
 
  </Route>

<Route exact path="/about">
 <h1>About</h1>
 <p>Maximum size of loan reduces per length of loan<br />
    Maximum length of loan is 28 days.<br />
    Interest rate is 0.001% per day so <br />
    a loan of 0.24 eth for 5 days would cost 0.0012eth (approx $1.90)<br />
    If you take a loan out for 20 days but pay it back after 2 days, you only pay the 2 days interest.<br />
    Can only be liquidated after the loan period expires.
 <br /></p>
 <h1>MINT</h1>
 <Button type="primary" shape="round"  onClick={() =>{tx( writeContracts.Floor101.mintWithDAI());}}>MINT</Button><br /><br />

<table width={400} id="cssTable"><tr><td width={45}></td><td>
<List dataSource={yourCollectibles} renderItem={item => {
return (
<List.Item>
<a href={"https://opensea.io/assets/"+(readContracts && readContracts.Floor101 && readContracts.Floor101.address)+"/"+item.id} target="_blank">{<img src= {item.image} class="center"  />} </a>
 </List.Item>
);}}/></td></tr></table>


<h1>Lend </h1>
<InputNumber min={1} max={28} placeholder={"Loan Duration"} defaultValue={1} onChange={changeDuration} style={{ width: 200 }} />
<InputNumber min={1} max={101} placeholder={"NFT ID"} onChange={onChange2} style={{width: 200, marginBottom: 10 }} /><br />
<Button type="primary" shape="round" padding={20} onClick={handleClick2} >Approve N</Button>{" "}
   <Button type="primary" shape="round" onClick={lend2}>LEND</Button><br />
   <List dataSource={loanEvent}   
                renderItem={item => {
                  return (
  <List.Item key={item[0] }>
  <span style={{ fontSize: 16, marginRight: 8 }}><b>Loan for NFTID #{item.args[1].toNumber()}</b></span>
  <span style={{ fontSize: 16, marginRight: 8 }}><b>Collection ID #{item.args[2].toNumber()}</b></span>
  <span style={{ fontSize: 16, marginRight: 8 }}><b>Loan Amount {ethers.utils.formatEther( item.args[3] )} ETH</b></span>
  <span style={{ fontSize: 16, marginRight: 8 }}><b>Due Date {getDate( item.args[4] )} ETH</b></span>                     
                      Address {item.args[0]}  
                    </List.Item>
                  );
                }}
              />
          </Route>        
<Route exact path="/debug">
            <Contract
              name="Floor101"
              price={price}
              signer={userSigner}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              contractConfig={contractConfig}
            />
            <Contract
              name="FloorLendingV2"
              price={price}
              signer={userSigner}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              contractConfig={contractConfig}
            />
          </Route>
        </Switch>
      </BrowserRouter>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <Account
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
        {faucetHint}
      </div>

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

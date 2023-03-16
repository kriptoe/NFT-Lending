// SPDX-License-Identifier: MIT LICENSE

pragma solidity >=0.8.0 <0.9.0;

  import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
  import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
  import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
  import "@openzeppelin/contracts/access/Ownable.sol";
  import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
  import "hardhat/console.sol";

contract FloorLendingV2 is IERC721Receiver, ReentrancyGuard, Ownable {

//------------------------ERRORS -------------------------------
  error notOwner();             // Not owner of NFT
  error notEnoughETH();         // user doesnt have enough DAI 
  error alreadyListed();        // NFT already listed
  error cantBorrowThatMuch();  
/* ------------ EVENTS -------------------------------------*/

  event loanEvent(address indexed sender, uint256 NFTid, uint256 collectionID, uint256 loanAmount, uint256 dueDate);
  event repayLoanEvent(uint256 NFTid, address indexed sender,  uint256 loanAmount);
  event liquidationEvent(address indexed previousOwner, uint256 tokenId,uint256 liquidationPrice);

  address payable holder;
  uint256 lendingFee = 0.8 ether;
  uint256 liquidationFee = 0.005 ether; // fee goes to the lending protocol
   // Collection ID identifies the value, says the max loan size for each collection
   // eg field 0 in array represents collection ID 0
   // first slot represents maximum loan 
  struct LoanData{
     uint256 collectionID; 
     uint256 maxLoanAmount;
     uint256 loanDecayRate;     // amount that can be loaned decays by this amount * days of loan
     uint256 maxDays;           // maximum days loan can be for 
   }
  LoanData [] public loanData;   
  
     struct Loan {
        uint256 collectionID;
        address owner;
        uint256 startDate;        
        uint256 endDate; 
        uint256 loanAmount;
        uint256 interestRate;
        bool liquidated;        // false, set to true if loan is liquidated
    }
 
  /* ------------ MAPPINGS -------------------------------------*/

   mapping (uint256 => mapping (uint256 => Loan )) public loans;   // map NFTid to Collection ID to loan struct
   mapping (address => mapping (uint256 => uint256[] )) public userLoans;   // map user address to collection ID to array of NFT ids to track user loans 
   ERC721Enumerable[] nftAddress;
   
   constructor(ERC721Enumerable addr) {
    //max loan  needs to be .005 higher to account for decay rate
    //max loan .25 ether, decay .005 eth
     addNFTCollection(addr, 0, 255000000000000000, 5000000000000000,28);  
  }

  function addNFTCollection(ERC721Enumerable _nft, 
                            uint256 _collectionID, 
                            uint256 _maxLoan,
                            uint256 _loanDecayRate ,
                            uint256 _maxDays) public onlyOwner{
      nftAddress.push(_nft);
      loanData.push(LoanData(_collectionID, _maxLoan, _loanDecayRate , _maxDays ));
  }

   function getCollection(uint i) public view returns ( ERC721Enumerable ) {
      return nftAddress[i];
    }

   // return balance of contract -- for testing
   function getBalance() public view returns ( uint256) {
      return address(this).balance;
    }

  function getDueDate(uint256 tokenID, uint256 collectionID) public view returns(uint256){
     return loans[tokenID][collectionID].endDate  ;
  }

  // changes the fee charged to buy a cheap liquidated NFT
 function setLiquidationFee(uint256 _liquidationFee) public onlyOwner{
   liquidationFee = _liquidationFee;
 }

  // borrow fee is .001% x number of days x principal
    function calculateBorrowFee( uint256 tokenID, uint256 collectionID) public view returns (uint256)
    {
     uint256 loanDuration = block.timestamp - loans[tokenID][collectionID].startDate ;
     console.log (tokenID , " tokenid loan duration is ",loanDuration);
     uint256 hrs = loanDuration /  3600;
     console.log ("hrs is ",loanDuration);    
        if (hrs < 24 )   // minimum loan fee is 1 days interest
         hrs = 24 ; 
    // divide by 1000 gets 0.001% , divide by 24 gets hourly rate then multiply by number of hours   
        uint256 interest = loans[tokenID][collectionID].loanAmount / 1000 / 24 * hrs ; 
       // return the interest + the principal amount
         return (interest + loans[tokenID][collectionID].loanAmount);       
    }
  
   function getLoanID (address addr, uint256 cid, uint256 position) public view returns(uint256) {
      return userLoans[addr][cid][position];
    // return (userLoans[addr][cid][position], loans[userLoans[addr][cid][position]][cid].loanAmount);  // returns the NFT ID for the collection and position passed into it
   }

   

   function getMappingLength(address addr, uint256 cid)public view returns(uint256){
     return userLoans[addr][cid].length;  // track how many loans each user has per collection
   }

   // change the max loan size, duration and loan decay rate
   function setLoanData(uint256 collectionID, uint256 _amount, uint256 _decayRate, uint256 _maxDays) public onlyOwner {
      loanData[collectionID].maxLoanAmount = _amount;
      loanData[collectionID].loanDecayRate = _decayRate;
      loanData[collectionID].maxDays = _maxDays;          
    }

    function getMaxLoan(uint i) public view returns (uint256 ) {
      return loanData[i].maxLoanAmount;
    }   

  // users can lend against the floor price of the token
  // IMPORTANT : requires approval from the nft contract
   function lend(uint256 tokenId, uint256 loanLength, uint256 collectionID, uint256 _loanAmount) public nonReentrant{
    if (_loanAmount > loanData[collectionID].maxLoanAmount - (loanLength * loanData[collectionID].loanDecayRate) )
        revert cantBorrowThatMuch();     
    if (nftAddress[collectionID].ownerOf(tokenId)!=msg.sender)
        revert notOwner();      
 //    paytoken.approve(this(address), tokenId);   // approve the nft contract to transfer the NFT
     loans[tokenId][collectionID].collectionID = collectionID; 
     loans[tokenId][collectionID].owner = msg.sender;
     loans[tokenId][collectionID].startDate = block.timestamp; //set start date to current block
     loans[tokenId][collectionID].endDate = loanLength * 86400 + block.timestamp; // number of days * 86400(1 day in seconds)
     loans[tokenId][collectionID].liquidated = false;
     loans[tokenId][collectionID].loanAmount = _loanAmount;     
     loans[tokenId][collectionID].interestRate = 1 ether; 
     nftAddress[collectionID].transferFrom(msg.sender, address(this), tokenId);         // transfer NFT to contract 
     (bool sent, ) = msg.sender.call{value: _loanAmount}("");
     require(sent, "Contract didnt send ether");
     userLoans[msg.sender][collectionID].push(tokenId);
     emit loanEvent(msg.sender, tokenId, collectionID,  _loanAmount, loans[tokenId][collectionID].endDate);
   }


    function repayLoan(uint256 tokenId, uint256 collectionID) public payable nonReentrant {
      uint256 amount = calculateBorrowFee(tokenId, collectionID)  ;
      if (msg.value < amount)
        revert notEnoughETH();     
      require(loans[tokenId][collectionID].owner == msg.sender, "NFT not yours"); //require the loan was made from this sender address
      console.log("----------loanAmount------------", loans[tokenId][collectionID].loanAmount);
      delete loans[tokenId][collectionID] ; 
      nftAddress[collectionID].transferFrom(address(this), msg.sender, tokenId); // transfer NFT to user
      emit repayLoanEvent(tokenId, msg.sender, amount);
  } 

  // This function checks that the liquidation date has occurred
  // as the NFT is already owned by the contract we set a sale price and list it on our marketplace
  function liquidate (uint256 tokenId,uint256 collectionID) public payable nonReentrant {
      require (loans[tokenId][collectionID].endDate < block.timestamp,"Loan still active");
      uint256 amount = calculateBorrowFee(tokenId,collectionID) + liquidationFee;  // amount owed on loan plus .005eth to buy the liquidated NFT
       if (msg.value < amount)
         revert notEnoughETH();  
      nftAddress[collectionID].transferFrom(address(this), msg.sender, tokenId); // transfer NFT to user
      emit liquidationEvent(loans[tokenId][collectionID].owner , tokenId, amount);
  }

  function onERC721Received(
        address,
        address from,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
      require(from == address(0x0), "Cannot send nfts to Vault directly");
      return IERC721Receiver.onERC721Received.selector;
    }
  
  // can withdraw eth/matic fees to convert to stablecoins for investment strategies
    function withdraw() public payable onlyOwner() {
      require(payable(0xE90Eee57653633E7558838b98F543079649c9C2F).send(address(this).balance));
    }

       receive() external payable {}
}

import React, { Component } from "react";
import MyToken from "./contracts/MyToken.json";
import MyTokenSale from "./contracts/MyTokenSale.json";
import KycContract from "./contracts/KycContract.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { loaded:false, kycAddress: "0x123...",
            tokenSaleAddress: null, userTokens:0,
            totalSupply: 0 };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      this.web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      this.accounts = await this.web3.eth.getAccounts();

      // Get the contract instance.
      this.networkId = await this.web3.eth.net.getId();
    
      this.tokenInstance = new this.web3.eth.Contract(
        MyToken.abi,
        MyToken.networks[this.networkId] && MyToken.networks[this.networkId].address,
      );

      this.tokenSaleInstance = new this.web3.eth.Contract(
        MyTokenSale.abi,
        MyTokenSale.networks[this.networkId] && MyTokenSale.networks[this.networkId].address,
      );
      this.kycInstance = new this.web3.eth.Contract(
        KycContract.abi,
        KycContract.networks[this.networkId] && KycContract.networks[this.networkId].address,
      );
      
      let totalSupply = await this.getTotalSupply();
      
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.listenToTokenTransfer();
      this.listenToTokensPurchased();
      this.setState({loaded:true,
                    totalSupply:totalSupply,
                    tokenSaleAddress:MyTokenSale.networks[this.networkId].address},
                    this.updateUserTokens
                    );
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  updateUserTokens = async () => {
    let userTokens = await this.tokenInstance.methods.balanceOf(this.accounts[0]).call();
    this.setState({userTokens: userTokens});
    this.updateTotalSupply();
  }

  listenToTokenTransfer = () => {
    this.tokenInstance.events.Transfer({to: this.accounts[0]}).on("data",this.updateUserTokens);
  }

  listenToTokensPurchased = () => {
    this.tokenSaleInstance.events.TokensPurchased().on("data",this.updateTotalSupply);
  }

  getTotalSupply = async () => {
    //A few days after writing this function I realised that the 
    //ERC20 token already has a totalSupply function. Silly!
    //Worse, this here might be wrong if tokens are burnt?
    /*
    let weiRaised = await this.tokenSaleInstance.methods.weiRaised().call();
    let rate = await this.tokenSaleInstance.methods.rate().call();
    return weiRaised * rate;
    */
    //Now fixed here, left the stuff above for history.
    let totalSupply = await this.tokenInstance.methods.totalSupply().call();
    return totalSupply;
  }

  updateTotalSupply = async () => {
    this.setState({totalSupply:await this.getTotalSupply()});
  }

  handleBuyTokens = async() => {
    await this.tokenSaleInstance.methods.buyTokens(this.accounts[0]).send({from: this.accounts[0], value: this.web3.utils.toWei("1","wei")});
  }

  handleBurnToken = async() => {
    //It will emit this event: emit Transfer(account, address(0), amount);
    await this.tokenInstance.methods.burn(1).send({from: this.accounts[0]});
    
  }

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  handleKycWhitelisting = async () => {
    await this.kycInstance.methods.setKycCompleted(this.state.kycAddress).send({from: this.accounts[0]});
    alert("KYC for "+this.state.kycAddress+" is completed");
  }

  render() {
    if (!this.state.loaded) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div id="main" className="round_bottom_corners">
        <div className="content">
        <div className="header">
          <img id="img_main_cup" alt="Logo of a coffee cup" src="coffee_cup.png" />
          <h1>StarDucks Cappucino Token Sale</h1>
        </div>
        <h2>Get started</h2>
        <div className="flex-container">
          <div>
            <p className="bold">Step 1: Kyc Whitelisting</p>
            <br />
            <p>
              Address to allow: 
              <input style={{width: '95%'}} type="text" name="kycAddress" value={this.state.kycAddress} onChange={this.handleInputChange} />
              <br /> <br />
              <button type="button" onClick={this.handleKycWhitelisting}>Add to Whitelist</button>
            </p>
          </div>
          <div>
            <p className="bold">Step 2: Add credit</p>        
            <br />
            <p>If you want to buy tokens, send Wei to this address:
            <input readOnly style={{width: '95%'}} type="text" value={this.state.tokenSaleAddress} />
            </p>
          </div>
        </div>
        <br />
        <br />
        <h2>Drink some coffee</h2>
        <div className="flex-container">
          <div>
            <p className="bold">Step 3: The tokens</p>
            <br />
            <p>You currently have: {this.state.userTokens} CAPPU Tokens</p>
            <br />
            <button type="button" onClick={this.handleBuyTokens}>Buy more tokens</button>
            <br /><br />
            <p className="small_centred">*Total supply: {this.state.totalSupply} tokens</p>
          </div>
          <div>
            <p className="bold">Step 4: Exchange for coffee 
            </p>
            <br />
            <button type="button" onClick={this.handleBurnToken}>Get coffee</button>
            <br /><br />
            <p className="small_centred">
              *(burn a token!)
            </p>
          </div>
        </div>
        <br />
        <br />
        <div className="small_centred">
          <p>&copy;&nbsp;Joel Brooker</p>
        </div>
      </div>
      </div>
      </div>
    );
  }
}

export default App;

import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let testOraclesCount = 30;
let oracles = [];
const statusCodeArray = [["STATUS_CODE_UNKNOWN", 0], ["STATUS_CODE_ON_TIME", 10], ["STATUS_CODE_LATE_AIRLINE", 20], ["STATUS_CODE_LATE_WEATHER", 30], ["STATUS_CODE_LATE_TECHNICAL", 40], ["STATUS_CODE_LATE_OTHER", 50]];
let oracleError;

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  //console.log(event)
  checkRandomStatus(event.returnValues)
});

flightSuretyApp.events.OracleReport({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  console.log(event)
});

//Run process to check
async function checkRandomStatus(result) {
  const trustedOracles = [];

  oracles.forEach(function (oracle) {
    //console.log(oracle);
    if (oracle.indices[0] === result.index) trustedOracles.push(oracle);
    if (oracle.indices[1] === result.index) trustedOracles.push(oracle);
    if (oracle.indices[2] === result.index) trustedOracles.push(oracle);
  });

  //console.log("trustedOracles", trustedOracles);
  trustedOracles.forEach(function (oracle) {
    //run processor
    submitOracleResponse(result, oracle);
  });
}

//submit back to app contract with random status
async function submitOracleResponse(result, oracle) {
  const randomStatusCodeIndex = Math.floor(Math.random() * statusCodeArray.length);
  const randomStatusCode = statusCodeArray[randomStatusCodeIndex];

  try {
    let regResult, indexResult;
    // Submit a response...it will only be accepted if there is an Index match
    await flightSuretyApp.methods.submitOracleResponse(result.index,
      result.airline,
      result.flight,
      result.timestamp,
      randomStatusCode[1])
      .send({ from: oracle.account, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
        //console.log(error, result)
        oracleError = error;
        regResult = result;
      });
  }
  catch (e) {
    //console.log(e)
    // Enable this when debugging
    console.log('\nError', result.index, result.flight, result.timestamp);
  }
}

//build all default oracles and persist
web3.eth.getAccounts(async (error, accts) => {

  // ARRANGE
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE()
    .call({ from: accts[1], "gas": 4712388, "gasPrice": 100000000000 });
  //console.log(fee)

  for (let a = 1; a < testOraclesCount; a++) {
    let regResult, indexResult;
    await flightSuretyApp.methods.registerOracle()
      .send({ from: accts[a], value: fee, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
        //console.log(error, result)
        oracleError = error;
        regResult = result;
      });

    await flightSuretyApp.methods.getMyIndexes()
      .call({ from: accts[a], "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
        //console.log(error, result)
        oracleError = error;
        indexResult = result;
      });

    //console.log(`Oracle Registered: ${indexResult[0]}, ${indexResult[1]}, ${indexResult[2]}`);
    oracles.push({ account: accts[a], indices: [indexResult[0], indexResult[1], indexResult[2]] });
  }
});

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

//maybe flights and timestamps hard code to hydrate a dropdown with info

export default app;

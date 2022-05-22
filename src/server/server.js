import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import 'regenerator-runtime/runtime'

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let oracles;
let accounts;

registerOracles();

async function registerOracles() {
  accounts = await web3.eth.getAccounts();
  oracles = accounts

  console.log(oracles)
  let fundingAmount = web3.utils.toWei("1", "ether");
  for (let i = 5; i < oracles.length; i++) {
    await flightSuretyApp.methods.registerOracle().send({ from: oracles[i], value: fundingAmount, gas: 1000000 });
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

async function submitOracleResponse(index, airline, flight, timestamp) {

  for (let i = 5; i < oracles.length; i++) {

    let statusResponse = getRandomInt(0, 6) * 10;

    await flightSuretyApp.methods.submitOracleResponse(getRandomInt(0, 10), airline, flight, timestamp, statusResponse).send({
      from: oracles[i]
    })

    console.log(oracles.length, 'oracle responses sent')
  }
}

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  console.log('EVENT received')

  let index = event.returnValues[0];
  let airline = event.returnValues[1];
  let flight = event.returnValues[2]
  let timestamp = event.returnValues[3];
  console.log('submitOracleResponse')
  submitOracleResponse(index, airline, flight, timestamp)

});

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app;

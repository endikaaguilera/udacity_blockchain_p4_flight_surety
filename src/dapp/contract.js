import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.airlinesNamed = [];
        this.airlinesNamed.push("Test Airline 1");
        this.passengers = [];
        this.timestamp = Math.floor(Date.now() / 1000);
        this.testOraclesCount = 5;
        this.oracles = [];
        this.feeWei = this.web3.utils.toWei("1", "ether");
        this.statusCodeArray = [{ desc: "UNKNOWN", index: '0' },
        { desc: "FLIGHT: ON TIME", index: '10' },
        { desc: "FLIGHT LATE: AIRLINE", index: '20' },
        { desc: "FLIGHT LATE: Due to WEATHER", index: '30' },
        { desc: "FLIGHT LATE: Due to TECHNICAL Issues", index: '40' },
        { desc: "FLIGHT LATE: OTHER Reason", index: '50' }];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];
            this.firstAirline = accts[1];

            let counter = 2;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.accounts = accts;

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    async registerOracles(callback) {
        let self = this;

        // ACT
        let oracleError;
        for (let a = 1; a < this.testOraclesCount; a++) {
            let regResult, indexResult;
            await self.flightSuretyApp.methods.registerOracle()
                .send({ from: self.owner, value: this.feeWei, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                    //console.log(error, result)
                    oracleError = error;
                    regResult = result;
                });
            //console.log(`Oracle first Registered: ${regResult[0]}, ${regResult[1]}, ${regResult[2]}`);

            await self.flightSuretyApp.methods.getMyIndexes()
                .call({ from: self.owner, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                    //console.log(error, result)
                    oracleError = error;
                    indexResult = result;
                });

            //console.log(indexResult);
            //console.log(`Oracle Registered: ${indexResult[0]}, ${indexResult[1]}, ${indexResult[2]}`);
            this.oracles.push(indexResult[0], indexResult[1], indexResult[2]);
        }
        callback(oracleError, this.oracles);
    }

    async registerNewAirline(name, address, callback) {

        let self = this;

        await self.flightSuretyApp.methods
            .registerAirline(address, name)
            .send({ from: self.firstAirline, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                if (error) {
                    callback(error);
                } else {
                    callback("SUCCESS - " + result);
                    return result;
                }
            });

        await self.flightSuretyApp.methods.getAirlineIsRegistered(address)
            .call({ from: self.owner, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log((result ? "SUCCESS - Is registered " : "SUCCESS - Is NOT registered "));
                }
            });

    }

    fundNewAirline(name, address, callback) {
        let self = this;
        let payload = {
            name: name,
            addr: address,
            amount: this.web3.utils.toWei("10", "ether"),
        }

        self.flightSuretyApp.methods
            .payFunding()
            .send({
                from: payload.addr,
                value: payload.amount,
                "gas": 4712388, "gasPrice": 100000000000
            }, (error, result) => {
                //console.log(error, result)
                callback(error, payload);
            });
    }

    async voteNewAirline(nonRegisteredAirline, registeredAirline, callback) {
        let self = this;
        let payload = {
            registeredAirline: registeredAirline,
            nonRegisteredAirline: nonRegisteredAirline
        }

        await self.flightSuretyApp.methods
            .voteToRegisterAirline(payload.nonRegisteredAirline)
            .send({
                from: payload.registeredAirline,
                "gas": 4712388, "gasPrice": 100000000000
            }, (error, result) => {
                //console.log(error, result)
            });

        await self.flightSuretyApp.methods.getAirlineIsRegistered(nonRegisteredAirline)
            .call({ from: self.firstAirline, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                //console.log(error, result)
                callback(error, result);
            });
    }


    registerFlight(flight, address, callback) {
        let self = this;
        let payload = {
            flight: flight,
            addr: address,
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }

        self.flightSuretyApp.methods
            .registerFlight(payload.addr, payload.flight, payload.timestamp)
            .send({ from: self.firstAirline, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                //console.log(error, result)
                callback(error, payload);
            });
    }

    checkFlightStatus(flight, airline, callback) {
        let self = this;
        let payload = {
            airline: airline, //self.airlines[0],
            flight: flight,
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .checkFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .call({ from: self.owner, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                console.log(error, result)
                callback(error, result);
            });
    }

    buyInsurance(flight, address, passenger, amount, callback) {
        let self = this;
        let payload = {
            flight: flight,
            addr: address,
            passenger: passenger,
            amount: this.web3.utils.toWei(amount.toString(), "ether"),
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }

        //console.log("buyInsurance - Check passenger:", payload.passenger)
        //console.log("this.timestamp", this.timestamp)
        //console.log("registerFlight payload", payload)

        self.flightSuretyApp.methods.buy(payload.addr,
            payload.flight,
            payload.timestamp,
            payload.passenger)
            .send({
                from: payload.passenger,
                value: payload.amount,
                "gas": 4712388,
                "gasPrice": 100000000000
            }, (error, result) => {
                //console.log(error, result)
                callback(error, payload);
            });
    }

    async fetchFlightStatus(flight, airline, callback) {
        let self = this;
        let payload = {
            airline: airline, //self.airlines[0],
            flight: flight,
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }
        await self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                //console.log(error, result)
                //callback(error, payload);
            });

        self.flightSuretyApp.methods
            .checkFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .call({ from: self.owner, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
               
                self.statusCodeArray.forEach((status, index) => {

                    console.log("statusCodeArray status : " + JSON.stringify(status) + " index: " + index);

                });
                
                console.log("checkFlightStatus result : " + result);

                const statusInfo = self.statusCodeArray.find(code => code.index === result);
                const flightStatus = { flight: payload.flight, status: statusInfo.desc }
                callback(error, flightStatus);
            });
    }

    async checkFlightInsurance(flight, address, passenger, callback) {
        let self = this;
        let payload = {
            addr: address, //self.airlines[0],
            flight: flight,
            passenger: passenger,
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }

        self.flightSuretyApp.methods
            .claimInsurance(payload.addr,
                payload.flight,
                payload.timestamp)
            .call({ from: self.owner, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                //console.log(error, result);
                const statusInfo = self.statusCodeArray.find(code => code.index === result);
                let flightStatus
                if (result >= 20) {
                    flightStatus = "YES --- " + statusInfo.desc;
                } else {
                    flightStatus = "NO --- " + statusInfo.desc;
                }
                callback(error, flightStatus);
            });
    }


    async checkForCredits(flight, address, passenger, callback) {
        let self = this;
        let payload = {
            addr: address, //self.airlines[0],
            flight: flight,
            passenger: passenger,
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }
        //console.log("checkForCredits - Check passenger:", payload)

        self.flightSuretyApp.methods
            .getInsuranceCredits(payload.addr,
                payload.flight,
                payload.timestamp,
                payload.passenger)
            .call({ from: self.owner, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                //console.log(error, result);
                let weiToEther = this.web3.utils.fromWei(result, "ether");
                let flightStatus
                if (result >= 20) {
                    flightStatus = "YES, you have this amount:" + weiToEther;
                } else {
                    flightStatus = "NO --- " + result;
                }
                callback(error, flightStatus);
            });
    }

    async withdrawCredits(flight, address, passenger, callback) {
        let self = this;
        let payload = {
            addr: address, //self.airlines[0],
            flight: flight,
            passenger: passenger,
            timestamp: this.timestamp //Math.floor(Date.now() / 1000)
        }
        //console.log("withdrawCredits - Check passenger:", payload)

        self.flightSuretyApp.methods
            .withdrawInsuranceCredits(payload.addr,
                payload.flight,
                payload.timestamp,
                payload.passenger)
            .send({ from: payload.passenger, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                //console.log(error, result);
                let flightStatus
                if (result >= 20) {
                    flightStatus = "YES, you have this amount:" + result;
                } else {
                    flightStatus = "NO --- " + result;
                }
                callback(error, flightStatus);
            });
    }

    async getAirlineIsRegistered(address, callback) {

        let self = this;

        await self.flightSuretyApp.methods.getAirlineIsRegistered(address)
            .call({ from: self.firstAirline, "gas": 4712388, "gasPrice": 100000000000 }, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    callback(error, result);
                }

            });

    }

}

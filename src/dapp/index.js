
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

//Set blank array for flights
const flightsArray = [];

//Set array for destinations
const destinationsArray = ["DFW", "LAX", "DAL", "LAS", "BWI", "MEM", "DTW", "ATL", "ORD", "HNL", "RNO", "SEA", "JFK"];

(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            //console.log(error,result);
            display('display-wrapper', 'Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        });

        // User-submitted transaction
        /*
                DOM.elid('register-oracles').addEventListener('click', () => {
                    // Write transaction
                    contract.registerOracles( (error, result) => {
                        display('display-wrapper','Oracles', 'register oracles', [ { label: 'Fetch Flight Status', error: error, value: result + ' ' + result.timestamp} ]);
                    });
                })
        */

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flightNumber = DOM.elid('flights-oracle').value;
            const flight = flightsArray[flightNumber];
            // Write transaction

            contract.fetchFlightStatus(flightNumber, flight.address, (error, result) => {
                display('display-wrapper', 'Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.status }]);
            });
        })


        //AIRLINE CREATION SECTION
        //
        // Create Airline Submittal

        const select = DOM.elid('airline-address');
        contract.airlines.forEach((item, index) => {
            const option = DOM.option();
            option.text = item, option.value = item;
            select.add(option);
            console.log("airline-address option : " + option.text);
        })

        DOM.elid('submit-airline').addEventListener('click', () => {
            let airlineName = DOM.elid('airline-name').value;
            let airlineAddress = DOM.elid('airline-address').value;
            // Write transaction
            contract.registerNewAirline(airlineName, airlineAddress, (error, result) => {
                display('register-wrapper', 'New Airline', 'Created Airline', [{ label: 'RESULT:', error: error, value: result }]);
                updateAirlinesCount();
            });
        })

        DOM.elid('vote-airline').addEventListener('click', () => {
            let voteAddressSelect = DOM.elid('vote-address');
            let registeredAddressSelect = DOM.elid('registered-address');
            let voteAddress = voteAddressSelect.value;
            let registeredAddress = registeredAddressSelect.value;
            let airlineName = voteAddressSelect.options[voteAddressSelect.selectedIndex].text;
            // Write transaction
            contract.voteNewAirline(voteAddress, registeredAddress, (error, result) => {
                if (result) {
                    const option = DOM.option();
                    option.text = airlineName, option.value = voteAddress;
                    registeredAddressSelect.add(option);
                    voteAddressSelect.remove(voteAddressSelect.selectedIndex);
                }

                display('register-wrapper', 'New Airline', 'Vote Airline', [{ label: 'RESULT:', error: error, value: result }]);
            });
        })

        DOM.elid('fund-airline').addEventListener('click', () => {
            let airlineRegistered = DOM.elid('registered-address');
            let airlineAddress = airlineRegistered.value;
            let airlineName = airlineRegistered.options[airlineRegistered.selectedIndex].text;
            //console.log("airlineAddress", airlineAddress)
            //console.log("airlineName", airlineName)
            // Write transaction
            contract.fundNewAirline(airlineName, airlineAddress, (error, result) => {
                //Generate the array for info
                generateRandomFlightsByAirline(airlineName, airlineAddress);
                display('register-wrapper', 'New Airline', 'Funded Airline', [{ label: 'RESULT:', error: error, value: result.name }]);
            });
        })



        // User-submitted transaction
        /*
                DOM.elid('status-flight').addEventListener('click', () => {
                    let flightNumber = DOM.elid('flights-oracle').value;
                    const flight = flightsArray[flightNumber];
                    // Write transaction
        
                    contract.checkFlightStatus(flightNumber, flight.address, (error, result) => {
                        display('display-wrapper','Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
                    });
                })
        */


        //AIRLINE CREATION SECTION
        // onselect flight numbers for insurance
        DOM.elid('flights').addEventListener('change', () => {
            let flightNumber = DOM.elid('flights').value;
            const flight = flightsArray[flightNumber];
            DOM.elid('insurance-airline').value = flight.airline;
            DOM.elid('insurance-date').value = flight.date;
            DOM.elid('insurance-departure').value = flight.departure;
            DOM.elid('insurance-destination').value = flight.destination;
            DOM.elid('insurance-flightnumber').value = flightNumber;
        })

        // User-submitted transaction
        DOM.elid('submit-flight').addEventListener('click', () => {
            let flightNumber = DOM.elid('flights').value;
            const flight = flightsArray[flightNumber];
            // Write transaction
            contract.registerFlight(flightNumber, flight.address, (error, result) => {
                //console.log("registerFlight", result)
                display('insurance-wrapper', 'Flight Register', 'Registered', [{ label: 'RESULT:', error: error, value: result.flight }]);
            });
        })



        // Passenger Select
        DOM.elid('passengers').addEventListener('click', () => {
            const select = DOM.elid('passengers');
            const selectClaim = DOM.elid('claim-passengers');
            contract.passengers.forEach((item, index) => {
                //console.log(`${index} : ${item}`);
                const option = DOM.option();
                option.text = item, option.value = item;
                select.add(option);

                //add for passengers as well
                const optionAgain = DOM.option();
                optionAgain.text = item, optionAgain.value = item;
                selectClaim.add(optionAgain);
            });
        })

        // Create Airline Submittal
        DOM.elid('submit-insurance').addEventListener('click', () => {
            let passenger = DOM.elid('passengers').value;
            let flightNumber = DOM.elid('flights').value;
            let insuranceEther = DOM.elid('insurance-ether').value;
            const flight = flightsArray[flightNumber];
            const etherAmount = parseFloat(insuranceEther);
            if (etherAmount > 0 && etherAmount <= 1.0 && passenger != "") {
                contract.buyInsurance(flightNumber, flight.address, passenger, etherAmount, (error, result) => {
                    display('insurance-wrapper', 'Flight Insurance', 'Purchased', [{ label: 'RESULT:', error: error, value: result.flight }]);
                });
            } else {
                display('insurance-wrapper', 'Ether Amount', 'Must be less than or equal to 1 ether', [{ label: 'Ether:', error: etherAmount, value: etherAmount }]);
            }
        })


        // onselect flight numbers for claim
        DOM.elid('flights-claim').addEventListener('change', () => {
            let flightNumber = DOM.elid('flights-claim').value;
            const flight = flightsArray[flightNumber];
            DOM.elid('claim-airline').value = flight.airline;
            DOM.elid('claim-date').value = flight.date;
            DOM.elid('claim-departure').value = flight.departure;
            DOM.elid('claim-destination').value = flight.destination;
            DOM.elid('claim-flightnumber').value = flightNumber;
        })


        // Create Airline Submittal
        DOM.elid('submit-claim').addEventListener('click', () => {
            let passenger = DOM.elid('passengers').value;
            let flightNumber = DOM.elid('claim-flightnumber').value;
            const flight = flightsArray[flightNumber];
            contract.checkFlightInsurance(flightNumber, flight.address, passenger, (error, result) => {
                display('claim-wrapper', 'Flight Insurance', 'Available?', [{ label: 'RESULT:', error: error, value: result }]);
            });
        })


        // Create Check for credits
        DOM.elid('submit-credits').addEventListener('click', () => {
            let passenger = DOM.elid('claim-passengers').value;
            let flightNumber = DOM.elid('claim-flightnumber').value;
            const flight = flightsArray[flightNumber];
            contract.checkForCredits(flightNumber, flight.address, passenger, (error, result) => {
                display('claim-wrapper', 'Flight Insurance Credits', 'Available?', [{ label: 'RESULT:', error: error, value: result }]);
            });
        })

        // Create Check for credits
        DOM.elid('submit-withdraw').addEventListener('click', () => {
            let passenger = DOM.elid('claim-passengers').value;
            let flightNumber = DOM.elid('claim-flightnumber').value;
            const flight = flightsArray[flightNumber];
            contract.withdrawCredits(flightNumber, flight.address, passenger, (error, result) => {
                display('claim-wrapper', 'Flight Insurance Credits', 'Available?', [{ label: 'RESULT:', error: error, value: result }]);
            });
        })

        DOM.elid('update-airlines-registered').addEventListener('click', () => {
            let voteAddressSelect = DOM.elid('vote-address');
            let registeredAddressSelect = DOM.elid('registered-address');

            var i1, L1 = voteAddressSelect.options.length - 1;
            for(i1 = L1; i1 >= 0; i1--) {
                voteAddressSelect.remove(i1);
            }

            var i2, L2 = registeredAddressSelect.options.length - 1;
            for(i2 = L2; i2 >= 0; i2--) {
                registeredAddressSelect.remove(i2);
            }

            contract.airlines.forEach((addr, index) => {
                const option = DOM.option();
                option.text = addr, option.value = addr;
                
                console.log("update-airlines-registered addr: " + addr);

                contract.getAirlineIsRegistered(addr, (error, result) => {

                    console.log("update-airlines-registered");
                    console.log(result);

                    if (result != null && !result) {

                        voteAddressSelect.add(option);

                    } else if (result) {

                        registeredAddressSelect.add(option);

                    }

                });

            })

        })

    });

    function updateAirlinesCount () {
        let airlinesCountLabel = DOM.elid('airlines-count');
        contract.getAirlinesCount((error, result) => {
          
            if (error) {

                console.log("error");

            } else {

                airlinesCountLabel.textContent = "Airlines Count: " + result;
                console.log("Airlines Count: " + result);

            }
        
        });

    }

})();

//Standard functions
function display(divName, title, description, results) {
    let displayDiv = DOM.elid(divName);
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function generateRandomFlightsByAirline(name, address) {
    const flightsSelect = DOM.elid("flights");
    const flightsOracleSelect = DOM.elid("flights-oracle");
    const flightsClaimSelect = DOM.elid("flights-claim");
    let flights = [];

    //Loop and create 3 flights for each airline
    for (let i = 0; i < 3; i++) {
        const number = getRndFlightInteger(1001, 9999);
        const flightNumber = name.substring(0, 2).toUpperCase() + number;

        const randomDestination = Math.floor(Math.random() * destinationsArray.length);
        const departure = destinationsArray[randomDestination];

        const randomDeparture = randomDestination === destinationsArray.length - 1 ? 0 : randomDestination + 1;
        const destination = destinationsArray[randomDeparture];

        const randomHour = Math.floor(Math.random() * 12);

        flights = {
            airline: name,
            flightNumber: number,
            departure: departure,
            destination: destination,
            address: address,
            date: shortDateTimeCompact(randomHour)
        };

        //set to top array
        flightsArray[flightNumber] = flights;

        //Set options for select
        const option = DOM.option();
        option.text = flightNumber, option.value = flightNumber;

        //Clone-ish each option
        const optionClone = DOM.option();
        optionClone.text = flightNumber, option.value = flightNumber;

        const optionCloneAgain = DOM.option();
        optionCloneAgain.text = flightNumber, option.value = flightNumber;

        //add to select dom objects
        flightsOracleSelect.add(optionClone);
        flightsClaimSelect.add(optionCloneAgain);
        flightsSelect.add(option);
    }

    //console.log("flightsArray",flightsArray);
}


function getRndFlightInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shortDate() {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, "0");
    let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    let yyyy = today.getFullYear();
    const todayString = mm + "-" + dd + "-" + yyyy;
    return todayString;
}

function shortDateTimeCompact(hourAdjust) {
    let todaySeed = new Date();
    todaySeed.setHours(todaySeed.getHours() - hourAdjust);
    const today = new Date(todaySeed.toLocaleString('en-US', {
        timeZone: 'America/Chicago'
    }));

    const time = today.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    });

    let dd = String(today.getDate()).padStart(2, "0");
    let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    let yyyy = today.getFullYear();
    const todayString = mm + "-" + dd + "-" + yyyy;

    return todayString + "-" + time;
}








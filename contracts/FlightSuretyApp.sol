//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/utils/Strings.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    FlightSuretyData private flightSuretyData;
    address flightSuretyDataContractAddress; // May not need

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20; //payment proceess gets triggered here
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address[] multiCalls = new address[](0);

    // Airline join Ether fee
    uint8 private constant JOIN_FEE = 10;

    address private contractOwner; // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    //fired when an Airline votes
    event VoteForAirline(address airline, address newAirline);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(true, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the "Sender" account to be an existing Airline
     */
    modifier requireExistingAirline() {
        require(
            flightSuretyData.isAirline(msg.sender),
            "Caller is not existing Airline"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContract) {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
        flightSuretyDataContractAddress = dataContract;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public pure returns (bool) {
        return true; // Modify to call data contract's status
    }

    /**
     * @dev Test function to make sure everything is working
     *
     */
    function getAirlineCount() public view returns (uint256) {
        return flightSuretyData.getAirlinesCount();
    }

    /**
     * @dev Test function to make sure everything is working
     *
     */
    function getAirlineIsRegistered(address airline)
        public
        view
        returns (bool)
    {
        return flightSuretyData.isAirlineRegistered(airline);
    }

    /**
     * @dev Test function to return an airline by its index
     *
     */
    function getAirlineByIndex(uint256 index) public view returns (address) {
        return flightSuretyData.getAirlineByIndex(index);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address addr, string memory name)
        external
        requireIsOperational
        returns (bool)
    {
        //check to fine the count of airlines for voting
        uint256 airlineCount = flightSuretyData.getAirlinesCount();

        bool isRegistered = false;
        if (airlineCount < 5) {
            require(
                flightSuretyData.isAirline(msg.sender),
                "Airline that registers needs to exist already"
            );
            isRegistered = true;
        }

        //add the airline
        flightSuretyData.registerAirline(addr, name, isRegistered);

        return isRegistered;
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function voteToRegisterAirline(address addr)
        external
        requireIsOperational
        returns (bool success, uint256 votes)
    {
        //check if sender is airline
        require(
            flightSuretyData.isAirline(msg.sender),
            "Only Existing airlines can vote"
        );

        //get count
        uint256 airlineCount = flightSuretyData.getAirlinesCount();

        bool isRegistered = false;
        bool isDuplicate = false;

        //check to make sure same airline doesnt vote twice
        for (uint256 c = 0; c < multiCalls.length; c++) {
            if (multiCalls[c] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }

        require(!isDuplicate, "Caller has already called this function.");

        multiCalls.push(msg.sender);
        if (multiCalls.length >= (airlineCount / 2)) {
            isRegistered = true;
            multiCalls = new address[](0);
        }

        //Only update contract if passes minimum
        if (isRegistered) {
            flightSuretyData.updateAirlineIsRegistered(addr, isRegistered);
        }

        //emit event
        emit VoteForAirline(addr, msg.sender);

        return (isRegistered, airlineCount);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(
        address addr,
        string memory flight,
        uint256 timestamp
    ) external requireIsOperational {
        //Default status and flight
        Flight memory newFlightToRegister = Flight(
            true,
            STATUS_CODE_UNKNOWN,
            timestamp,
            addr
        );

        //get key for mapping
        bytes32 airLineKey = getFlightKey(addr, flight, Strings.toString(timestamp));
        flights[airLineKey] = newFlightToRegister;
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function checkFlightStatus(
        address addr,
        string memory flight,
        uint256 timestamp
    ) external view returns (uint8) {
        bytes32 airLineKey = getFlightKey(addr, flight, Strings.toString(timestamp));
        require(
            flights[airLineKey].isRegistered,
            "Only Registered Flights can be checked"
        );

        return flights[airLineKey].statusCode;
    }

    /**
     * @dev Buy insurance for an flight
     *
     */
    function buy(
        address addr,
        string memory flight,
        uint256 timestamp,
        address passenger
    ) external payable {
        //verify min & maximum
        require(
            msg.value > 0 ether,
            "Need to pay more than 0 Ether for be be passenger"
        );
        require(
            msg.value <= 1 ether,
            "Need to pay max 1 Ether for be be passenger"
        );

        //build key from paramaters
        bytes32 airLineKey = getFlightKey(addr, flight, Strings.toString(timestamp));
        Flight memory flightToInsure = flights[airLineKey];

        //Next to require tests
        require(
            flightToInsure.isRegistered,
            "Flight must be registered to buy insurance for it."
        );
        require(
            flightToInsure.statusCode < STATUS_CODE_ON_TIME,
            "Flight has already arrived, you can't purchase now!"
        );

        //buy that insurance from the data contract
        flightSuretyData.buy{value: msg.value}(airLineKey, passenger);
    }

    /**
     * @dev check if  insurance is available for an flight
     *
     */
    function claimInsurance(
        address addr,
        string memory flight,
        uint256 timestamp
    ) external view returns (uint8) {
        //build key from paramaters
        bytes32 airLineKey = getFlightKey(addr, flight, Strings.toString(timestamp));
        Flight memory flightToCheck = flights[airLineKey];

        //Next to require tests
        require(
            flightToCheck.isRegistered,
            "Flight must be registered to check on status for it."
        );
        require(
            flightToCheck.statusCode != STATUS_CODE_ON_TIME,
            "Flight is still on time!"
        );

        return flightToCheck.statusCode;
    }

    /**
     * @dev check if  insurance is available for an flight
     *
     */
    function getInsuranceCredits(
        address addr,
        string memory flight,
        string memory timestamp,
        address passenger
    ) external view returns (uint256) {
        //build key from paramaters
        bytes32 airLineKey = getFlightKey(addr, flight, timestamp);
        Flight memory flightToCheck = flights[airLineKey];

        //Next to require tests
        require(
            flightToCheck.isRegistered,
            "Flight must be registered to check on status for it."
        );
        require(
            flightToCheck.statusCode > STATUS_CODE_ON_TIME,
            "Flight is still on time!"
        );

        //get amount from data contract
        uint256 credit = flightSuretyData.creditInsureeAmount(
            airLineKey,
            passenger
        );
        credit = credit.add(credit.div(2));
        return credit;
    }

    /**
     * @dev check if  insurance is available for an flight
     *
     */
    function withdrawInsuranceCredits(
        address addr,
        string memory flight,
        uint256 timestamp,
        address passenger
    ) external requireIsOperational returns (bool) {
        //build key from paramaters
        bytes32 airLineKey = getFlightKey(addr, flight, Strings.toString(timestamp));
        Flight memory flightToCheck = flights[airLineKey];

        //Next to require tests
        require(
            flightToCheck.isRegistered,
            "Flight must be registered to check on status for it."
        );
        require(
            flightToCheck.statusCode > STATUS_CODE_ON_TIME,
            "Flight is still on time!"
        );

        flightSuretyData.creditInsurees(airLineKey, passenger);

        //if all requires pass then true
        return true;
    }

    /**
     * @dev Pay Funding for an airline
     *
     */
    function payFunding()
        external
        payable
        requireIsOperational
        requireExistingAirline
    {
        //verify at least 10
        require(
            msg.value >= 10 ether,
            "Need to fund at least 10 Ether for be be participant"
        );

        //send funding to data contract
        flightSuretyData.fundAirline{value: msg.value}(msg.sender);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    //Important function... intended to be triggered when oracle comes
    //back as status code is delayed, or 20
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal {
        bytes32 airLineKey = getFlightKey(airline, flight, Strings.toString(timestamp));
        flights[airLineKey].statusCode = statusCode;
    }

    // Generate a request for oracles to fetch flight information
    //call from button on UI
    function fetchFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );

        oracleResponses[key].requester = msg.sender;
        oracleResponses[key].isOpen = true;

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        string memory timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }
}

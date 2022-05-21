//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    struct Insured {
        address addr;
        uint256 insuredAmount;
        bool isPayed;
    }

    struct Airline {
        address addr;
        string name;
        uint256 etherAmount;
        bool isRegistered;
        bool isFunded;
    }

    address[] private airlines;
    uint256 private totalApprovedAirlines = 0;

    //list of authorized callers
    address[] private authorizedCallers;

    //mapping for all the operating airlines
    mapping(address => Airline) private operatingAirlines;

    //Not used now
    mapping(address => uint256) balanceOf;

    //mapping to store all flight insurees
    mapping(bytes32 => Insured[]) private flightInsurees;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    //fired when an Airline registers
    event RegisterAirline(address airline, string name);

    //fires when a passenger buys insurance
    event BuyFlightInsurance(bytes32 flight, address insuree);

    //Used when insuree withdraws funds
    event InsurancePayout(bytes32 flight, address insuree);

    //used when airline is funded
    event FundAirline(address airline);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address firstAirline) {
        contractOwner = msg.sender;

        // Initialize first airline
        Airline memory newAirline = Airline(
            firstAirline,
            "EAA AIRLINES",
            0,
            true,
            false
        );
        airlines.push(firstAirline);
        operatingAirlines[firstAirline] = newAirline;
        totalApprovedAirlines += 1;
    }

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
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(
        address addr,
        string memory name,
        bool register
    ) external requireIsOperational {
        //Hash the components to store for mapping
        //bytes32 hashedAirline = keccak256(abi.encodePacked(index, addr, name));

        Airline memory newAirline = Airline(addr, name, 0, register, false);
        airlines.push(addr);
        if (register) {
            totalApprovedAirlines++;
        }

        //uint256 balance = balanceOf[address];
        operatingAirlines[addr] = newAirline;

        emit RegisterAirline(addr, name);
    }

    /**
     * @dev Check if Airline exists
     *
     *
     */
    function isAirline(address caller) external view returns (bool) {
        Airline memory existingAirline = operatingAirlines[caller];
        return existingAirline.addr != address(0);
    }

    /**
     * @dev Check if Airline is funded
     *
     *
     */
    function isAirlineFunded(address airline) external view returns (bool) {
        Airline storage fundedAirline = operatingAirlines[airline];
        return fundedAirline.isFunded;
    }

    /**
     * @dev Check if Airline is registered
     *
     */
    function isAirlineRegistered(address airline)
        external
        view
        requireIsOperational
        returns (bool)
    {
        Airline storage fundedAirline = operatingAirlines[airline];
        return fundedAirline.isRegistered;
    }

    /**
     * @dev Get appoved Airlines count
     *
     */
    function getAirlinesCount() external view returns (uint256) {
        return totalApprovedAirlines;
    }

    /**
     * @dev Get Airline by index
     *
     */
    function getAirlineByIndex(uint256 index) external view returns (address) {
        return airlines[index];
    }

    /**
     * @dev Vote for an airline and update registration
     *      only can be called from FlightSuretyApp contract
     *
     */
    function updateAirlineIsRegistered(address addr, bool register)
        external
        requireIsOperational
    {
        Airline memory updateAirline = operatingAirlines[addr];
        updateAirline.isRegistered = register;

        operatingAirlines[addr] = updateAirline;
        if (register) {
            totalApprovedAirlines += 1; //.add(1);
        }
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsureeAmount(bytes32 flight, address passenger)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        Insured[] memory insurees = flightInsurees[flight];
        uint256 payout = 0;
        for (uint256 i = 0; i < insurees.length; i++) {
            if (insurees[i].addr == passenger) {
                payout = insurees[i].insuredAmount;
                break;
            }
        }

        return payout;
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fundAirline(address airline)
        external
        payable
        requireIsOperational
    {
        Airline memory fundedAirline = operatingAirlines[airline];
        require(
            fundedAirline.isRegistered,
            "Airline can only be funded if it is registered first"
        );

        operatingAirlines[airline].etherAmount = fundedAirline.etherAmount.add(
            msg.value
        );
        operatingAirlines[airline].isFunded = true;
        operatingAirlines[airline].isRegistered = true;

        emit FundAirline(airline);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(bytes32 flight, address insuree)
        external
        payable
        requireIsOperational
    {
        bool isAlreadyInsuree = false;
        uint256 newInsuredValue = msg.value;

        Insured[] memory insurees = flightInsurees[flight];
        for (uint256 i = 0; i < insurees.length; i++) {
            if (insurees[i].addr == insuree) {
                isAlreadyInsuree = true;
                //require(contractOwner.balance > amountToPay, "Contract does not have enough payout.");
                uint256 totalValue = insurees[i].insuredAmount.add(
                    newInsuredValue
                );

                if (totalValue > 1) {
                    uint256 returnOverageValue = totalValue.sub(1);
                    insurees[i].insuredAmount = totalValue;

                    payable(insuree).transfer(returnOverageValue);
                }
                break;
            }
        }

        if (!isAlreadyInsuree) {
            Insured memory newInsuree = Insured(
                insuree,
                newInsuredValue,
                false
            );
            flightInsurees[flight].push(newInsuree);
        }

        emit BuyFlightInsurance(flight, insuree);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 flight, address passenger)
        external
        requireIsOperational
    {
        Insured[] memory insurees = flightInsurees[flight];

        for (uint256 i = 0; i < insurees.length; i++) {
            if (insurees[i].addr == passenger) {
                require(!insurees[i].isPayed, "Caller has already been payed.");
                require(
                    insurees[i].insuredAmount > 0,
                    "There is no Insured Amount."
                );
                flightInsurees[flight][i].isPayed = true;
                pay(insurees[i].insuredAmount, passenger);
                flightInsurees[flight][i].insuredAmount = 0;
                emit InsurancePayout(flight, passenger);
                break;
            }
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(uint256 requiredEther, address passenger)
        public
        payable
        requireIsOperational
    {
        uint256 amountToPay = requiredEther.add(requiredEther.div(2));

        require(
            contractOwner.balance > amountToPay,
            "Contract does not have enough payout."
        );

        (bool success, ) = passenger.call{value: amountToPay}("");
        require(success, "Insurance transfer to passenger failed");
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airline) external payable requireIsOperational {
        Airline memory fundedAirline = operatingAirlines[airline];
        require(
            fundedAirline.isRegistered,
            "Airline can only be funded if it is registered first"
        );
        //require(msg.value >= 12 ether, "Need to fund at least 10 Ether for be be participant");
        operatingAirlines[airline].etherAmount = fundedAirline.etherAmount.add(
            msg.value
        );
        operatingAirlines[airline].isFunded = true;
        operatingAirlines[airline].isRegistered = true;
        /*if(msg.value >= 10 ether){
            operatingAirlines[airline].isFunded;
        }*/

        emit FundAirline(airline);
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

}

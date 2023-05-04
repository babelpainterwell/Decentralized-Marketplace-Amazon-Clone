// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

error Dappazon__OnlyOwner();

contract Dappazon {
    address public owner;

    struct Item {
        uint256 id;
        string name;
        string category;
        string image;
        uint256 cost;
        uint256 rating;
        uint256 stock;
    }

    struct Order {
        uint256 time;
        Item item;
    }

    event newList(string name, uint256 cost, uint256 stock);
    event buyEvent(address buyer, uint256 orderId, uint256 itemId);

    mapping(uint256 => Item) public items;
    mapping(address => uint256) public orderCountHistory;
    // uint256 refers to the quantity of each individual product
    mapping(address => mapping(uint256 => Order)) public orderTracker;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function list(
        uint256 _id,
        string memory _name,
        string memory _category,
        string memory _image,
        uint256 _cost,
        uint256 _rating,
        uint256 _stock
    ) public {
        if (msg.sender != owner) {
            revert Dappazon__OnlyOwner();
        }
        // note the new struct object, should be stored in memory
        Item memory item = Item(
            _id,
            _name,
            _category,
            _image,
            _cost,
            _rating,
            _stock
        );
        items[_id] = item;
        emit newList(_name, _cost, _stock);
    }

    function buy(uint256 _id) public payable {
        Item memory item = items[_id];

        // require enough ether to buy
        require(msg.value >= item.cost);
        // require stock greater than 0
        require(item.stock > 0);

        Order memory newOrder = Order(block.timestamp, item);

        // save order for chain
        orderCountHistory[msg.sender]++; // <-- order #1, order #2 etc...
        orderTracker[msg.sender][orderCountHistory[msg.sender]] = newOrder;

        // subtract stock

        //item.stock--;
        items[_id].stock--;

        // Emit event
        emit buyEvent(msg.sender, orderCountHistory[msg.sender], _id);
    }

    function withdraw() public payable {
        if (msg.sender != owner) {
            revert Dappazon__OnlyOwner();
        }
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success);
    }
}

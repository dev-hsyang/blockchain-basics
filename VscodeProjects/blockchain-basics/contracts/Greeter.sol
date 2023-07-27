//SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "hardhat/console.sol";

contract Greeter {
    address private _owner;

    string private _greeting;
    bool private _callSetGreeting;
    string[] private _greetingHistory;

    mapping(address => uint256) public balances; // Hashmap과 비슷. 어떤 주소가 얼만큼 주었는지 담겨있다.

    event SetGreeting(address sender, string oldGreeting, string newGreeting); // BLOCK CHAIN에 담기는 값

    constructor(string memory greeting_) {
        console.log("Deploying a Greeter with greeting:", greeting_);

        /**
            msg : solidity에서 기본적으로 설정되어있는 전역 변수 (객체)
            msg.sender : 이 함수(여기서는 생성자)를 호출한 계정
            컨트랙트를 배포할때 생성자가 실행되기 때문에, 배포하는 개발자의 주소가 여기서 반환된다.
         */
        _setGreetingPrivate(msg.sender, greeting_);
        _owner = msg.sender;
    }

    /**
        payable : klaytn 기준으로, 
        klaytn을 핸들링할 수 있는 코드.
        함수에서 klaytn코인을 보내거나, 받는 기능을 구현하려면 payable을 명시해줘야한다.
     */
    function setGreetingPayable(string memory greeting_) public payable {
        // require : 괄호 안의 반환값이 참이어야 실행이된다.
        require(msg.value == 0.1 ether, "msg.value is not 0.1 ether");

        // sender: 이 함수 호출한 사람. 누가 얼마나 payable 했는지 balances에 저장한다.
        // 즉 이 contract의 주인에게 어떤 sender가 얼만큼 payable했는지에 대한 기록이다.
        balances[msg.sender] += msg.value;

        _setGreetingPrivate(msg.sender, greeting_);
    }

    function withdraw(address to) public payable {
        require(_owner == msg.sender, "only owner");

        address thisAddress = address(this);
        console.log("contract balance: %d", thisAddress.balance);
        bool result = payable(to).send(thisAddress.balance);
        require(result, "Failed to send Ether");
    }

    function setGreeting(string memory greeting_) public {
        _setGreetingPrivate(msg.sender, greeting_);
    }

    function getGreet() public view returns (string memory) {
        return _greeting;
    }

    function getGreetingHistoryCount() public view returns (uint256) {
        return _greetingHistory.length;
    }

    function getGreetingHistoryAll() public view returns (string[] memory) {
        return _greetingHistory;
    }

    function getGreetingHistoryOne(uint256 index) public view returns (string memory) {
        return _greetingHistory[index];
    }

    function _setGreetingPrivate(address sender, string memory greeting_) private {
        console.log("Changing greeting from '%s' to '%s'", _greeting, greeting_);

        if (_callSetGreeting == false) {
            _callSetGreeting = true;
        }

        string[] storage greetingHistory = _getGreetingHistory();
        greetingHistory.push(_greeting); // 변경 이전의 msg를 History[]에 추가한다.

        // event 생성
        emit SetGreeting(sender, _greeting, greeting_);

        _greeting = greeting_;
    }

    function _getGreetingHistory() private view returns (string[] storage) {
        return _greetingHistory;
    }
}

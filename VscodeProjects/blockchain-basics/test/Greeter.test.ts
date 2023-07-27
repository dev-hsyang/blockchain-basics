import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import GreeterArtifact from '../artifacts/contracts/Greeter.sol/Greeter.json';
import { Greeter } from '../typechain';

describe('Greeter', () => {
  let greeter: Greeter; // contract를 배포하고, 배포된 contract를 담을 변수
  const initMsg = 'hello blockchain!!!'; // 배포할때 넣을 메세지

  // hardhat 네트워크에 자동으로 만들어지는 계정들.
  const [admin, other0, other1, other2, receiver] =
    waffle.provider.getWallets();

  before(async () => {});

  beforeEach(async () => {
    // 매 test를 독립화하기 위해, 매 test 실행 전에 배포를 진행한다.
    greeter = (await waffle.deployContract(admin, GreeterArtifact, [
      initMsg,
    ])) as Greeter;
  });

  /*
   * Greeter.sol의 constructor 기능 확인.
   * beforeEach에서 배포는 되었기에 생성자는 이미 호출되었다.
   * 생성자에서 받은 값이 정상적으로 담아졌는지 확인.
   */
  it('constructor', async () => {
    const greetMsg = await greeter.getGreet();
    expect(greetMsg).to.be.equal(initMsg);
  });

  /**
   * Greeter.sol의 setGreeting 함수 기능 확인.
   *
   */
  it('setGreeting', async () => {
    const secondMsg = 'second greeting msg';

    await greeter.setGreeting(secondMsg);
    const recvMsg = await greeter.getGreet();
    expect(recvMsg).to.be.equal(secondMsg);
  });

  /**
   * setGreeting 함수에서 emit 기능 동작 확인
   */
  it('setGreeting with event', async () => {
    const secondMsg = 'second greeting msg';

    const transaction = await greeter.setGreeting(secondMsg);
    const receipt = await transaction.wait();
    // transaction return받을 시 (await 선언된 함수들), 비동기통신을 기다리도록 wait()을 사용해야한다.
    // 단, Unit test에서는 hardhat에서 알아서 await 호출된 함수는 wait을 해주기는 한다.
    // wait()은 transaction이 채굴될때까지 기다린다 라고도 표현한다.

    const event = receipt.events?.filter(x => {
      return x.event == 'SetGreeting';
    })[0];

    expect(event?.args?.sender).to.be.equal(admin.address);
    expect(event?.args?.oldGreeting).to.be.equal(initMsg);
    expect(event?.args?.newGreeting).to.be.equal(secondMsg);

    /**
     * 위 8줄의 코드를 다음과같이 축약해서 작성할 수도 있다.
     */
    const thirdMsg = 'third greeting msg';
    await expect(greeter.setGreeting(thirdMsg))
      .to.emit(greeter, 'SetGreeting')
      .withArgs(admin.address, secondMsg, thirdMsg);
  });

  /**
   * Greeter.sol의 getGreetingHistory관련 기능 함수들의 동작 확인 테스트
   */
  it('getGreetingHistory', async () => {
    const secondMsg = 'second greeting msg';

    const transaction = await greeter.setGreeting(secondMsg);
    const receipt = await transaction.wait();

    const thirdMsg = 'third greeting msg';
    await expect(greeter.setGreeting(thirdMsg))
      .to.emit(greeter, 'SetGreeting')
      .withArgs(admin.address, secondMsg, thirdMsg);

    // setGreeting -> setGreetingPrivate함숭에서 greetingHistory.push로 변경이전 msg를 푸쉬해왔었다.
    // msg를 총 2개 집어넣었기 때문에, History[]의 length는 3이된다.
    const count = await greeter.getGreetingHistoryCount();
    expect(count).to.be.equal(3);

    // History[]에는 생성자에서 initMsg를 초기화하기 이전의 공백값,
    // SecondMsg를 추가했을 때 이전 Msg였던 initMsh 값,
    // thirdMsg를 추가했을 때 이전 Msh였던 secondMsg 값이 저장되어 있을것이다.
    const historyAll = await greeter.getGreetingHistoryAll();
    expect(historyAll.length).to.be.equal(3);
    expect(historyAll[0]).to.be.equal('');
    expect(historyAll[1]).to.be.equal(initMsg);
    expect(historyAll[2]).to.be.equal(secondMsg);

    const secondHistory = await greeter.getGreetingHistoryOne(1);
    expect(secondHistory).to.be.equal(initMsg);

    // 3은 outofindexbound 이기 때문에, reverted가 expect 된다.
    await expect(greeter.getGreetingHistoryOne(3)).to.reverted;
  });

  /**
   * setGreetingPayable 함수의 기능동작 테스트.
   * solidity에서 기본설정되어 있는 전역변수 msg의 value를 설정해주고 테스트 진행한다.
   */
  it('setGreetingPayable', async () => {
    const secondMsg = 'second greeting msg';

    // 다음 두가지 expect테스트는 msg의 value에 값이 없어 revert되어야한다.
    await expect(greeter.setGreetingPayable(secondMsg)).to.reverted;
    await expect(greeter.setGreetingPayable(secondMsg)).to.revertedWith(
      'msg.value is not 0.1 ether', // revertWith을 통해 require에서 실패시 처리문을 expect할수도 있다.
    );

    await expect(
      greeter.setGreetingPayable(secondMsg, {
        value: ethers.utils.parseUnits('0.09', 'ether'), // parseUnits(): ether단위를 wei단위로 바꾸어준다. 즉, 여기선 0.09 * 10^18로 환산된다.
      }),
    ).to.revertedWith('msg.value is not 0.1 ether');

    await expect(
      greeter.setGreetingPayable(secondMsg, {
        value: ethers.utils.parseUnits('0.11', 'ether'), // solidity의 기본전역변수 msg의 value값을 초기화한다.
      }),
    ).to.revertedWith('msg.value is not 0.1 ether');

    await greeter.setGreetingPayable(secondMsg, {
      value: ethers.utils.parseUnits('0.1', 'ether'),
    });

    const recvMsg = await greeter.getGreet();
    expect(recvMsg).to.be.equal(secondMsg);
  });

  /**
   * withdraw 함수의 기능동작 테스트
   */
  it('withdraw', async () => {
    const secondMsg = 'second greeting msg';

    // setGreetingPayable 함수 호출 전의 balance값 가져오고
    const oldContractEther = await waffle.provider.getBalance(greeter.address);

    // 아직 payable이 진행되지 않았기에, 잔고는 0 ether이다.
    expect(oldContractEther).to.be.equal(ethers.utils.parseUnits('0', 'ether'));

    // setGreetingPayable을 네번 호출했기 때문에, 이 contract는 0.4ether를 balance로 가지고 있어야한다.
    await greeter.connect(other0).setGreetingPayable(secondMsg, {
      // admin이 호출하지 않고, 다른계정이 호출하면 어떻게 해야하느냐....????
      value: ethers.utils.parseUnits('0.1', 'ether'),
    });
    await greeter.connect(other0).setGreetingPayable(secondMsg, {
      // admin이 아닌 다른, 여러사람들이 setGreetingPayable을 호출하고 있다.
      value: ethers.utils.parseUnits('0.1', 'ether'),
    });

    await greeter.connect(other1).setGreetingPayable(secondMsg, {
      // 다시말해, other1이 이 함수를 호출해서 이 contract의 주인에게 payable한다.
      value: ethers.utils.parseUnits('0.1', 'ether'),
    });
    await greeter.connect(other2).setGreetingPayable(secondMsg, {
      // 그러니까 admin의 balance에 이 값들이 저장되는것. 보내주는 주체가 other0,1,2
      value: ethers.utils.parseUnits('0.1', 'ether'),
    });

    const newContractEther = await waffle.provider.getBalance(greeter.address);
    expect(newContractEther).to.be.equal(
      ethers.utils.parseUnits('0.4', 'ether'), // setGreetingPayable을 네번 호출했기 때문에, 이 contract는 0.4ether를 balance로 가지고 있어야한다.
    );

    const other0Balance = await greeter.balances(other0.address);
    const other1Balance = await greeter.balances(other1.address);
    const other2Balance = await greeter.balances(other2.address);

    expect(other0Balance).to.be.equal(ethers.utils.parseUnits('0.2', 'ether'));
    expect(other1Balance).to.be.equal(ethers.utils.parseUnits('0.1', 'ether'));
    expect(other2Balance).to.be.equal(ethers.utils.parseUnits('0.1', 'ether'));

    const oldReceiverEther = await waffle.provider.getBalance(receiver.address);

    // contract의 주인이 아닌, other0가 이 contract의 withdraw 함수를 호출하면, require에서 revert된다.
    await expect(
      greeter.connect(other0).withdraw(receiver.address),
    ).to.revertedWith('only owner');

    await greeter.withdraw(receiver.address);
    const newReceiverEther = await waffle.provider.getBalance(receiver.address); // receiver계정에 저장된 ether 잔액들.

    expect(newReceiverEther.sub(oldReceiverEther)).to.be.equal(
      ethers.utils.parseUnits('0.4', 'ether'),
    );

    const lastContractEther = await waffle.provider.getBalance(greeter.address);
    expect(lastContractEther).to.be.equal(
      ethers.utils.parseUnits('0', 'ether'),
    );
  });
});

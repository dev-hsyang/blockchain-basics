import { HardhatUserConfig } from 'hardhat/types';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-waffle';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            // optimizer는 contract 코드의 크기와 실행비용을 줄이기 위해 사용.
            enabled: true,
            runs: 200, // runs의 값은 코드크기와 실행비용을 절충하기 위한 값. 값이 클수록 contract 코드의 크기는 커지고 실행비용은 줄어든다.
          },
        },
      },
    ],
  },
  defaultNetwork: 'hardhat', // hardhat은 테스트시 로컬에서 실행되는 네트워크가 있다. default network(test시)로 hardhat을 사용한단 뜻
  networks: {
    hardhat: {
      accounts: {
        count: 10,
      },
    },
  },
  mocha: {
    // mocha: unit test 실행하는 라이브러리
    timeout: 400000,
  },
};

export default config;

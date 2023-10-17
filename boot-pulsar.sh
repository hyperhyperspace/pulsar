git clone https://github.com/hyperhyperspace/workspace.git;
cd workspace;
git submodule init;
git submodule update;
yarn;
bash ./build-libs.sh;
cd @hyper-hyper-space/pulsar-node;
yarn build;
yarn start --network="butcher fire flag";

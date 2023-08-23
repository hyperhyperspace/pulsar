tar zxvf gmp-6.3.0.tar.xz
mkdir -p gmp-build
mv gmp-6.3.0 gmp-build
cd gmp-build/gmp-6.3.0
./configure --prefix=`pwd`/../../gmp --enable-cxx
make
make check
make install
cd ../..


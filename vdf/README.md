This is an implementation of Pulsar's VDF function (sloth permutation) using C++ (both proof generation & validation).

While this may be useful in the future to provide an in-browser WASM implementation, for the time being we're just benchmarking it against the Typescript version to get a feel of the performance difference vs. native code.

To build, run fetch.sh to get the GNU multiple precision library (or fetch it yourself), then run build-gmp.sh and then build.sh.

That will build a vdf executable. You can tweak the tests in vdf.cpp to benchmark different set ups.

This is, well, extremely expermiental :-)


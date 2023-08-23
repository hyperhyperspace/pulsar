#include <iostream>
#include <vector>
#include <cstdint>
#include <stdexcept>
#include <gmpxx.h>

class SlothPermutation {
public:
static mpz_class p;

static bool sqrt_mod_p_verify(const mpz_class& y, const mpz_class& x, const mpz_class& p);
static mpz_class mod(const mpz_class& x, const mpz_class& y);
static mpz_class fast_pow(const mpz_class& base, const mpz_class& exponent, const mpz_class& modulus);
static bool quad_res(const mpz_class& x);
static mpz_class mod_sqrt_op(const mpz_class& x);
static mpz_class mod_op(const mpz_class& x, unsigned long t);
static bool mod_verif(const mpz_class& y, const mpz_class& x, unsigned long t);
static mpz_class generateProofVDF(unsigned long t, const mpz_class& x);
static bool verifyProofVDF(unsigned long t, const mpz_class& x, const mpz_class& y);
static std::vector<uint8_t> generateBufferProofVDF(unsigned long t, const std::vector<uint8_t>& x, size_t byteLen = 128);
static bool verifyBufferProofVDF(unsigned long t, const std::vector<uint8_t>& x, const std::vector<uint8_t>& y, size_t byteLen = 128);
static mpz_class readBigUIntLE(const std::vector<uint8_t>& buffer, size_t byteLen, size_t offset = 0);
static void writeBigUIntLE(const mpz_class& x, std::vector<uint8_t>& buffer, size_t byteLen, size_t offset = 0);

};

// Define the value of the static member variable ‘p’
mpz_class SlothPermutation::p =
mpz_class("170082004324204494273811327264862981553264701145937538369570764779791492622392118654022654452947093285873855529044371650895045691292912712699015605832276411308653107069798639938826015099738961427172366594187783204437869906954750443653318078358839409699824714551430573905637228307966826784684174483831608534979", 10);

bool SlothPermutation::sqrt_mod_p_verify(const mpz_class& y, const mpz_class& x, const mpz_class& p) {
mpz_class result = (y * y) % p;
return result == x % p;
}

mpz_class SlothPermutation::mod(const mpz_class& x, const mpz_class& y) {
return x % y;
}

mpz_class SlothPermutation::fast_pow(const mpz_class& base, const mpz_class& exponent, const mpz_class& modulus) {

if (modulus == mpz_class(1)) {
    return mpz_class(0);
}

mpz_class result = 1;
mpz_class curr_base = base % modulus;
mpz_class curr_exponent = exponent;

while (curr_exponent > 0) {
    if (curr_exponent % 2 == 1) {
        result = (result * curr_base) % modulus;
    }
    curr_exponent /= 2;
    curr_base = (curr_base * curr_base) % modulus;
}

return result;

}

bool SlothPermutation::quad_res(const mpz_class& x) {
mpz_class exponent = (p - 1) / 2;
return fast_pow(x, exponent, p) == 1;
}

mpz_class SlothPermutation::mod_sqrt_op(const mpz_class& x) {
mpz_class y;
if (quad_res(x)) {
y = fast_pow(x, (p + 1) / 4, p);
} else {
mpz_class neg_x = (-x + p) % p;
y = fast_pow(neg_x, (p + 1) / 4, p);
}
return y;
}

mpz_class SlothPermutation::mod_op(const mpz_class& x, unsigned long t) {
mpz_class curr_x = x % p;
for (unsigned long i = 0; i < t; i++) {
curr_x = mod_sqrt_op(curr_x);
}
return curr_x;
}

bool SlothPermutation::mod_verif(const mpz_class& y, const mpz_class& x, unsigned long t) {
    mpz_class curr_y = y;
    mpz_class curr_x = x % p;

    for (unsigned long i = 0; i < t; i++) {
        curr_y = (curr_y * curr_y) % p;
    }
    if (!quad_res(curr_y)) {
        curr_y = (-curr_y + p) % p;
    }


    return ((curr_x % p) == curr_y) || (((-curr_x + p) % p) == curr_y);
}

/*
bool SlothPermutation::mod_verif(const mpz_class& y, const mpz_class& x, unsigned long t) {
mpz_class curr_y = y;
mpz_class curr_x = x % p;
for (unsigned long i = 0; i < t; i++) {
curr_y = (curr_y * curr_y) % p;
}
if (!quad_res(curr_y)) {
curr_y = (-curr_y + p) % p;
}
return (curr_x == curr_y);
}*/

mpz_class SlothPermutation::generateProofVDF(unsigned long t, const mpz_class& x) {
return mod_op(x, t);
}

bool SlothPermutation::verifyProofVDF(unsigned long t, const mpz_class& x, const mpz_class& y) {
return mod_verif(y, x, t);
}

std::vector<uint8_t> SlothPermutation::generateBufferProofVDF(unsigned long t, const std::vector<uint8_t>& x, size_t byteLen) {
mpz_class x_value = readBigUIntLE(x, byteLen);
mpz_class result = mod_op(x_value, t);
std::vector<uint8_t> ret(byteLen);
writeBigUIntLE(result, ret, byteLen);
return ret;
}

bool SlothPermutation::verifyBufferProofVDF(unsigned long t, const std::vector<uint8_t>& x, const std::vector<uint8_t>& y, size_t byteLen) {
mpz_class x_value = readBigUIntLE(x, byteLen);
mpz_class y_value = readBigUIntLE(y, byteLen);
return mod_verif(y_value, x_value, t);
}

mpz_class SlothPermutation::readBigUIntLE(const std::vector<uint8_t>& buffer, size_t byteLen, size_t offset) {
mpz_class result = 0;
mpz_class base = 1;
for (size_t i = 0; i < byteLen; ++i) {
result += base * buffer[offset + i];
base *= 256;
}
return result;
}

void SlothPermutation::writeBigUIntLE(const mpz_class& x, std::vector<uint8_t>& buffer, size_t byteLen, size_t offset) {
mpz_class curr = x;
for (size_t i = 0; i < byteLen; ++i) {

unsigned long remainder = mpz_get_ui(curr.get_mpz_t()) % 256;
buffer[offset + i] = static_cast<uint8_t>(remainder);
curr /= 256;
}
}

int main() {
unsigned long t = 10000;
mpz_class x = mpz_class("139746230907432984230198472983470128347290127843702", 10);
mpz_class y = SlothPermutation::generateProofVDF(t, x);
/*std::cout << "Proof y: " << y << std::endl;
std::cout << "Verification result: " << SlothPermutation::verifyProofVDF(t, x, y) << std::endl;*/

t = 3000;
x = mpz_class("71765914849860799268786932263535615541274832126876965503741770552280152884843", 10);
y = mpz_class("43274323172862908142913971674919175503479657472980955399600989028572394803909491584470601955024971512846614825766971139534426989950604114155788844719139383086550739440367306264378589278608759987643499967333259349786125553641887048790097790094041247821922073240978856697834151156300149998452569141139256162156", 10);
/*

std::cout << "Challenge: " << x << std::endl;
std::cout << "Proof: " << y << std::endl;

std::cout << "Verification result: " << SlothPermutation::verifyProofVDF(t, x, y) << std::endl;
*/

y = SlothPermutation::generateProofVDF(t, x);

std::cout << "Re-generated proof: " << y << std::endl;
/*
std::cout << "Re-verification result: " << SlothPermutation::verifyProofVDF(t, x, y) << std::endl;
*/

return 0;

}

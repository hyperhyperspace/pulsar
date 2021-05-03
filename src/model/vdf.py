# from https://github.com/ericchenmelt/VDF/blob/master/sloth_vdf.py

import datetime
import time

#p = 73237431696005972674723595250817150843 
p = 64106875808534963770974826322234655855469213855659218736479077548818158667371
vdf_prime = p

def sqrt_mod_p_verify(y, x, p):
    if pow(y, 2) % p == x % p:
        pass #return True
    else:
        return False


def quad_res(x, p):
    return pow(x, (p - 1) // 2, p) == 1


def mod_sqrt_op(x, p):
    if quad_res(x, p):
        y = pow(x, (p + 1) // 4, p)
    else:
        x = (-x) % p
        y = pow(x, (p + 1) // 4, p)
    return y


def mod_op(x, t):  # hash operation on an int with t iternations
    x = x % p
    start = datetime.datetime.now()
    for i in range(t):
        x = mod_sqrt_op(x, p)
    end = datetime.datetime.now()
    return x


def mod_verif(y, x, t):
    start = datetime.datetime.now()
    for i in range(t):
        y = pow(int(y), 2, p)
    if not quad_res(y, p):
        y = (-y) % p
    end = datetime.datetime.now()
    if x % p == y or (-x) % p == y:
        return True
    else:
        return False

def vdf_execute(x,t):
    return mod_op(x,t)

def vdf_verify(y,x,t):
    return mod_verif(y,x,t)

if __name__ == '__main__':

    print ('started')
    x = 24106875808534963550974826322234633855469213855649218736479077548818158667371 #808080818080808080818080
    x = x % (p)
    t = 20000
    start = time.time()
    y = mod_op(x, t)
    end = time.time()
    print('Proof VDF: ', y)
    print('Elapsed: ',format(end - start,'.3f'))
    start = time.time()
    print(mod_verif(y, x, t), '****')
    end=time.time()
    print ('Verify Elapsed: ',format(end - start,'.3f'))

    

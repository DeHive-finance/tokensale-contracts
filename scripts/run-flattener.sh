FLAT_DIR="./flatten"
OZ_DIR="@openzeppelin"
OZ_NODE_DIR="./node_modules/@openzeppelin"

if  [ ! -d $FLAT_DIR ]; then mkdir $FLAT_DIR; fi

if  [ ! -d $OZ_DIR ]; then ln -sf $OZ_NODE_DIR $OZ_DIR; fi 

npx truffle-flattener ./contracts/DeHiveTokensale.sol >$FLAT_DIR/DeHiveTokensale.sol
npx truffle-flattener ./contracts/DHVToken.sol >$FLAT_DIR/DHVToken.sol

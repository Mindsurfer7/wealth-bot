const { OPERATION_CATEGORY_MAP } = require('../consts/consts');

const getTxTypeName = (string) => {
  return OPERATION_CATEGORY_MAP[string];
};

module.exports = getTxTypeName;

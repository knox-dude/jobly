const { BadRequestError } = require("../expressError");


/**
 * Creates a SQL statement for a partial update based on the given data and a mapping of column names to their respective SQL names.
 * @param {Object} dataToUpdate - The data to update in the form of key-value pairs.
 * @param {Object} jsToSql - A mapping of column names in Javascript to their respective SQL names.
 * @returns {Object} An object containing the SQL statement for the set columns and the values to be updated.
 * @example 
 * // Example usage:
 * const dataToUpdate = { firstname: 'Aliya', age: 32};
 * const jsToSql = { firstname: 'first_name', age: 'age'};
 * const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
 * console.log(result); // { setCols: '"first_name"=$1, "age"=$2', values: ['Aliya', 32] }
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };

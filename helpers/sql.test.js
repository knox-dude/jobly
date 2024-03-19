const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", () => {
  it("should throw an error if no data is provided", () => {
    expect(() => sqlForPartialUpdate({}, {})).toThrowError("No data");
  });

  it("should return the correct SQL statement and values for a single column update", () => {
    const dataToUpdate = { firstName: "Aliya" };
    const jsToSql = { firstName: "first_name" };
    const { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(setCols).toBe('"first_name"=$1');
    expect(values).toEqual(["Aliya"]);
  });

  it("should return the correct SQL statement and values for multiple column updates", () => {
    const dataToUpdate = { firstName: "Aliya", age: 32 };
    const jsToSql = { firstName: "first_name", age: "age" };
    const { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(setCols).toBe('"first_name"=$1, "age"=$2');
    expect(values).toEqual(["Aliya", 32]);
  });
});
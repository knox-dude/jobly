"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

/**
 * Builds the SQL statement for finding all companies based on the query string parameters.
 *
 * @param {Object} queryString - The query string parameters.
 * @param {string} [queryString.name] - The company name.
 * @param {number} [queryString.minEmployees] - The minimum number of employees.
 * @param {number} [queryString.maxEmployees] - The maximum number of employees.
 * @returns {{sql: string, values: Array}} - The SQL statement and the parameter values.
 */
static buildFindAllSQLWithQueryString(queryString) {
  // build base SQL statement
  let sql = `SELECT handle,
      name, 
      description, 
      num_employees AS "numEmployees",
      logo_url AS "logoUrl"
      FROM companies`;
  // build sql query using query string parameters
  let startedSql = false;
  let paramCount = 1;
  let values = [];
  // loop through params of query string, build sql based on what query parameters exist
  for (let key in queryString) {
    sql = startedSql ? sql + " AND " : sql + " WHERE ";
    if (key === "name") {
      sql = sql + ` name ILIKE '%' || $${paramCount} || '%'`;
    } else if (key === "minEmployees") {
      sql = sql + ` num_employees >= $${paramCount}`;
    } else if (key === "maxEmployees") {
      sql = sql + ` num_employees <= $${paramCount}`;
    }
    startedSql = true;
    paramCount++;
    values.push(queryString[key]);
  }
  sql = sql + " ORDER BY name";
  return {sql, values};
}

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(queryString) {
    const { sql, values } = Company.buildFindAllSQLWithQueryString(queryString);
    const companiesRes = await db.query(sql, values);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;

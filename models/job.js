"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * */

  static async create({ title, salary, equity, companyHandle }) {

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

/**
 * Builds the SQL statement for finding all jobs based on the query string parameters.
 *
 * @param {Object} queryString - The query string parameters.
 * @param {string} [queryString.title] - The job title - case insensitive, partial matches count.
 * @param {number} [queryString.minSalary] - The minimum salary for jobs found.
 * @param {number} [queryString.hasEquity] - Only find jobs with equity > 0 if true.
 * @returns {{sql: string, values: Array}} - The SQL statement and the parameter values.
 */
static buildFindAllSQLWithQueryString(queryString) {
  // build base SQL statement
  let sql = `SELECT id,
      title, 
      salary, 
      equity,
      company_handle AS "companyHandle"
      FROM jobs`;
  // build sql query using query string parameters
  let startedSql = false;
  let paramCount = 1;
  let values = [];
  // loop through params of query string, build sql based on what query parameters exist
  for (let key in queryString) {
    sql = startedSql ? sql + " AND " : sql + " WHERE ";
    if (key === "title") {
      sql = sql + ` name ILIKE '%' || $${paramCount} || '%'`;
    } else if (key === "minSalary") {
      sql = sql + ` salary >= $${paramCount}`;
    } else if (key === "hasEquity") {
      sql = sql + ` equity > 0`;
      startedSql = true;
      continue; // continue here because no values are added and paramCount is not incremented
    }
    startedSql = true;
    paramCount++;
    values.push(queryString[key]);
  }
  sql = sql + " ORDER BY title";
  return {sql, values};
}

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(queryString) {
    const { sql, values } = Job.buildFindAllSQLWithQueryString(queryString);
    const jobsRes = await db.query(sql, values);
    return jobsRes.rows;
  }

  /** Given a job id, return data about that job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
              title, 
              salary, 
              equity,
              company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity,
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;

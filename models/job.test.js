"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "New",
    salary: 1000,
    equity: 0.02,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    // store id for later, but delete it to ensure equality with newJob
    expect(job).toEqual({
      id: job.id,
      title: newJob.title,
      salary: newJob.salary,
      equity: "0.02", // pg returns string for numeric type
      companyHandle: newJob.companyHandle,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${job.id}`
    );
    expect(result.rows).toEqual([
      {
        id: job.id,
        title: "New",
        salary: 1000,
        equity: "0.02",
        company_handle: "c1",
      },
    ]);
  });
  test("throws NotFoundError if companyHandle not found", async () => {
    try {
      await Job.create({
        title: "New",
        salary: 1000,
        equity: 0.02,
        companyHandle: "not-found",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "job 1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "job 2",
        salary: 60000,
        equity: "0.1",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "test job 3",
        salary: 70000,
        equity: "0",
        companyHandle: "a1",
      },
      {
        id: expect.any(Number),
        title: "test job 4",
        salary: 80000,
        equity: null,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "test job 5",
        salary: 90000,
        equity: "0.02",
        companyHandle: "c3",
      },
    ]);
  });
  test("works: filter by title", async function () {
    let jobs = await Job.findAll({ title: "est" });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "test job 3",
        salary: 70000,
        equity: "0",
        companyHandle: "a1",
      },
      {
        id: expect.any(Number),
        title: "test job 4",
        salary: 80000,
        equity: null,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "test job 5",
        salary: 90000,
        equity: "0.02",
        companyHandle: "c3",
      },
    ]);
  });
  test("works: filter by title and minSalary", async function () {
    let jobs = await Job.findAll({ title: "test", minSalary: 80000 });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "test job 4",
        salary: 80000,
        equity: null,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "test job 5",
        salary: 90000,
        equity: "0.02",
        companyHandle: "c3",
      },
    ]);
  });
  test("works: filter by title, minSalary, and hasEquity", async function () {
    let jobs = await Job.findAll({
      title: "test",
      minSalary: 75000,
      hasEquity: true,
    });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "test job 5",
        salary: 90000,
        equity: "0.02",
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(1);
    expect(job).toEqual({
      id: 1,
      title: "job 1",
      salary: 50000,
      equity: "0",
      companyHandle: "c1",
    });
  });

  test("not found if no such id", async function () {
    try {
      await Job.get(10000);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New",
    salary: 10,
    equity: '0.5',
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      id: 1,
      companyHandle: 'c1',
      ...updateData,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        id: 1,
        title: "New",
        salary: 10,
        equity: "0.5",
        company_handle:'c1',
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "New",
      equity: null,
    };

    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      id: 1,
      companyHandle: 'c1',
      salary: 50000,
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        id: 1,
        title: "New",
        salary: 50000,
        equity: null,
        company_handle: 'c1',
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(10000, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query(
      "SELECT id FROM jobs WHERE id=1"
    );
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove(10000);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

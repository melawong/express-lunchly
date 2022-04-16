"use strict";

const { e } = require("nunjucks/src/filters");
/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`
    );
    return results.rows.map((c) => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** gets filtered customer list by search query */

  static async filter(search) {
    const results = await db.query(
      `SELECT id,
            first_name AS "firstName",
            last_name  AS "lastName",
            phone,
            notes
          FROM customers
          WHERE CONCAT(first_name, ' ', last_name) ILIKE $1
          ORDER BY last_name, first_name`,
      [`%${search}%`]
    );

    return results.rows.map((c) => new Customer(c));
  }

  /** gets top 10 customers with most reservations */

  static async topTen() {
    const results = await db.query(
      `SELECT customers.id,
          first_name AS "firstName",
          last_name  AS "lastName",
          phone,
          customers.notes,
          COUNT(reservations.id) AS resCount
        FROM customers
        JOIN reservations ON customers.id = reservations.customer_id
        GROUP BY customers.id, first_name, last_name, phone, customers.notes
        ORDER BY resCount DESC
        LIMIT 10`
    );

    return results.rows.map((c) => new Customer(c));
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** get customer's full name (first + last) */

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** getter function for notes */

  get notes() {
    return this._notes
  }

  /** setter function for notes */

  set notes(note){
    if(!this.notes) {
      this._notes = ""
    }
    this._notes = note;
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }
}

module.exports = Customer;

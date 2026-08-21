const express = require('express');
const pool = require('../db');
const { recordAudit } = require('../lib/audit');

const router = express.Router();

const MAX_PAGE_SIZE = 200;
const SORT_COLUMNS = {
  full_name: 'w.full_name',
  total_earned: 'total_earned',
};

function buildFullName({ last_name: lastName, first_name: firstName, middle_name: middleName }) {
  const middle = middleName ? ` ${middleName}` : '';
  return `${lastName}, ${firstName}${middle}`.toUpperCase().trim();
}

// Scoped to workers.project_id (added in Task 2's migration). A newly
// created worker has no payroll_entries yet, so filtering by w.project_id
// directly (rather than an EXISTS(payroll_entries) filter) still lists it
// right away -- correct order of operations for "add a new hire".
router.get('/:id/workers', async (req, res, next) => {
  try {
    const projectId = req.projectId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || 50));

    const where = ['w.project_id = ?'];
    const params = [projectId];

    if (req.query.search) {
      where.push('w.full_name LIKE ?');
      params.push(`%${req.query.search}%`);
    }
    if (req.query.position) {
      where.push('w.position LIKE ?');
      params.push(`%${req.query.position}%`);
    }
    if (req.query.is_active !== undefined) {
      where.push('w.is_active = ?');
      params.push(req.query.is_active === '1' ? 1 : 0);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const sortCol = SORT_COLUMNS[req.query.sortKey];
    const sortDir = req.query.sortDir === 'desc' ? 'DESC' : 'ASC';
    const orderSql = sortCol ? `${sortCol} ${sortDir}` : 'w.full_name ASC';

    const selectSql = `
      SELECT w.id, w.employee_no, w.last_name, w.first_name, w.middle_name, w.full_name,
             w.position, w.date_hired, w.is_active, w.date_separated,
             COALESCE((SELECT SUM(amount) FROM payroll_entries WHERE worker_id = w.id AND project_id = ? AND voided_at IS NULL), 0) AS total_earned
      FROM workers w
      ${whereSql}
    `;

    // Reuses selectSql (rather than a separate COUNT) so the summary's
    // total_earned always matches the same per-worker figure the table
    // itself sums, filtered the same way.
    const {
      rows: [summaryRow],
    } = await pool.query(
      `SELECT COUNT(*) AS row_count, COALESCE(SUM(sub.total_earned), 0) AS total_earned FROM (${selectSql}) sub`,
      [projectId, ...params]
    );
    const total = summaryRow.row_count;
    const summary = { row_count: summaryRow.row_count, total_earned: summaryRow.total_earned };
    const { rows } = await pool.query(
      `${selectSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
      [projectId, ...params, pageSize, (page - 1) * pageSize]
    );

    res.json({ rows, page, pageSize, total, summary });
  } catch (err) {
    next(err);
  }
});

// Bounded, small set (a few dozen distinct values across 246 workers) --
// fetched once and filtered client-side, no per-keystroke round trip.
router.get('/:id/workers/positions', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT position FROM workers WHERE position IS NOT NULL AND position <> '' AND project_id = ? ORDER BY position`,
      [req.projectId]
    );
    res.json({ values: rows.map((r) => r.position) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/workers', async (req, res, next) => {
  const { last_name: lastName, first_name: firstName, middle_name: middleName, employee_no: employeeNo, position, date_hired: dateHired } = req.body;

  if (!lastName || !String(lastName).trim() || !firstName || !String(firstName).trim()) {
    return res.status(400).json({ error: 'last_name and first_name are required' });
  }

  const fullName = buildFullName({ last_name: lastName, first_name: firstName, middle_name: middleName });
  const appUser = req.user.email;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const result = await conn.query(
      `INSERT INTO workers
         (employee_no, last_name, first_name, middle_name, full_name, position, date_hired, is_active, created_by, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       RETURNING id`,
      [
        employeeNo || null,
        String(lastName).trim().toUpperCase(),
        String(firstName).trim().toUpperCase(),
        middleName ? String(middleName).trim().toUpperCase() : null,
        fullName,
        position || null,
        dateHired || null,
        appUser,
        req.projectId,
      ]
    );
    const insertId = result.rows[0].id;

    await recordAudit(conn, {
      table: 'workers',
      rowId: insertId,
      action: 'insert',
      changedBy: appUser,
      after: { id: insertId, full_name: fullName, employee_no: employeeNo || null, position: position || null, is_active: 1 },
    });

    await conn.commit();
    const { rows } = await pool.query('SELECT * FROM workers WHERE id = ? AND project_id = ?', [insertId, req.projectId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.patch('/:id/workers/:workerId', async (req, res, next) => {
  const { workerId } = req.params;
  const appUser = req.user.email;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { rows: existingRows } = await conn.query('SELECT * FROM workers WHERE id = ? AND project_id = ? FOR UPDATE', [workerId, req.projectId]);
    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Worker not found' });
    }
    const before = existingRows[0];

    const lastName = req.body.last_name !== undefined ? String(req.body.last_name).trim().toUpperCase() : before.last_name;
    const firstName = req.body.first_name !== undefined ? String(req.body.first_name).trim().toUpperCase() : before.first_name;
    const middleName =
      req.body.middle_name !== undefined ? (req.body.middle_name ? String(req.body.middle_name).trim().toUpperCase() : null) : before.middle_name;
    const employeeNo = req.body.employee_no !== undefined ? req.body.employee_no || null : before.employee_no;
    const position = req.body.position !== undefined ? req.body.position || null : before.position;
    const dateHired = req.body.date_hired !== undefined ? req.body.date_hired || null : before.date_hired;

    if (!lastName || !firstName) {
      await conn.rollback();
      return res.status(400).json({ error: 'last_name and first_name are required' });
    }

    const isActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : before.is_active;
    let dateSeparated = before.date_separated;
    if (isActive === 0 && before.is_active === 1) {
      // Newly deactivated: use the given date, or default to today.
      dateSeparated = req.body.date_separated || new Date().toISOString().slice(0, 10);
    } else if (isActive === 1) {
      dateSeparated = null;
    } else if (req.body.date_separated !== undefined) {
      dateSeparated = req.body.date_separated || null;
    }

    const fullName = buildFullName({ last_name: lastName, first_name: firstName, middle_name: middleName });

    await conn.query(
      `UPDATE workers SET
         last_name = ?, first_name = ?, middle_name = ?, full_name = ?, employee_no = ?,
         position = ?, date_hired = ?, is_active = ?, date_separated = ?, updated_by = ?
       WHERE id = ? AND project_id = ?`,
      [lastName, firstName, middleName, fullName, employeeNo, position, dateHired, isActive, dateSeparated, appUser, workerId, req.projectId]
    );

    await recordAudit(conn, {
      table: 'workers',
      rowId: Number(workerId),
      action: 'update',
      changedBy: appUser,
      before,
      after: { ...before, last_name: lastName, first_name: firstName, middle_name: middleName, full_name: fullName, employee_no: employeeNo, position, date_hired: dateHired, is_active: isActive, date_separated: dateSeparated, updated_by: appUser },
    });

    await conn.commit();
    const { rows } = await pool.query('SELECT * FROM workers WHERE id = ? AND project_id = ?', [workerId, req.projectId]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.get('/:id/workers/:workerId/payroll-entries', async (req, res, next) => {
  try {
    const { rows: workerRows } = await pool.query(
      `SELECT w.id, w.employee_no, w.full_name, w.position, w.is_active, w.date_separated
       FROM workers w
       WHERE w.id = ? AND w.project_id = ?`,
      [req.params.workerId, req.projectId]
    );
    if (workerRows.length === 0) return res.status(404).json({ error: 'not found' });

    const { rows } = await pool.query(
      `SELECT pe.id, pp.id AS payroll_period_id, pp.label AS period_label,
              pp.period_start, pp.period_end,
              pe.planning_line_id, pl.code AS planning_line_code, pe.amount
       FROM payroll_entries pe
       JOIN payroll_periods pp ON pp.id = pe.payroll_period_id
       LEFT JOIN planning_lines pl ON pl.id = pe.planning_line_id
       WHERE pe.worker_id = ? AND pe.project_id = ? AND pe.voided_at IS NULL
       ORDER BY pp.period_start`,
      [req.params.workerId, req.projectId]
    );

    res.json({ worker: workerRows[0], entries: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

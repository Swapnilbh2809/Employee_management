require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('node:path');
const sequelize = require('./models/connection');
const Employee = require('./models/employeeSchema');
const Department = require('./models/DepartmentSchema');
require('./models/TableAssociation');
const authRoutes = require('./routes/auth');
const { attachUser, requireLogin, requireAdmin, requireSelfOrAdmin } = require('./middleware/auth');



const app = express();
const port = process.env.PORT || 3000;
//=======================MIDDLEWARES================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(attachUser);


//=====================ROOT PATH===================
app.get('/', (req, res) => {
    res.redirect(req.user ? '/employees' : '/login'); // landing page = login if not logged in and employees if logged in
});

app.use(authRoutes);
app.use(requireLogin);


// ======================= LIST: all employees AND all departments =======================
app.get('/employees', async (req, res, next) => {
    try {
        // Promise.all runs both queries at the same time instead of one after the other
        const [allEmployees, departments] = await Promise.all([
            Employee.findAll({
                include: [{ model: Department, as: 'department' }],
                order: [['id', 'ASC']] // PREDEFINED: sort by id, ascending
            }),
            Department.findAll({ order: [['id', 'ASC']] })
        ]);

        // In the page: employee.department.name
        res.render('allEmployees', { allEmployees, departments });
    } catch (error) {
        next(error);
    }
});


// ======================= CREATE EMPLOYEE FORM (admin) =======================
app.get('/employee/create', requireAdmin, async (req, res, next) => {
  try {
    const departments = await Department.findAll();
    res.render('CreateNewEmployee', { departments });
  } catch (error) {
    next(error);
  }
});

// ======================= CREATE EMPLOYEE SUBMIT (admin) =======================
app.post('/employee', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, departmentId, age, salary, role } = req.body;

    if (!name || !email || !password || !departmentId || !age || !salary) {
      return res.status(400).send('All fields are required.');
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).send('Password must be 8 to 72 characters.');
    }

    // Safe default: anything other than the exact word 'admin' becomes a normal user.
    const newRole = role === 'admin' ? 'admin' : 'user';

    await Employee.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      departmentId,
      age,
      salary,
      passwordHash: await bcrypt.hash(password, 10),
      role: newRole
    });

    res.redirect('/employees');
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send('That email is already in use.');
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).send(error.errors[0].message);
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).send('That department does not exist.');
    }
    next(error);
  }
});
// ======================= DELETE EMPLOYEE (admin) =======================
app.post('/employee/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    if (String(req.user.id) === req.params.id) {
      return res.status(400).send('You cannot delete your own account.');
    }
    const target = await Employee.findByPk(req.params.id);
    if (!target) {
      return res.status(404).send('Employee not found');
    }
    await target.destroy(); // PREDEFINED: deletes this row
    res.redirect('/employees');
  } catch (error) {
    next(error);
  }
});


// ======================= DETAILS OF EMPLOYEES =======================
app.get('/employees/:id', async (req, res, next) => {
    try {
        const employeeData = await Employee.findByPk(req.params.id, {
            include: [{ model: Department, as: 'department' }]
        });
        if (!employeeData) {
            return res.status(404).send('Employee not found');
        }
        // In the page: employeeData.department.name
        res.render('ShowEmployeeDetails', { employeeData });
    } catch (error) {
        next(error);
    }
});

// >>> Step 9: GET /employee/create and POST /employee go HERE, above '/employee/:id' <<<

// ======================= EDIT FORM: owner or admin only =======================
app.get('/employee/:id', requireSelfOrAdmin, async (req, res, next) => {
    try {
        const employeeData = await Employee.findByPk(req.params.id);
        if (!employeeData) {
            return res.status(404).send('Employee not found');
        }
        const departments = await Department.findAll();
        res.render('UpdateEmployee', { employeeData, departments });
    } catch (error) {
        next(error);
    }
});

// ======================= EDIT SUBMIT: owner or admin only =======================
app.post('/employee/:id', requireSelfOrAdmin, async (req, res, next) => {
    try {
        const target = await Employee.findByPk(req.params.id);
        if (!target) {
            return res.status(404).send('Employee not found');
        }

        const { name, email, departmentId, age, salary, newPassword, role } = req.body;
        if (!name || !email || !departmentId || !age || !salary) {
            return res.status(400).send('Name, email, department, age and salary are required.');
        }

        // We pick each allowed field BY HAND. Never write target.update(req.body)
        const changes = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            departmentId,
            age,
            salary
        };

        // Optional password change (also how an admin gives old accounts their first password)
        if (newPassword) {
            if (newPassword.length < 8 || newPassword.length > 72) {
                return res.status(400).send('New password must be 8 to 72 characters.');
            }
            changes.passwordHash = await bcrypt.hash(newPassword, 10);
        }

        // THE authorization line: only an admin may touch the role.
        // A normal user can send role=admin by hand, and it is simply never read.
        if (req.user.role === 'admin' && role) {
            if (!['user', 'admin'].includes(role)) {
                return res.status(400).send('Invalid role.');
            }
            if (target.id === req.user.id && role !== 'admin') {
                return res.status(400).send('You cannot remove your own admin role.');
            }
            changes.role = role;
        }

        await target.update(changes);
        res.redirect(`/employees/${target.id}`);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).send('That email is already in use.');
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).send(error.errors[0].message);
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).send('That department does not exist.');
        }
        next(error);
    }
});

// =======================DEPARTMENTS=======================
app.get('/departments/new', requireAdmin, (req, res) => {
  res.render('DepartmentForm', { department: null });
});

app.post('/departments', requireAdmin, async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim().toLowerCase();
    if (!name) {
      return res.status(400).send('Department name is required.');
    }
    await Department.create({ name });
    res.redirect('/employees');
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send('A department with that name already exists.');
    }
    next(error);
  }
});

app.get('/departments/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).send('Department not found');
    }
    res.render('DepartmentForm', { department });
  } catch (error) {
    next(error);
  }
});

app.post('/departments/:id', requireAdmin, async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).send('Department not found');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).send('Department name is required.');
    }
    await department.update({ name });
    res.redirect('/employees');
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.redirect(`/departments/${req.params.id}/edit`);

      //    const editUrl = `/departments/${encodeURIComponent(req.params.id)}/edit`;
      // return res.send(
      //   `<script>alert("Department name already exists"); window.location.replace(${JSON.stringify(editUrl)});</script>`
      // );
    }
    next(error);
  }
});

app.post('/departments/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).send('Department not found');
    }
    // Refuse if people still belong to it, otherwise they would point at nothing.
    const inUse = await Employee.count({ where: { departmentId: department.id } });
    if (inUse > 0) {
      return res.status(400).send(
        `Cannot delete: ${inUse} employee(s) still belong to this department. Move them first.`
      );
    }
    await department.destroy();
    res.redirect('/employees');
  } catch (error) {
    next(error);
  }
});

async function main() {
    await sequelize.authenticate();
    console.log('Database connection successful.');
    await sequelize.sync({ alter: true });
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
main().catch((error) => {
    console.error('Startup failed:', error);
    process.exit(1);
});

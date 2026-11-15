const express = require('express');
const bcrypt = require('bcryptjs');
const Employee = require('../models/employeeSchema');
const Department = require('../models/DepartmentSchema');
const { redirectIfLoggedIn } = require('../middleware/auth');
const { setTokenCookie, clearTokenCookie } = require('../utils/token');

const router = express.Router();
const SALT_ROUNDS = 10;

function logIn(res, user) {
    setTokenCookie(res, user);
    res.redirect('/employees');
}

// =========================== SIGNUP ===========================
router.get('/signup', redirectIfLoggedIn, async (req, res, next) => {
    try {
        const departments = await Department.findAll(); // for the dropdown
        res.render('signup', { departments });
    } catch (error) {
        next(error);
    }
});

router.post('/signup', redirectIfLoggedIn, async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, departmentId, age, salary } = req.body;
        const departments = await Department.findAll();
        const values = { name, email, departmentId, age, salary };


        // Small helper: show the form again with a message.
        const fail = (message) =>
            res.status(400).render('signup', { departments, values, error: message });

        if (!name || !email || !password || !departmentId || !age || !salary) {
            return fail('Please fill in every field.');
        }
        if (password.length < 8 || password.length > 72) {
            return fail('Password must be 8 to 72 characters.');
        }
        if (password !== confirmPassword) {
            return fail('Passwords do not match.');
        }
        if (Number(salary) < 0 || Number(salary) > 99999999) {
            return fail('Salary must be between 0 and 99,999,999.');
        }

        const cleanEmail = email.trim().toLowerCase();

        const taken = await Employee.findOne({ where: { email: cleanEmail } })
        if (taken) {
            return fail('email already in use');
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);


        const employee = await Employee.create({
            name: name.trim(),
            email: cleanEmail,
            departmentId,
            age,
            salary,
            passwordHash,
            role: 'user'  // HARD-CODED
        });


        logIn(res, employee); // login the user as they sign in
    } catch (error) {
        next(error);
    }
});

// =========================== LOGIN ===========================
router.get('/login', redirectIfLoggedIn, (req, res) => {
    res.render('login');
});

router.post('/login', redirectIfLoggedIn, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // ONE message for every failure, so an attacker cannot learn which emails exist.
        const reject = () =>
            res.status(401).render('login', { error: 'Invalid email or password.', email });

        if (!email || !password) return reject();

        const user = await Employee.unscoped().findOne({
            where: { email: email.trim().toLowerCase() }
        });
        //old users do not possess password, so their password is NULL, to prevent the new users from looging in as old user
        //!user.passwordHash is being used 
        if (!user || !user.passwordHash) return reject();

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return reject();

        logIn(res, user);
    } catch (error) {
        next(error);
    }
});

// =========================== LOGOUT ===========================
router.post('/logout', (req, res) => {
    clearTokenCookie(res);
    res.redirect('/login');
});

module.exports = router;

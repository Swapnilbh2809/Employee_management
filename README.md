employee management system, with authentication and authorization

=========================SETUP============================
CD INTO the folder and type 
 	
	npm init

it will install all the dependencies
here's a list of dependencies for cross refrencing:-
 "dependencies": {
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "dotenv": "^18.0.10",
    "ejs": "^7.0.2",
    "express": "^5.3.0",
    "jsonwebtoken": "^9.0.3",
    "mysql2": "^3.24.6",
    "sequelize": "^6.37.8"
  }

then hit npm start || node app.js  to start the application, it will start on port 5173 or whatever port you define in your env files

=============================API ROUTES==============================

These routes use normal browser forms and pages. Form submissions use POST
requests, successful actions usually redirect to another page, and unsuccessfull tries return an read-able and understandable error

=============================AUTHENTICATION==================================

- GET /
  Sends logged-in users to /employees and everyone else to /login.

 GET /signup
  Shows the signup form and department list. Logged-in users are sent to /employees.

- POST /signup
  Creates a user account. Form fields: name, email, password, confirmPassword,
  departmentId, age and salary. Password must be 8 to 72 characters and match
  the confirmation. New signups always get the user role. On success, the user
  is logged in and sent to /employees.

- GET /login
  Shows the login form. Logged-in users are sent to /employees.

- POST /login
  Form fields: email and password. On success, logs the user in and redirects
  to /employees. Invalid credentials return the same error message.

- POST /logout
  Clears the login cookie and redirects to /login.

After login or signup, the app stores a signed token in the employee in cookie inside 'middleware/auth.js' file. The token contains the employee's userId and is signed with JWT using the HS256(HMAC(hash based message authentication code) + SHA256) algorithm. JWT_SECRET must be set in the environment. The token is
signed, NOT encrypted, so sensitive data should not be put in its payload.

The token and cookie both expire two hours after login. Requests do not extend
that time, so this is not a sliding session. Logging out clears the cookie.
The cookie is HTTP-only and is marked secure when NODE_ENV is set to production.

Passwords are never stored as plain text. The app uses bcryptjs to hash
passwords when an account is created or its password is changed. The bcrypt
cost is 10 salt rounds; bcrypt generates a separate salt for each hash. 
During the time of the login, bcrypt compares the submitted password with the stored hash.

=============================EMPLOYEE ROUTES================================

These routes require the user to be logged in, unless noted otherwise.

- GET /employees
  Shows the employee list and departments.

- GET /employees/:id
  Shows the details for the employee with that id.

- GET /employee/create (admin only)
  Shows the create-employee form.

- POST /employee (admin only)
  Creates an employee. Form fields: name, email, password, departmentId, age,
  salary and optionally role. Password must be 8 to 72 characters. Only the
  exact role value "admin" creates an admin; other values create a user.
  Success redirects to /employees.

- GET /employee/:id
  Shows the edit form. Only that employee or an admin can access it.

- POST /employee/:id
  Updates the employee. Only that employee or an admin can submit changes.
  Required fields: name, email, departmentId, age and salary. newPassword is
  optional. Only admins can change the role. Success redirects to the
  employee's details page.

- POST /employee/:id/delete (admin only)
  Deletes the employee and redirects to /employees. An admin cannot delete
  their own account.

=============================DEPARTMENT ROUTES(ONLY ADMIN ACCESIBLE)=============================


- GET /departments/new
  Shows the form for creating a department.

- POST /departments
  Creates a department. Form field: name. Success redirects to /employees.

- GET /departments/:id/edit
  Shows the edit form for that department.

- POST /departments/:id
  Updates the department. Form field: name. Success redirects to /employees.

- POST /departments/:id/delete
  Deletes the department and redirects to /employees. A department cannot be
  deleted while employees still belong to it.

=============================AUTHORIZATION=============================

- The login check runs before the employee and department routes. If a user is
  not logged in, they are redirected to /login.
- Admin-only routes redirect logged-out users to /login and return 403 for
  logged-in users who are not admins.
- Employee edit routes allow the employee themselves or an admin. Other users
  receive 403.
- Signup and login pages redirect already logged-in users to /employees.

=============================DATABASE SCHEMAS AND ASSOCIATION=============================

Sequelize adds an auto-incrementing id primary key to both models.

EMPLOYEE
- name: required string
- email: required, unique string, and must be a valid email
- departmentId: required integer; stored in the database column named department
- age: required integer
- salary: required decimal with up to 10 digits and 2 decimal places
- passwordHash: string; can be null for older accounts
- role: required string, defaults to user, and only allows user or admin
- timestamps are disabled for this model
- passwordHash is excluded from normal queries by default

DEPARTMENT
- name: required, unique string
- Sequelize timestamps are enabled by default, so createdAt and updatedAt are
  also maintained

TABLE ASSOCIATION
- An employee belongs to one department through employee.departmentId. In the
  database, that foreign key is stored in the department column.
- A department can have many employees.
- The association aliases are department on an employee and employees on a
  department. These aliases are used when loading associated records.

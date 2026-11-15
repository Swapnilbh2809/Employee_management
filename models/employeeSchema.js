const { DataTypes } = require('sequelize');
const sequelize = require('./connection');

const Employee = sequelize.define('employee', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'department'
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    salary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
        validate: { isIn: [['user', 'admin']] }
    }
}, {
    timestamps: false,
    defaultScope: {
        attributes: { exclude: ['passwordHash'] }
    }

});

module.exports = Employee;

const sequelize = require('./connection');
const { DataTypes } = require('sequelize');


const Department = sequelize.define('Department', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
})

module.exports = Department
const employee = require('./employeeSchema');
const Department = require('./DepartmentSchema');

employee.belongsTo(Department,{
    foreignKey :{name: "departmentId",field:"department"},
    as:'department'
})

Department.hasMany(employee,{
    foreignKey:{name:"departmentId",field:"department"},
    as:"employees"
})
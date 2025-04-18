import { faker } from '@faker-js/faker';
import pg from 'pg';

const { Client } = pg;
// const cfg = {
//     //connectionString: 'postgres://postgres:password@localhost:5432/postgres'
// };
// const client = new Client(cfg);

// данные подключения к БД
const client = new Client({
    host: 'host',
    port: port,
    user: 'user',
    password: 'password',
    database: 'database',
    ssl: {
        rejectUnauthorized: false, 
    },
});


await client.connect();

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * ((max + 1) - min) + min);
};

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

let flag = "gena"; // "create" "gena" "delete"

if (flag == "delete") {

    // удаление таблиц
    await client.query('DROP TABLE payments; DROP TABLE clients');

} else if (flag == "create") {

    // создание таблиц
    await client.query('CREATE TABLE IF NOT EXISTS clients (client_id SERIAL PRIMARY KEY, fullname CHARACTER VARYING(100), birth_date DATE, employed BOOLEAN, income INTEGER)');
    await client.query('CREATE TABLE IF NOT EXISTS payments (payment_id SERIAL PRIMARY KEY, loan_id INTEGER, loan_amount INTEGER, monthly_payment INTEGER, uuid_transaction CHARACTER VARYING(100), due_date DATE, actual_payment_date DATE, paid_amount INTEGER)');
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id INT');
    await client.query('ALTER TABLE payments ADD CONSTRAINT fk_payments_client_id FOREIGN KEY (client_id) REFERENCES clients (client_id)');

} else {

    // генерация данных
    for (let i = 0; i < 1000; i++) {
        // создаем клиента
        await client.query('INSERT INTO clients (fullname, birth_date, employed) VALUES ($1, $2, $3)', [faker.person.fullName(), faker.date.birthdate(), faker.datatype.boolean()]);

        let client_bd = await client.query('SELECT * FROM clients ORDER BY client_id DESC LIMIT 1');
        let client_id = client_bd.rows[0].client_id;
        let employed = client_bd.rows[0].employed;
        let income;

        if (!!employed) {
            income = faker.number.int({ min: 40000, max: 90000, multipleOf: 50 });
        } else {
            income = faker.number.int({ min: 5000, max: 30000, multipleOf: 100 });
        };
        await client.query('UPDATE clients SET income = ($1) WHERE client_id = ($2)', [income, client_id] );

        // крутим барабан на хорошесть клиента
        let good_client = Boolean(getRandomNumber(0, 1));

        // id кредита (счетчик кредитов в БД)
        let loan_id = 1;

        // создаем от одного до 3 кредитов на этого клиента
        for (let j = 1; j < 2; j++) {
        
            // сумма кредита 
            let loan_amount = Number(getRandomNumber(150, 1000)) * 1000;
            let monthly_payment; 

            // посчитать ежемесячный платеж, фактический платеж и кол-во платежей
            if (income < 10000) {
                monthly_payment = income - Number(getRandomNumber(1000, 4000));
            } else {
                monthly_payment = income - Number(getRandomNumber(3000, 9000));
            }

            let paid_amount = monthly_payment;

            let month = Math.floor(loan_amount / monthly_payment);

            // создаем запись с рандомным значением внесенных платежей
            let payments_count = month - Number(getRandomNumber(0, month - 1)); 

            // дата 1го платежа
            const start_date = getRandomDate(new Date(2020, 0, 1), new Date()); 
            
            for (let k = 0;  k < payments_count; k++) {

                let uuid_transaction = faker.string.uuid();

                const due_date = new Date(start_date.getTime());
                due_date.setMonth(due_date.getMonth() + k);

                const actual_payment_date = new Date(due_date.getTime());

                if (!good_client) {

                    actual_payment_date.setDate(actual_payment_date.getDate() + Number(getRandomNumber(1, 28)));
        
                } 

                await client.query('INSERT INTO payments (loan_id, loan_amount, monthly_payment, client_id, uuid_transaction, due_date, actual_payment_date, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [loan_id, loan_amount, monthly_payment, client_id, uuid_transaction, due_date, actual_payment_date, paid_amount ]);

            }

            loan_id++;
        }
    }
}

// let res = await client.query('SELECT * FROM clients ORDER BY client_id DESC LIMIT 5');
// console.log(res.rows);
await client.end()
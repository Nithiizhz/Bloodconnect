require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

const PORT = 3000;


/* =====================================================
   MIDDLEWARE
   ===================================================== */

app.use(express.json());
app.use(cors());

/* Serve frontend files */
app.use(express.static(__dirname));


/* =====================================================
   MYSQL CONNECTION
   ===================================================== */

const db = mysql.createConnection({

    host: "localhost",

    user: "root",

    // 👇 UN MYSQL PASSWORD INGAA PODU
    password: process.env.DB_PASSWORD,

    database: "bloodconnect"

});


/* =====================================================
   CONNECT TO MYSQL
   ===================================================== */

db.connect((err) => {

    if (err) {

        console.log(
            "MySQL connection failed:",
            err.message
        );

        return;
    }

    console.log(
        "MySQL connected successfully!"
    );

});


/* =====================================================
   HOME ROUTE
   ===================================================== */

app.get("/", (req, res) => {

    res.sendFile(
        __dirname + "/index.html"
    );

});


/* =====================================================
   DONOR REGISTRATION API
   ===================================================== */

app.post("/api/donors", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            phone,
            age,
            blood_group,
            gender,
            city,
            area,
            last_donation_date,
            availability
        } = req.body;


        /* Validate required fields */

        if (
            !name ||
            !email ||
            !password ||
            !phone ||
            !age ||
            !blood_group ||
            !gender ||
            !city ||
            !area ||
            !availability
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required fields."

            });

        }


        /* Check duplicate email */

        const checkSql =
            "SELECT id FROM donors WHERE email = ?";


        db.query(
            checkSql,
            [email],
            async (checkErr, existingUsers) => {

                if (checkErr) {

                    console.log(
                        "Email check error:",
                        checkErr.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database error."

                    });

                }


                if (existingUsers.length > 0) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "Email is already registered."

                    });

                }


                /* Hash password */

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );


                /* Insert donor */

                const sql = `

                    INSERT INTO donors

                    (
                        name,
                        email,
                        password,
                        phone,
                        age,
                        blood_group,
                        gender,
                        city,
                        area,
                        last_donation_date,
                        availability
                    )

                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

                `;


                const values = [

                    name,
                    email,
                    hashedPassword,
                    phone,
                    age,
                    blood_group,
                    gender,
                    city,
                    area,
                    last_donation_date || null,

                    // Available = 1
                    // Unavailable = 0

                    availability === "Available"
                        ? 1
                        : 0

                ];


                db.query(
                    sql,
                    values,
                    (err, result) => {

                        if (err) {

                            console.log(
                                "Donor registration error:",
                                err.message
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Donor registration failed."

                            });

                        }


                        res.status(201).json({

                            success: true,

                            message:
                                "Donor registered successfully!",

                            donorId:
                                result.insertId

                        });

                    }
                );

            }
        );


    } catch (error) {

        console.log(
            "Registration error:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Something went wrong."

        });

    }

});


/* =====================================================
   LOGIN API
   ===================================================== */

app.post(
    "/api/auth/login",
    (req, res) => {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        const sql = `

            SELECT

                id,
                name,
                email,
                password,
                phone,
                age,
                blood_group,
                gender,
                city,
                area,
                last_donation_date,
                availability

            FROM donors

            WHERE email = ?

            LIMIT 1

        `;


        db.query(
            sql,
            [email],
            async (err, results) => {

                if (err) {

                    console.log(
                        "Login database error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Login failed."

                    });

                }


                if (results.length === 0) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "Invalid email or password."

                    });

                }


                const donor =
                    results[0];


                /* Compare password */

                const passwordMatch =
                    await bcrypt.compare(
                        password,
                        donor.password
                    );


                if (!passwordMatch) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "Invalid email or password."

                    });

                }


                /* Never send password */

                delete donor.password;


                res.json({

                    success: true,

                    message:
                        "Login successful!",

                    donor: donor

                });

            }
        );

    }
);


/* =====================================================
   DONOR SEARCH API
   ===================================================== */

app.get(
    "/api/donors",
    (req, res) => {

        const {
            bloodGroup,
            location
        } = req.query;


        let sql = `

            SELECT

                id,
                name,
                blood_group,
                city,
                area,
                age,
                last_donation_date,
                availability

            FROM donors

            WHERE availability = 1

        `;


        const values = [];


        /* Blood group filter */

        if (bloodGroup) {

            sql +=
                " AND blood_group = ?";

            values.push(
                bloodGroup
            );

        }


        /* City / area filter */

        if (location) {

            sql += `

                AND (
                    city LIKE ?
                    OR area LIKE ?
                )

            `;


            const searchLocation =
                `%${location}%`;


            values.push(
                searchLocation
            );

            values.push(
                searchLocation
            );

        }


        sql +=
            " ORDER BY id DESC";


        db.query(
            sql,
            values,
            (err, results) => {

                if (err) {

                    console.log(
                        "Donor search error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to search donors."

                    });

                }


                res.json({

                    success: true,

                    donors: results

                });

            }
        );

    }
);

/* =====================================================
   UPDATE DONOR AVAILABILITY
   ===================================================== */

app.put("/api/donors/:id/availability", (req, res) => {

    const donorId = req.params.id;
    const { availability } = req.body;

    if (availability !== 0 && availability !== 1) {
        return res.status(400).json({
            success: false,
            message: "Invalid availability value."
        });
    }

    const sql = `
        UPDATE donors
        SET availability = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [availability, donorId],
        (err, result) => {

            if (err) {
                console.log(
                    "Availability update error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to update availability."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Donor not found."
                });
            }

            res.json({
                success: true,
                message: "Availability updated successfully!"
            });
        }
    );
});


/* =====================================================
   BLOOD REQUEST API
   ===================================================== */

app.post(
    "/api/blood-requests",
    (req, res) => {

        const {

            patient_name,

            blood_group,

            units_required,

            hospital_name,

            city,

            contact_number,

            urgency,

            required_date,

            message

        } = req.body;


        /* Validate required fields */

        if (

            !patient_name ||
            !blood_group ||
            !units_required ||
            !hospital_name ||
            !city ||
            !contact_number ||
            !urgency ||
            !required_date

        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required blood request fields."

            });

        }


        const sql = `

            INSERT INTO blood_requests

            (
                patient_name,
                blood_group,
                units_required,
                hospital_name,
                city,
                contact_number,
                urgency,
                required_date,
                message
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

        `;


        const values = [

            patient_name,

            blood_group,

            units_required,

            hospital_name,

            city,

            contact_number,

            urgency,

            required_date,

            message || null

        ];


        db.query(
            sql,
            values,
            (err, result) => {

                if (err) {

                    console.log(
                        "Blood request error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Blood request submission failed."

                    });

                }


                res.status(201).json({

                    success: true,

                    message:
                        "Blood request submitted successfully!",

                    requestId:
                        result.insertId

                });

            }
        );

    }
);


/* =====================================================
   TEST API
   ===================================================== */

app.get(
    "/api/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "BloodConnect API is working!"

        });

    }
);


/* =====================================================
   START SERVER
   ===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `BloodConnect server running at http://localhost:${PORT}`
        );

    }
);
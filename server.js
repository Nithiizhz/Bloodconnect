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


        /* Validate phone number */

        const phonePattern =
            /^[0-9]{10}$/;


        if (!phonePattern.test(phone)) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 10-digit phone number."

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
                email,
                phone,
                blood_group,
                gender,
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
   GET SINGLE DONOR
   ===================================================== */

app.get(
    "/api/donors/:id",
    (req, res) => {

        const donorId =
            req.params.id;


        const sql = `

            SELECT

                id,
                name,
                email,
                phone,
                blood_group,
                gender,
                city,
                area,
                age,
                last_donation_date,
                availability

            FROM donors

            WHERE id = ?

            LIMIT 1

        `;


        db.query(
            sql,
            [donorId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Get donor error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to get donor details."

                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Donor not found."

                    });

                }


                res.json({

                    success: true,

                    donor: results[0]

                });

            }
        );

    }
);


/* =====================================================
   UPDATE DONOR AVAILABILITY
   ===================================================== */

app.put(
    "/api/donors/:id/availability",
    (req, res) => {

        const donorId =
            req.params.id;


        const {
            availability
        } = req.body;


        if (
            availability !== 0 &&
            availability !== 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid availability value."

            });

        }


        const sql = `

            UPDATE donors

            SET availability = ?

            WHERE id = ?

        `;


        db.query(
            sql,
            [
                availability,
                donorId
            ],
            (err, result) => {

                if (err) {

                    console.log(
                        "Availability update error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to update availability."

                    });

                }


                if (
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Donor not found."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Availability updated successfully!"

                });

            }
        );

    }
);


/* =====================================================
   BLOOD REQUEST API
   ===================================================== */

app.post(
    "/api/blood-requests",
    (req, res) => {

        const {

            donor_id,

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


        /* Validate phone */

        const phonePattern =
            /^[0-9]{10}$/;


        if (
            !phonePattern.test(
                contact_number
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 10-digit contact number."

            });

        }


        /*
         * Insert blood request
         */

        const continueRequest = () => {

            const sql = `

                INSERT INTO blood_requests

                (
                    donor_id,
                    patient_name,
                    blood_group,
                    units_required,
                    hospital_name,
                    city,
                    contact_number,
                    urgency,
                    required_date,
                    message,
                    status
                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')

            `;


            const values = [

                donor_id || null,

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
                            result.insertId,

                        donorId:
                            donor_id || null,

                        status:
                            "Pending"

                    });

                }
            );

        };


        /*
         * No specific donor selected.
         * Allow general blood request.
         */

        if (!donor_id) {

            return continueRequest();

        }


        /*
         * Specific donor selected.
         * Check donor before saving request.
         */

        const donorSql = `

            SELECT

                id,
                name,
                blood_group,
                availability

            FROM donors

            WHERE id = ?

            LIMIT 1

        `;


        db.query(
            donorSql,
            [donor_id],
            (err, results) => {

                if (err) {

                    console.log(
                        "Donor validation error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to verify selected donor."

                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Selected donor was not found."

                    });

                }


                const donor =
                    results[0];


                /*
                 * Prevent request to unavailable donor
                 */

                if (
                    donor.availability !== 1
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            `${donor.name} is currently unavailable.`

                    });

                }


                /*
                 * Blood group check
                 */

                if (
                    donor.blood_group !==
                    blood_group
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Selected donor blood group does not match the request."

                    });

                }


                continueRequest();

            }
        );

    }
);


/* =====================================================
   ACCEPT BLOOD REQUEST
   ===================================================== */

app.put(
    "/api/blood-requests/:id/accept",
    (req, res) => {

        const requestId =
            req.params.id;


        const {
            donor_id
        } = req.body;


        /* Validate donor ID */

        if (!donor_id) {

            return res.status(400).json({

                success: false,

                message:
                    "Donor ID is required."

            });

        }


        /*
         * Get request + selected donor
         */

        const checkSql = `

            SELECT

                br.id,
                br.donor_id,
                br.patient_name,
                br.blood_group,
                br.units_required,
                br.hospital_name,
                br.city,
                br.contact_number,
                br.urgency,
                br.required_date,
                br.message,
                br.status,

                d.id AS selected_donor_id,
                d.name AS donor_name,
                d.email AS donor_email,
                d.phone AS donor_phone,
                d.blood_group AS donor_blood_group,
                d.availability AS donor_availability

            FROM blood_requests br

            JOIN donors d
                ON d.id = ?

            WHERE br.id = ?

            LIMIT 1

        `;


        db.query(
            checkSql,
            [
                donor_id,
                requestId
            ],
            (err, results) => {

                if (err) {

                    console.log(
                        "Accept request check error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to verify blood request."

                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Blood request or donor not found."

                    });

                }


                const request =
                    results[0];


                /*
                 * Make sure this request
                 * actually belongs to this donor
                 */

                if (
                    Number(request.donor_id) !==
                    Number(donor_id)
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "This blood request is not assigned to you."

                    });

                }


                /*
                 * Already accepted
                 */

                if (
                    request.status ===
                    "Accepted"
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "This blood request has already been accepted."

                    });

                }


                /*
                 * Check donor availability
                 */

                if (
                    request.donor_availability !== 1
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "You are currently unavailable for donation."

                    });

                }


                /*
                 * Blood group matching
                 */

                if (
                    request.blood_group !==
                    request.donor_blood_group
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Your blood group does not match this request."

                    });

                }


                /*
                 * Accept request
                 */

                const updateSql = `

                    UPDATE blood_requests

                    SET
                        status = 'Accepted'

                    WHERE id = ?

                    AND donor_id = ?

                    AND status = 'Pending'

                `;


                db.query(
                    updateSql,
                    [
                        requestId,
                        donor_id
                    ],
                    (updateErr, result) => {

                        if (updateErr) {

                            console.log(
                                "Accept request update error:",
                                updateErr.message
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to accept blood request."

                            });

                        }


                        /*
                         * Nothing updated means
                         * another action already happened
                         */

                        if (
                            result.affectedRows === 0
                        ) {

                            return res.status(409).json({

                                success: false,

                                message:
                                    "This blood request is no longer pending."

                            });

                        }


                        /*
                         * Success response
                         */

                        res.json({

                            success: true,

                            message:
                                "Blood request accepted successfully!",

                            requestId:
                                requestId,

                            donorId:
                                donor_id,

                            donorName:
                                request.donor_name,

                            donorPhone:
                                request.donor_phone,

                            status:
                                "Accepted"

                        });

                    }
                );

            }
        );

    }
);


/* =====================================================
   GET BLOOD REQUESTS FOR A DONOR
   ===================================================== */

app.get(
    "/api/blood-requests/donor/:donorId",
    (req, res) => {

        const donorId =
            req.params.donorId;


        const sql = `

            SELECT

                br.id,

                br.donor_id,

                br.patient_name,

                br.blood_group,

                br.units_required,

                br.hospital_name,

                br.city,

                br.contact_number,

                br.urgency,

                br.required_date,

                br.message,

                br.status,

                br.created_at

            FROM blood_requests br

            WHERE br.donor_id = ?

            ORDER BY br.id DESC

        `;


        db.query(
            sql,
            [donorId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Donor requests error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to load blood requests."

                    });

                }


                res.json({

                    success: true,

                    requests: results

                });

            }
        );

    }
);


/* =====================================================
   GET SINGLE BLOOD REQUEST
   ===================================================== */

app.get(
    "/api/blood-requests/:id",
    (req, res) => {

        const requestId =
            req.params.id;


        const sql = `

            SELECT

                br.id,

                br.donor_id,

                br.patient_name,

                br.blood_group,

                br.units_required,

                br.hospital_name,

                br.city,

                br.contact_number,

                br.urgency,

                br.required_date,

                br.message,

                br.status,

                br.created_at,

                d.name AS donor_name,

                d.email AS donor_email,

                d.phone AS donor_phone,

                d.blood_group AS donor_blood_group,

                d.city AS donor_city,

                d.area AS donor_area

            FROM blood_requests br

            LEFT JOIN donors d
                ON br.donor_id = d.id

            WHERE br.id = ?

            LIMIT 1

        `;


        db.query(
            sql,
            [requestId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Single blood request error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to load blood request."

                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Blood request not found."

                    });

                }


                res.json({

                    success: true,

                    request: results[0]

                });

            }
        );

    }
);


/* =====================================================
   GET ALL BLOOD REQUESTS
   ===================================================== */

app.get(
    "/api/blood-requests",
    (req, res) => {

        const sql = `

            SELECT

                br.id,

                br.donor_id,

                br.patient_name,

                br.blood_group,

                br.units_required,

                br.hospital_name,

                br.city,

                br.contact_number,

                br.urgency,

                br.required_date,

                br.message,

                br.status,

                br.created_at,

                d.name AS donor_name

            FROM blood_requests br

            LEFT JOIN donors d
                ON br.donor_id = d.id

            ORDER BY br.id DESC

        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Blood requests fetch error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to load blood requests."

                    });

                }


                res.json({

                    success: true,

                    requests: results

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
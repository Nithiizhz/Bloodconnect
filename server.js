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
   MYSQL CONNECT
   ===================================================== */

db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");

    /*
     * BACKFILL OLD REQUESTS
     *
     * Older blood requests may have requester_id = NULL.
     * We try to identify those requests using the
     * contact_number stored in the request.
     */

    const backfillSql = `
        UPDATE blood_requests br
        JOIN donors d
            ON d.phone = br.contact_number
        SET br.requester_id = d.id
        WHERE br.requester_id IS NULL
    `;

    db.query(backfillSql, (backfillErr, result) => {
        if (backfillErr) {
            console.log(
                "Requester ID backfill error:",
                backfillErr.message
            );
            return;
        }

        if (result.affectedRows > 0) {
            console.log(
                `Requester IDs backfilled: ${result.affectedRows}`
            );
        }
    });
});


/* =====================================================
   HOME ROUTE
   ===================================================== */

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
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
                message: "Please fill all required fields."
            });
        }

        const phonePattern = /^[0-9]{10}$/;

        if (!phonePattern.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit phone number."
            });
        }

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
                        message: "Database error."
                    });
                }

                if (existingUsers.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: "Email is already registered."
                    });
                }

                const hashedPassword =
                    await bcrypt.hash(password, 10);

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
                    availability === "Available" ? 1 : 0
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
                            donorId: result.insertId
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
            message: "Something went wrong."
        });
    }
});


/* =====================================================
   LOGIN API
   ===================================================== */

app.post("/api/auth/login", (req, res) => {
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
                    message: "Login failed."
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });
            }

            const donor = results[0];

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

            delete donor.password;

            res.json({
                success: true,
                message: "Login successful!",
                donor: donor
            });
        }
    );
});


/* =====================================================
   DONOR SEARCH API
   ===================================================== */

app.get("/api/donors", (req, res) => {
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

    if (bloodGroup) {
        sql += " AND blood_group = ?";
        values.push(bloodGroup);
    }

    if (location) {
        sql += `
            AND (
                city LIKE ?
                OR area LIKE ?
            )
        `;

        const searchLocation =
            `%${location}%`;

        values.push(searchLocation);
        values.push(searchLocation);
    }

    sql += " ORDER BY id DESC";

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
});


/* =====================================================
   GET SINGLE DONOR
   ===================================================== */

app.get("/api/donors/:id", (req, res) => {
    const donorId = req.params.id;

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
                    message: "Donor not found."
                });
            }

            res.json({
                success: true,
                donor: results[0]
            });
        }
    );
});


/* =====================================================
   UPDATE DONOR AVAILABILITY
   ===================================================== */

app.put(
    "/api/donors/:id/availability",
    (req, res) => {

        const donorId = req.params.id;

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
   CREATE BLOOD REQUEST
   ===================================================== */

app.post(
    "/api/blood-requests",
    (req, res) => {

        let {
            requester_id,
            requester_email,
            requester_name,
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


        /*
         * requester_id = person creating the request
         * donor_id     = selected donor
         * patient_name = patient needing blood
         */


        /* =================================================
           REQUIRED FIELD VALIDATION
           ================================================= */

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


        /* =================================================
           PHONE VALIDATION
           ================================================= */

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
         * =================================================
         * CONTINUE REQUEST AFTER REQUESTER IS IDENTIFIED
         * =================================================
         */

        const continueWithRequester =
            (requester) => {

                requester_id =
                    requester.id;


                /*
                 * =================================================
                 * INSERT BLOOD REQUEST
                 * =================================================
                 */

                const continueRequest =
                    () => {

                        const sql = `
                            INSERT INTO blood_requests
                            (
                                requester_id,
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
                            VALUES
                            (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                'Pending'
                            )
                        `;


                        const values = [
                            requester_id,
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


                                /*
                                 * Return complete request information.
                                 */

                                res.status(201).json({

                                    success: true,

                                    message:
                                        "Blood request submitted successfully!",

                                    requestId:
                                        result.insertId,

                                    requesterId:
                                        requester_id,

                                    requesterName:
                                        requester.name,

                                    requesterPhone:
                                        requester.phone,

                                    donorId:
                                        donor_id || null,

                                    status:
                                        "Pending"
                                });
                            }
                        );
                    };


                /*
                 * =================================================
                 * NO SELECTED DONOR
                 * =================================================
                 */

                if (!donor_id) {
                    return continueRequest();
                }


                /*
                 * =================================================
                 * VERIFY SELECTED DONOR
                 * =================================================
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


                        if (
                            results.length === 0
                        ) {

                            return res.status(404).json({
                                success: false,
                                message:
                                    "Selected donor was not found."
                            });
                        }


                        const donor =
                            results[0];


                        /*
                         * Check donor availability.
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
                         * Check blood group.
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


                        /*
                         * Requester and donor
                         * cannot be the same account.
                         */

                        if (
                            Number(requester_id) ===
                            Number(donor_id)
                        ) {

                            return res.status(400).json({
                                success: false,
                                message:
                                    "You cannot request blood from your own account."
                            });
                        }


                        /*
                         * Everything is valid.
                         */

                        continueRequest();
                    }
                );
            };


        /*
         * =================================================
         * REQUESTER LOOKUP HELPER
         * =================================================
         */

        const verifyRequester =
            (
                requesterSql,
                lookupValue
            ) => {

                db.query(
                    requesterSql,
                    [lookupValue],
                    (
                        requesterErr,
                        requesterResults
                    ) => {

                        if (requesterErr) {

                            console.log(
                                "Requester validation error:",
                                requesterErr.message
                            );


                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to verify requester."
                            });
                        }


                        if (
                            requesterResults.length === 0
                        ) {

                            return res.status(404).json({
                                success: false,
                                message:
                                    "Requester account was not found."
                            });
                        }


                        continueWithRequester(
                            requesterResults[0]
                        );
                    }
                );
            };


        /*
         * =================================================
         * OPTION 1
         * REQUESTER ID FROM FRONTEND
         * =================================================
         */

        if (requester_id) {

            verifyRequester(

                `
                    SELECT
                        id,
                        name,
                        email,
                        phone
                    FROM donors
                    WHERE id = ?
                    LIMIT 1
                `,

                requester_id
            );

            return;
        }


        /*
         * =================================================
         * OPTION 2
         * REQUESTER EMAIL
         * =================================================
         */

        if (requester_email) {

            verifyRequester(

                `
                    SELECT
                        id,
                        name,
                        email,
                        phone
                    FROM donors
                    WHERE email = ?
                    LIMIT 1
                `,

                requester_email
            );

            return;
        }


        /*
         * =================================================
         * OPTION 3
         * REQUESTER NAME
         * =================================================
         */

        if (requester_name) {

            verifyRequester(

                `
                    SELECT
                        id,
                        name,
                        email,
                        phone
                    FROM donors
                    WHERE LOWER(name) = LOWER(?)
                    LIMIT 1
                `,

                requester_name
            );

            return;
        }


        /*
         * =================================================
         * OPTION 4
         * TWO-ACCOUNT DEMO FALLBACK
         * =================================================
         *
         * Your current BloodConnect demo has:
         *
         * ID 1 -> Nithish
         * ID 2 -> Digeesh
         *
         * If requester_id is missing, we look for accounts
         * other than the selected donor.
         *
         * If exactly ONE account exists, that account becomes
         * the requester.
         *
         * Example:
         *
         * Digeesh -> Nithish
         *
         * donor_id = 1
         * only other account = ID 2
         * requester_id = 2
         *
         * This is only a fallback for the current two-account
         * demo. When requester_id is supplied normally, this
         * fallback is never used.
         */

        db.query(

            `
                SELECT
                    id,
                    name,
                    email,
                    phone
                FROM donors
                WHERE id <> ?
                ORDER BY id ASC
            `,

            [donor_id || 0],

            (
                fallbackErr,
                fallbackResults
            ) => {

                if (fallbackErr) {

                    console.log(
                        "Requester fallback error:",
                        fallbackErr.message
                    );


                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to determine requester account."
                    });
                }


                /*
                 * We only accept the fallback when there is
                 * exactly one possible requester.
                 */

                if (
                    fallbackResults.length !== 1
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Requester ID is missing. Please login before submitting the blood request."
                    });
                }


                continueWithRequester(
                    fallbackResults[0]
                );
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


        if (!donor_id) {
            return res.status(400).json({
                success: false,
                message:
                    "Donor ID is required."
            });
        }


        /*
         * Get:
         * - request
         * - donor
         * - requester
         */

        const checkSql = `
            SELECT
                br.id,
                br.requester_id,
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
                d.availability AS donor_availability,

                r.name AS requester_name,
                r.email AS requester_email,
                r.phone AS requester_phone

            FROM blood_requests br

            JOIN donors d
                ON d.id = ?

            LEFT JOIN donors r
                ON r.id = br.requester_id

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


                if (
                    results.length === 0
                ) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "Blood request or donor not found."
                    });
                }


                const request =
                    results[0];


                /*
                 * Only assigned donor can accept.
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


                if (
                    request.donor_availability !==
                    1
                ) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "You are currently unavailable for donation."
                    });
                }


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


                if (
                    !request.requester_id
                ) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "This request has no requester assigned. Please create a new request."
                    });
                }


                /*
                 * Accept request.
                 */

                const updateSql = `
                    UPDATE blood_requests
                    SET status = 'Accepted'
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
                         * Return details for BOTH users.
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

                            requesterId:
                                request.requester_id,

                            requesterName:
                                request.requester_name,

                            requesterPhone:
                                request.requester_phone,

                            patientName:
                                request.patient_name,

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
                br.requester_id,
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

                r.name AS requester_name,
                r.email AS requester_email,
                r.phone AS requester_phone

            FROM blood_requests br

            LEFT JOIN donors r
                ON r.id = br.requester_id

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
   GET BLOOD REQUESTS FOR A REQUESTER
   ===================================================== */

app.get(
    "/api/blood-requests/requester/:requesterId",
    (req, res) => {

        const requesterId =
            req.params.requesterId;

        const sql = `
            SELECT
                br.id,
                br.requester_id,
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
                ON d.id = br.donor_id

            WHERE br.requester_id = ?

            ORDER BY br.id DESC
        `;


        db.query(
            sql,
            [requesterId],
            (err, results) => {

                if (err) {
                    console.log(
                        "Requester requests error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load your blood requests."
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
                br.requester_id,
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
                d.area AS donor_area,

                r.name AS requester_name,
                r.email AS requester_email,
                r.phone AS requester_phone,
                r.blood_group AS requester_blood_group,
                r.city AS requester_city,
                r.area AS requester_area

            FROM blood_requests br

            LEFT JOIN donors d
                ON br.donor_id = d.id

            LEFT JOIN donors r
                ON br.requester_id = r.id

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


                if (
                    results.length === 0
                ) {
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
                br.requester_id,
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
                d.phone AS donor_phone,

                r.name AS requester_name,
                r.phone AS requester_phone

            FROM blood_requests br

            LEFT JOIN donors d
                ON br.donor_id = d.id

            LEFT JOIN donors r
                ON br.requester_id = r.id

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
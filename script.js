/* =====================================================
   BLOODCONNECT - MAIN JAVASCRIPT
   FRONTEND + BACKEND CONNECTED VERSION
   ===================================================== */


/* =====================================================
   MOBILE MENU
   ===================================================== */

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.querySelector(".nav-links");
const navActions = document.querySelector(".nav-actions");

if (menuBtn && navLinks && navActions) {
    menuBtn.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("mobile-open");

        navActions.classList.toggle("mobile-open", isOpen);
        menuBtn.innerHTML = isOpen ? "✕" : "☰";
    });
}

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        if (navLinks) {
            navLinks.classList.remove("mobile-open");
        }

        if (navActions) {
            navActions.classList.remove("mobile-open");
        }

        if (menuBtn) {
            menuBtn.innerHTML = "☰";
        }
    });
});


/* =====================================================
   DONOR DATA
   ===================================================== */

let donors = [];


/* =====================================================
   NOTIFICATION SYSTEM
   ===================================================== */

function showNotification(message, type = "success") {

    const existing = document.querySelector(".notification");

    if (existing) {
        existing.remove();
    }

    const notification = document.createElement("div");

    notification.className = `notification ${type}`;

    notification.innerHTML = `
        <span class="notification-icon">
            ${type === "success" ? "✓" : "!"}
        </span>

        <span class="notification-message">
            ${message}
        </span>

        <button
            class="notification-close"
            aria-label="Close notification"
        >
            ×
        </button>
    `;

    document.body.appendChild(notification);

    const closeButton =
        notification.querySelector(".notification-close");

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            notification.remove();
        });
    }

    setTimeout(() => {

        if (
            notification &&
            document.body.contains(notification)
        ) {
            notification.classList.add("hide");

            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }

    }, 4000);
}


/* =====================================================
   DONOR SEARCH - MYSQL BACKEND
   ===================================================== */

const donorSearchForm =
    document.getElementById("donorSearchForm");

if (donorSearchForm) {

    donorSearchForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const bloodGroup =
                document.getElementById("bloodGroup")?.value;

            const location =
                document
                    .getElementById("location")
                    ?.value
                    .trim();


            if (!bloodGroup || !location) {

                showNotification(
                    "Please select a blood group and enter your location.",
                    "error"
                );

                return;
            }


            try {

                showNotification(
                    "Searching for donors...",
                    "success"
                );


                const response = await fetch(
                    `/api/donors?bloodGroup=${encodeURIComponent(
                        bloodGroup
                    )}&location=${encodeURIComponent(
                        location
                    )}`
                );


                const data =
                    await response.json();


                if (!response.ok || !data.success) {

                    showNotification(
                        data.message ||
                        "Unable to search donors.",
                        "error"
                    );

                    return;
                }


                donors = data.donors.map(donor => ({

                    id: donor.id,

                    name: donor.name,

                    bloodGroup:
                        donor.blood_group,

                    city:
                        donor.city,

                    area:
                        donor.area,

                    age:
                        donor.age,

                    lastDonation:
                        donor.last_donation_date
                            ? donor.last_donation_date
                            : "Not provided",

                    available:
                        Number(donor.availability) === 1

                }));


                displayDonors(
                    donors,
                    bloodGroup,
                    location
                );


                showNotification(
                    `Found ${donors.length} donor${
                        donors.length !== 1 ? "s" : ""
                    } for ${bloodGroup} near ${location}.`,
                    "success"
                );


                console.log(
                    "Donors from MySQL:",
                    donors
                );


            } catch (error) {

                console.error(
                    "Donor search error:",
                    error
                );

                showNotification(
                    "Unable to connect to the backend.",
                    "error"
                );
            }
        }
    );
}


/* =====================================================
   DISPLAY DONORS
   ===================================================== */

function displayDonors(
    matchingDonors,
    bloodGroup,
    location
) {

    const resultsSection =
        document.getElementById("donor-results");

    const donorResults =
        document.getElementById("donorResults");

    const resultsCount =
        document.getElementById("resultsCount");

    const resultsSubtitle =
        document.getElementById("resultsSubtitle");

    const noResults =
        document.getElementById("noResults");


    if (!resultsSection) {
        return;
    }


    resultsSection.classList.add("show");


    if (resultsSubtitle) {
        resultsSubtitle.textContent =
            `${bloodGroup} donors available near ${location}`;
    }


    if (resultsCount) {
        resultsCount.textContent =
            `${matchingDonors.length} donor${
                matchingDonors.length !== 1 ? "s" : ""
            }`;
    }


    if (donorResults) {
        donorResults.innerHTML = "";
    }


    if (matchingDonors.length === 0) {

        if (noResults) {
            noResults.classList.add("show");
        }

        if (donorResults) {
            donorResults.style.display = "none";
        }

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        return;
    }


    if (noResults) {
        noResults.classList.remove("show");
    }


    if (donorResults) {
        donorResults.style.display = "grid";
    }


    matchingDonors.forEach(donor => {

        const firstLetter =
            donor.name.charAt(0).toUpperCase();


        const availabilityClass =
            donor.available
                ? "available"
                : "unavailable";


        const availabilityText =
            donor.available
                ? "Available"
                : "Currently unavailable";


        const card =
            document.createElement("article");


        card.className = "donor-card";


        card.innerHTML = `

            <div class="donor-top">

                <div class="donor-info">

                    <div class="donor-avatar">
                        ${firstLetter}
                    </div>

                    <div>

                        <div class="donor-name">
                            ${donor.name}
                        </div>

                        <div class="donor-location">
                            📍 ${donor.area}, ${donor.city}
                        </div>

                    </div>

                </div>


                <div class="availability ${availabilityClass}">

                    <span class="availability-dot"></span>

                    ${availabilityText}

                </div>

            </div>


            <div class="donor-details">

                <div class="donor-detail">

                    <span class="detail-icon">
                        🩸
                    </span>

                    <div>

                        <strong>
                            ${donor.bloodGroup}
                        </strong>

                        <span>
                            Blood Group
                        </span>

                    </div>

                </div>


                <div class="donor-detail">

                    <span class="detail-icon">
                        👤
                    </span>

                    <div>

                        <strong>
                            ${donor.age} years
                        </strong>

                        <span>
                            Age
                        </span>

                    </div>

                </div>


                <div class="donor-detail">

                    <span class="detail-icon">
                        📅
                    </span>

                    <div>

                        <strong>
                            ${donor.lastDonation}
                        </strong>

                        <span>
                            Last Donation
                        </span>

                    </div>

                </div>


                <div class="donor-detail">

                    <span class="detail-icon">
                        📍
                    </span>

                    <div>

                        <strong>
                            ${donor.city}
                        </strong>

                        <span>
                            Location
                        </span>

                    </div>

                </div>

            </div>


            <div class="donor-actions">

                <button
                    class="view-profile-btn"
                    onclick="viewDonorProfile(${donor.id})"
                >
                    View Profile
                </button>


                <button
                    class="request-btn"
                    onclick="requestBlood(${donor.id})"
                >
                    Request Blood
                </button>

            </div>

        `;


        if (donorResults) {
            donorResults.appendChild(card);
        }

    });


    setTimeout(() => {

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 200);
}


/* =====================================================
   DONOR PROFILE
   ===================================================== */

function viewDonorProfile(donorId) {

    const donor =
        donors.find(
            donor => donor.id === donorId
        );


    if (!donor) {
        return;
    }


    showNotification(
        `Viewing ${donor.name}'s donor profile.`,
        "success"
    );


    console.log(
        "Selected donor:",
        donor
    );
}


/* =====================================================
   REQUEST BLOOD FROM DONOR
   ===================================================== */

function requestBlood(donorId) {

    const donor =
        donors.find(
            donor => donor.id === donorId
        );


    if (!donor) {
        return;
    }


    if (!donor.available) {

        showNotification(
            `${donor.name} is currently unavailable.`,
            "error"
        );

        return;
    }


    const requestSection =
        document.getElementById("request");


    if (requestSection) {

        requestSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    const requestBloodGroup =
        document.getElementById("requestBloodGroup");


    if (requestBloodGroup) {
        requestBloodGroup.value =
            donor.bloodGroup;
    }


    showNotification(
        `Blood request started for ${donor.name}.`,
        "success"
    );
}


/* =====================================================
   BLOOD REQUEST - BACKEND CONNECTED
   ===================================================== */

const bloodRequestForm =
    document.getElementById("bloodRequestForm");


if (bloodRequestForm) {

    bloodRequestForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const patientName =
                document
                    .getElementById("patientName")
                    ?.value
                    .trim();


            const bloodGroup =
                document
                    .getElementById("requestBloodGroup")
                    ?.value;


            const units =
                Number(
                    document
                        .getElementById("unitsRequired")
                        ?.value
                );


            const hospital =
                document
                    .getElementById("hospitalName")
                    ?.value
                    .trim();


            const city =
                document
                    .getElementById("requestCity")
                    ?.value
                    .trim();


            const phone =
                document
                    .getElementById("contactNumber")
                    ?.value
                    .trim();


            const urgency =
                document
                    .getElementById("urgency")
                    ?.value;


            const requiredDate =
                document
                    .getElementById("requiredDate")
                    ?.value;


            const message =
                document
                    .getElementById("requestMessage")
                    ?.value
                    .trim();


            const phonePattern =
                /^[0-9]{10}$/;


            if (
                !patientName ||
                !bloodGroup ||
                !units ||
                !hospital ||
                !city ||
                !phone ||
                !urgency ||
                !requiredDate
            ) {

                showNotification(
                    "Please fill in all required blood request fields.",
                    "error"
                );

                return;
            }


            if (!phonePattern.test(phone)) {

                showNotification(
                    "Please enter a valid 10-digit contact number.",
                    "error"
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/blood-requests",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                patient_name:
                                    patientName,

                                blood_group:
                                    bloodGroup,

                                units_required:
                                    units,

                                hospital_name:
                                    hospital,

                                city:
                                    city,

                                contact_number:
                                    phone,

                                urgency:
                                    urgency,

                                required_date:
                                    requiredDate,

                                message:
                                    message

                            })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        "Blood request submission failed."
                    );
                }


                showNotification(
                    "Blood request submitted successfully!",
                    "success"
                );


                bloodRequestForm.reset();


            } catch (error) {

                console.error(
                    "Blood request error:",
                    error
                );


                showNotification(
                    error.message ||
                    "Unable to submit the request right now.",
                    "error"
                );
            }

        }
    );
}


/* =====================================================
   DARK / LIGHT THEME
   ===================================================== */

const themeToggle =
    document.getElementById("themeToggle");

const themeIcon =
    document.getElementById("themeIcon");


const savedTheme =
    localStorage.getItem(
        "bloodconnect-theme"
    );


if (savedTheme === "dark") {

    document.documentElement.setAttribute(
        "data-theme",
        "dark"
    );


    if (themeIcon) {
        themeIcon.textContent = "☀";
    }
}


if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        () => {

            const currentTheme =
                document.documentElement.getAttribute(
                    "data-theme"
                );


            if (currentTheme === "dark") {

                document.documentElement.removeAttribute(
                    "data-theme"
                );


                localStorage.setItem(
                    "bloodconnect-theme",
                    "light"
                );


                if (themeIcon) {
                    themeIcon.textContent = "☾";
                }


            } else {

                document.documentElement.setAttribute(
                    "data-theme",
                    "dark"
                );


                localStorage.setItem(
                    "bloodconnect-theme",
                    "dark"
                );


                if (themeIcon) {
                    themeIcon.textContent = "☀";
                }
            }

        }
    );
}


/* =====================================================
   DONOR REGISTRATION - BACKEND CONNECTED
   ===================================================== */

const donorRegistrationForm =
    document.getElementById(
        "donorRegistrationForm"
    );


if (donorRegistrationForm) {

    donorRegistrationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document
                    .getElementById("donorName")
                    ?.value
                    .trim();


            const email =
                document
                    .getElementById("donorEmail")
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById("donorPassword")
                    ?.value;


            const phone =
                document
                    .getElementById("donorPhone")
                    ?.value
                    .trim();


            const age =
                Number(
                    document
                        .getElementById("donorAge")
                        ?.value
                );


            const bloodGroup =
                document
                    .getElementById("donorBloodGroup")
                    ?.value;


            const gender =
                document
                    .getElementById("donorGender")
                    ?.value;


            const city =
                document
                    .getElementById("donorCity")
                    ?.value
                    .trim();


            const area =
                document
                    .getElementById("donorArea")
                    ?.value
                    .trim();


            const lastDonation =
                document
                    .getElementById("lastDonationDate")
                    ?.value;


            const availability =
                document
                    .getElementById("donorAvailability")
                    ?.value;


            const termsAccepted =
                document
                    .getElementById("donorTerms")
                    ?.checked;


            const phonePattern =
                /^[0-9]{10}$/;


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !name ||
                !email ||
                !password ||
                !phone ||
                !age ||
                !bloodGroup ||
                !gender ||
                !city ||
                !area ||
                !availability
            ) {

                showNotification(
                    "Please fill in all required registration fields.",
                    "error"
                );

                return;
            }


            if (!emailPattern.test(email)) {

                showNotification(
                    "Please enter a valid email address.",
                    "error"
                );

                return;
            }


            if (!phonePattern.test(phone)) {

                showNotification(
                    "Please enter a valid 10-digit phone number.",
                    "error"
                );

                return;
            }


            if (age < 18 || age > 65) {

                showNotification(
                    "Donor age must be between 18 and 65.",
                    "error"
                );

                return;
            }


            if (password.length < 6) {

                showNotification(
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;
            }


            if (!termsAccepted) {

                showNotification(
                    "Please accept the terms to continue.",
                    "error"
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/donors",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                name:
                                    name,

                                email:
                                    email,

                                password:
                                    password,

                                phone:
                                    phone,

                                age:
                                    age,

                                blood_group:
                                    bloodGroup,

                                gender:
                                    gender,

                                city:
                                    city,

                                area:
                                    area,

                                last_donation_date:
                                    lastDonation ||
                                    null,

                                availability:
                                    availability

                            })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        "Donor registration failed."
                    );
                }


                showNotification(
                    `Welcome to BloodConnect, ${name}! Registration successful.`,
                    "success"
                );


                donorRegistrationForm.reset();


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                showNotification(
                    error.message ||
                    "Unable to register right now. Please make sure the backend is running.",
                    "error"
                );
            }

        }
    );
}


/* =====================================================
   LOGIN
   ===================================================== */

const loginForm =
    document.getElementById("loginForm");

const loginSection =
    document.getElementById("login");

const dashboard =
    document.getElementById("dashboard");


/* =====================================================
   PASSWORD SHOW / HIDE
   ===================================================== */

const passwordToggle =
    document.getElementById("passwordToggle");

const loginPassword =
    document.getElementById("loginPassword");


if (passwordToggle && loginPassword) {

    passwordToggle.addEventListener(
        "click",
        () => {

            if (
                loginPassword.type ===
                "password"
            ) {

                loginPassword.type =
                    "text";

                passwordToggle.textContent =
                    "Hide";

                passwordToggle.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                loginPassword.type =
                    "password";

                passwordToggle.textContent =
                    "Show";

                passwordToggle.setAttribute(
                    "aria-label",
                    "Show password"
                );
            }

        }
    );
}


/* =====================================================
   DASHBOARD AVAILABILITY ELEMENTS
   ===================================================== */

const availabilityToggle =
    document.getElementById(
        "availabilityToggle"
    );

const availabilityStatus =
    document.getElementById(
        "dashboardAvailability"
    );

const availabilityMessage =
    document.getElementById(
        "availabilityMessage"
    );


/* =====================================================
   GET LOGGED-IN DONOR
   ===================================================== */

function getLoggedInDonor() {

    try {

        const localDonor =
            localStorage.getItem(
                "bloodconnect-donor"
            );


        const sessionDonor =
            sessionStorage.getItem(
                "bloodconnect-donor"
            );


        const savedDonor =
            localDonor ||
            sessionDonor;


        return savedDonor
            ? JSON.parse(savedDonor)
            : null;


    } catch (error) {

        console.error(
            "Saved donor data error:",
            error
        );

        return null;
    }
}


/* =====================================================
   UPDATE AVAILABILITY UI
   ===================================================== */

function updateAvailabilityUI(
    isAvailable
) {

    if (availabilityToggle) {

        availabilityToggle.checked =
            isAvailable;
    }


    if (availabilityStatus) {

        availabilityStatus.textContent =
            isAvailable
                ? "Available"
                : "Unavailable";


        availabilityStatus.style.color =
            isAvailable
                ? "var(--success)"
                : "var(--muted)";
    }


    if (availabilityMessage) {

        availabilityMessage.textContent =
            isAvailable
                ? "Your profile is currently visible to people searching for donors."
                : "Your profile is hidden from new donor searches.";
    }
}


/* =====================================================
   SHOW DASHBOARD
   ===================================================== */

function showDashboard(
    name,
    bloodGroup,
    availability = 1
) {

    if (!dashboard) {
        return;
    }


    const dashboardName =
        document.getElementById(
            "dashboardName"
        );


    const sidebarName =
        document.getElementById(
            "sidebarName"
        );


    const dashboardAvatar =
        document.getElementById(
            "dashboardAvatar"
        );


    const dashboardBloodGroup =
        document.getElementById(
            "dashboardBloodGroup"
        );


    if (dashboardName) {
        dashboardName.textContent =
            name;
    }


    if (sidebarName) {
        sidebarName.textContent =
            name;
    }


    if (dashboardAvatar) {
        dashboardAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }


    if (dashboardBloodGroup) {
        dashboardBloodGroup.textContent =
            bloodGroup || "O+";
    }


    const isAvailable =
        Number(availability) === 1;


    updateAvailabilityUI(
        isAvailable
    );


    dashboard.classList.add("show");


    if (loginSection) {
        loginSection.style.display =
            "none";
    }


    setTimeout(() => {

        dashboard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 150);
}


/* =====================================================
   LOGIN FORM - BACKEND CONNECTED
   ===================================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    ?.value;


            const rememberMe =
                document
                    .getElementById(
                        "rememberMe"
                    )
                    ?.checked;


            if (!email || !password) {

                showNotification(
                    "Please enter your email and password.",
                    "error"
                );

                return;
            }


            if (password.length < 6) {

                showNotification(
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                email:
                                    email,

                                password:
                                    password

                            })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        "Invalid email or password."
                    );
                }


                /* =====================================
                   GET REAL DONOR FROM MYSQL
                   ===================================== */

                const donor =
                    data.donor ||
                    data.user ||
                    {};


                const donorName =
                    donor.name ||
                    "BloodConnect Donor";


                const donorBloodGroup =
                    donor.blood_group ||
                    donor.bloodGroup ||
                    "O+";


                /* =====================================
                   BASIC LOGIN DATA
                   ===================================== */

                const userData = {

                    id:
                        donor.id,

                    name:
                        donorName,

                    email:
                        donor.email ||
                        email,

                    bloodGroup:
                        donorBloodGroup

                };
                /* SAVE FULL DONOR DATA */
localStorage.setItem(
    "bloodconnect-donor",
    JSON.stringify(donor)
);


                /* =====================================
                   FULL DONOR DATA
                   THIS IS IMPORTANT FOR DASHBOARD
                   AVAILABILITY UPDATE
                   ===================================== */

                const donorData = {

                    id:
                        donor.id,

                    name:
                        donorName,

                    email:
                        donor.email ||
                        email,

                    phone:
                        donor.phone ||
                        "",

                    age:
                        donor.age ||
                        "",

                    bloodGroup:
                        donorBloodGroup,

                    blood_group:
                        donorBloodGroup,

                    gender:
                        donor.gender ||
                        "",

                    city:
                        donor.city ||
                        "",

                    area:
                        donor.area ||
                        "",

                    lastDonation:
                        donor.last_donation_date ||
                        "",

                    last_donation_date:
                        donor.last_donation_date ||
                        null,

                    availability:
                        Number(
                            donor.availability
                        ) === 1
                            ? 1
                            : 0
                };


                /* =====================================
                   SAVE LOGIN SESSION
                   ===================================== */

                if (rememberMe) {

                    localStorage.setItem(
                        "bloodconnect-user",
                        JSON.stringify(
                            userData
                        )
                    );


                    localStorage.setItem(
                        "bloodconnect-donor",
                        JSON.stringify(
                            donorData
                        )
                    );


                    sessionStorage.removeItem(
                        "bloodconnect-user"
                    );


                    sessionStorage.removeItem(
                        "bloodconnect-donor"
                    );


                } else {

                    sessionStorage.setItem(
                        "bloodconnect-user",
                        JSON.stringify(
                            userData
                        )
                    );


                    sessionStorage.setItem(
                        "bloodconnect-donor",
                        JSON.stringify(
                            donorData
                        )
                    );


                    localStorage.removeItem(
                        "bloodconnect-user"
                    );


                    localStorage.removeItem(
                        "bloodconnect-donor"
                    );
                }


                /* =====================================
                   LOGIN SUCCESS
                   ===================================== */

                showNotification(
                    "Login successful! Welcome back.",
                    "success"
                );


                setTimeout(() => {

                    showDashboard(
                        donorName,
                        donorBloodGroup,
                        donorData.availability
                    );

                }, 500);


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                showNotification(
                    error.message ||
                    "Unable to login right now. Please make sure the backend is running.",
                    "error"
                );
            }

        }
    );
}


/* =====================================================
   DASHBOARD AVAILABILITY
   MYSQL CONNECTED
   ===================================================== */

if (availabilityToggle) {

    availabilityToggle.addEventListener(
        "change",
        async function () {

            /* Get logged-in donor */

            const donor =
                getLoggedInDonor();


            if (!donor || !donor.id) {

                showNotification(
                    "Please login again.",
                    "error"
                );


                this.checked =
                    !this.checked;


                return;
            }


            /* Old database value */

            const oldAvailability =
                Number(
                    donor.availability
                ) === 1
                    ? 1
                    : 0;


            /* New value */

            const newAvailability =
                this.checked
                    ? 1
                    : 0;


            try {

                /* =====================================
                   UPDATE MYSQL
                   ===================================== */

                const response =
                    await fetch(
                        `/api/donors/${donor.id}/availability`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                availability:
                                    newAvailability

                            })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Availability update failed."
                    );
                }


                /* =====================================
                   UPDATE LOCAL DONOR DATA
                   ===================================== */

                donor.availability =
                    newAvailability;


                /* Check which storage is being used */

                const storage =
                    localStorage.getItem(
                        "bloodconnect-donor"
                    )
                        ? localStorage
                        : sessionStorage;


                storage.setItem(
                    "bloodconnect-donor",
                    JSON.stringify(donor)
                );


                /* =====================================
                   UPDATE DASHBOARD UI
                   ===================================== */

                updateAvailabilityUI(
                    newAvailability === 1
                );


                /* =====================================
                   SUCCESS MESSAGE
                   ===================================== */

                if (newAvailability === 1) {

                    showNotification(
                        "You are now available for blood requests.",
                        "success"
                    );

                } else {

                    showNotification(
                        "Your donor availability has been turned off.",
                        "success"
                    );
                }


            } catch (error) {

                console.error(
                    "Availability error:",
                    error
                );


                /* =====================================
                   REVERT TO OLD VALUE
                   ===================================== */

                this.checked =
                    oldAvailability === 1;


                updateAvailabilityUI(
                    oldAvailability === 1
                );


                showNotification(
                    error.message ||
                    "Unable to update availability.",
                    "error"
                );
            }

        }
    );
}


/* =====================================================
   LOGOUT
   ===================================================== */

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            if (dashboard) {
                dashboard.classList.remove(
                    "show"
                );
            }


            if (loginSection) {
                loginSection.style.display =
                    "";
            }


            /* Remove login data */

            localStorage.removeItem(
                "bloodconnect-user"
            );


            localStorage.removeItem(
                "bloodconnect-donor"
            );


            sessionStorage.removeItem(
                "bloodconnect-user"
            );


            sessionStorage.removeItem(
                "bloodconnect-donor"
            );


            showNotification(
                "You have been logged out.",
                "success"
            );


            setTimeout(() => {

                if (loginSection) {

                    loginSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }, 200);

        }
    );
}


/* =====================================================
   BLOOD GROUP CARDS
   ===================================================== */

const bloodCards =
    document.querySelectorAll(
        ".blood-card"
    );


bloodCards.forEach(card => {

    card.addEventListener(
        "click",
        () => {

            const groupElement =
                card.querySelector("span");


            if (!groupElement) {
                return;
            }


            const selectedGroup =
                groupElement.textContent;


            const bloodGroupSelect =
                document.getElementById(
                    "bloodGroup"
                );


            if (bloodGroupSelect) {

                bloodGroupSelect.value =
                    selectedGroup.replace(
                        "−",
                        "-"
                    );
            }


            const findDonor =
                document.getElementById(
                    "find-donor"
                );


            if (findDonor) {

                findDonor.scrollIntoView({
                    behavior: "smooth"
                });
            }

        }
    );

});

/* =====================================================
   SMOOTH NAVIGATION
   ===================================================== */

document
    .querySelectorAll('a[href^="#"]')
    .forEach(link => {

        link.addEventListener(
            "click",
            function (event) {

                const targetId =
                    this.getAttribute("href");


                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }


                const target =
                    document.querySelector(targetId);


                if (!target) {
                    return;
                }


                event.preventDefault();


                /* =====================================
                   SHOW LOGIN SECTION
                   ===================================== */

                if (targetId === "#login") {

                    if (loginSection) {
                        loginSection.style.display =
                            "";
                    }

                    if (dashboard) {
                        dashboard.classList.remove(
                            "show"
                        );
                    }
                }


                /* =====================================
                   SCROLL TO TARGET
                   ===================================== */

                setTimeout(() => {

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }, 50);

            }
        );

    });
/* =====================================================
   DONOR STATISTICS
   ===================================================== */

function animateCounter(
    element,
    target
) {

    let current = 0;

    const duration = 1500;

    const increment =
        target /
        (duration / 20);


    const counter =
        setInterval(
            () => {

                current +=
                    increment;


                if (
                    current >=
                    target
                ) {

                    current =
                        target;

                    clearInterval(
                        counter
                    );
                }


                element.textContent =
                    Math.floor(
                        current
                    )
                    .toLocaleString() +
                    "+";

            },
            20
        );
}


/* =====================================================
   STATISTICS INTERSECTION OBSERVER
   ===================================================== */

const statsSection =
    document.querySelector(
        ".stats-section"
    );


let statsAnimated = false;


if (statsSection) {

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting &&
                            !statsAnimated
                        ) {

                            statsAnimated =
                                true;


                            const stats =
                                document.querySelectorAll(
                                    ".stat-item strong"
                                );


                            const values = [
                                1250,
                                320,
                                28,
                                98
                            ];


                            stats.forEach(
                                (
                                    stat,
                                    index
                                ) => {

                                    if (
                                        values[index] !==
                                        undefined
                                    ) {

                                        animateCounter(
                                            stat,
                                            values[index]
                                        );
                                    }

                                }
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.3
            }
        );


    observer.observe(
        statsSection
    );
}


/* =====================================================
   RESTORE LOGIN SESSION
   ===================================================== */

function restoreLoggedInUser() {

    let savedUser = null;

    let savedDonor = null;


    try {

        /* =====================================
           GET FULL DONOR DATA
           ===================================== */

        const localDonor =
            localStorage.getItem(
                "bloodconnect-donor"
            );


        const sessionDonor =
            sessionStorage.getItem(
                "bloodconnect-donor"
            );


        const donorData =
            localDonor ||
            sessionDonor;


        if (donorData) {

            savedDonor =
                JSON.parse(
                    donorData
                );
        }


        /* =====================================
           GET BASIC USER DATA
           ===================================== */

        const localUser =
            localStorage.getItem(
                "bloodconnect-user"
            );


        const sessionUser =
            sessionStorage.getItem(
                "bloodconnect-user"
            );


        const userData =
            localUser ||
            sessionUser;


        if (userData) {

            savedUser =
                JSON.parse(
                    userData
                );
        }


    } catch (error) {

        console.error(
            "Saved user data error:",
            error
        );
    }


    /* =====================================
       RESTORE USING FULL DONOR DATA
       ===================================== */

    if (
        savedDonor &&
        savedDonor.name
    ) {

        showDashboard(

            savedDonor.name,

            savedDonor.blood_group ||
            savedDonor.bloodGroup ||
            "O+",

            savedDonor.availability

        );


    } else if (
        savedUser &&
        savedUser.name
    ) {

        showDashboard(

            savedUser.name,

            savedUser.bloodGroup ||
            "O+",

            0

        );
    }
}


/* =====================================================
   PAGE LOAD
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        restoreLoggedInUser();


        console.log(
            "🩸 BloodConnect loaded successfully!"
        );

    }
);


/* =====================================================
   FINAL CHECK
   ===================================================== */

console.log(
    "🩸 BLOODCONNECT SCRIPT.JS IS WORKING!"
);
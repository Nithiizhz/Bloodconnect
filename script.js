/* =========================================================
   BLOODCONNECT - SCRIPT.JS
   Complete Frontend + Backend Connected Version
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let donors = [];
let selectedDonorId = null;
let incomingRequestsLoadedFor = null;


/* =========================================================
   HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

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
            ${escapeHtml(message)}
        </span>

        <button
            class="notification-close"
            type="button"
            aria-label="Close notification"
        >
            ×
        </button>
    `;

    document.body.appendChild(notification);

    notification
        .querySelector(".notification-close")
        ?.addEventListener("click", () => {
            notification.remove();
        });

    setTimeout(() => {

        if (!document.body.contains(notification)) {
            return;
        }

        notification.classList.add("hide");

        setTimeout(() => {
            notification.remove();
        }, 300);

    }, 4000);
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

const menuBtn = $("menuBtn");
const navLinks = document.querySelector(".nav-links");
const navActions = document.querySelector(".nav-actions");

if (menuBtn && navLinks && navActions) {

    menuBtn.addEventListener("click", () => {

        const isOpen =
            navLinks.classList.toggle("mobile-open");

        navActions.classList.toggle(
            "mobile-open",
            isOpen
        );

        menuBtn.innerHTML =
            isOpen ? "✕" : "☰";
    });
}

document
    .querySelectorAll(".nav-links a")
    .forEach(link => {

        link.addEventListener("click", () => {

            navLinks?.classList.remove(
                "mobile-open"
            );

            navActions?.classList.remove(
                "mobile-open"
            );

            if (menuBtn) {
                menuBtn.innerHTML = "☰";
            }
        });
    });


/* =========================================================
   THEME
   ========================================================= */

const themeToggle = $("themeToggle");
const themeIcon = $("themeIcon");

function applyTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme === "dark" ? "dark" : "light"
    );

    if (themeIcon) {
        themeIcon.textContent =
            theme === "dark" ? "☀️" : "🌙";
    }
}

const savedTheme =
    localStorage.getItem("bloodconnect-theme") ||
    "light";

applyTheme(savedTheme);

if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        const currentTheme =
            document.documentElement.getAttribute(
                "data-theme"
            );

        const newTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";

        localStorage.setItem(
            "bloodconnect-theme",
            newTheme
        );

        applyTheme(newTheme);
    });
}


/* =========================================================
   DONOR SEARCH
   ========================================================= */

const donorSearchForm =
    $("donorSearchForm");

if (donorSearchForm) {

    donorSearchForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const bloodGroup =
                $("bloodGroup")?.value;

            const location =
                $("location")
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

                const response =
                    await fetch(
                        `/api/donors?bloodGroup=${encodeURIComponent(
                            bloodGroup
                        )}&location=${encodeURIComponent(
                            location
                        )}`
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    !data.success
                ) {
                    throw new Error(
                        data.message ||
                        "Unable to search donors."
                    );
                }

                donors =
                    (data.donors || [])
                        .map(donor => ({

                            id: donor.id,
                            name: donor.name,
                            bloodGroup:
                                donor.blood_group,
                            email: donor.email,
                            phone: donor.phone,
                            age: donor.age,

                            gender:
                                donor.gender ||
                                "Not provided",

                            city: donor.city,
                            area: donor.area,

                            lastDonation:
                                donor.last_donation_date ||
                                "Not provided",

                            available:
                                Number(
                                    donor.availability
                                ) === 1

                        }));

                displayDonors(
                    donors,
                    bloodGroup,
                    location
                );

                showNotification(
                    `Found ${donors.length} donor${
                        donors.length !== 1
                            ? "s"
                            : ""
                    } for ${bloodGroup} near ${location}.`,
                    "success"
                );

            } catch (error) {

                console.error(
                    "Donor search error:",
                    error
                );

                showNotification(
                    error.message ||
                    "Unable to connect to the backend.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   DISPLAY DONORS
   ========================================================= */

function displayDonors(
    matchingDonors,
    bloodGroup,
    location
) {

    const resultsSection =
        $("donor-results");

    const donorResults =
        $("donorResults");

    const resultsCount =
        $("resultsCount");

    const resultsSubtitle =
        $("resultsSubtitle");

    const noResults =
        $("noResults");

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
                matchingDonors.length !== 1
                    ? "s"
                    : ""
            }`;
    }

    if (donorResults) {
        donorResults.innerHTML = "";
    }

    if (matchingDonors.length === 0) {

        noResults?.classList.add("show");

        if (donorResults) {
            donorResults.style.display = "none";
        }

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        return;
    }

    noResults?.classList.remove("show");

    if (donorResults) {
        donorResults.style.display = "grid";
    }

    matchingDonors.forEach(donor => {

        const card =
            document.createElement("article");

        card.className = "donor-card";

        const firstLetter =
            (donor.name || "D")
                .charAt(0)
                .toUpperCase();

        const availabilityClass =
            donor.available
                ? "available"
                : "unavailable";

        const availabilityText =
            donor.available
                ? "Available"
                : "Currently unavailable";

        card.innerHTML = `

            <div class="donor-top">

                <div class="donor-info">

                    <div class="donor-avatar">
                        ${escapeHtml(firstLetter)}
                    </div>

                    <div>

                        <div class="donor-name">
                            ${escapeHtml(donor.name)}
                        </div>

                        <div class="donor-location">
                            📍
                            ${escapeHtml(
                                donor.area || "Area"
                            )},
                            ${escapeHtml(
                                donor.city || "City"
                            )}
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
                    <span class="detail-icon">🩸</span>
                    <div>
                        <strong>
                            ${escapeHtml(
                                donor.bloodGroup || "—"
                            )}
                        </strong>
                        <span>Blood Group</span>
                    </div>
                </div>

                <div class="donor-detail">
                    <span class="detail-icon">👤</span>
                    <div>
                        <strong>
                            ${escapeHtml(
                                donor.age || "—"
                            )} years
                        </strong>
                        <span>Age</span>
                    </div>
                </div>

                <div class="donor-detail">
                    <span class="detail-icon">📅</span>
                    <div>
                        <strong>
                            ${escapeHtml(
                                donor.lastDonation
                            )}
                        </strong>
                        <span>Last Donation</span>
                    </div>
                </div>

                <div class="donor-detail">
                    <span class="detail-icon">📍</span>
                    <div>
                        <strong>
                            ${escapeHtml(
                                donor.city || "—"
                            )}
                        </strong>
                        <span>Location</span>
                    </div>
                </div>

            </div>


            <div class="donor-actions">

                <button
                    type="button"
                    class="view-profile-btn"
                    onclick="viewDonorProfile(${Number(donor.id)})"
                >
                    View Profile
                </button>

                <button
                    type="button"
                    class="request-btn"
                    onclick="requestBlood(${Number(donor.id)})"
                    ${!donor.available ? "disabled" : ""}
                >
                    Request Blood
                </button>

            </div>

        `;

        donorResults?.appendChild(card);
    });

    setTimeout(() => {

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 200);
}


/* =========================================================
   DONOR PROFILE
   ========================================================= */

function viewDonorProfile(donorId) {

    const donor =
        donors.find(
            item =>
                Number(item.id) ===
                Number(donorId)
        );

    if (!donor) {
        return;
    }

    $("donorProfileModal")?.remove();

    const modal =
        document.createElement("div");

    modal.id = "donorProfileModal";

    modal.innerHTML = `

        <div class="profile-modal-overlay">

            <div class="profile-modal">

                <button
                    type="button"
                    class="profile-modal-close"
                    aria-label="Close profile"
                >
                    ×
                </button>

                <div class="profile-avatar">
                    ${escapeHtml(
                        donor.name
                            .charAt(0)
                            .toUpperCase()
                    )}
                </div>

                <h2>
                    ${escapeHtml(donor.name)}
                </h2>

                <p class="profile-location">
                    📍
                    ${escapeHtml(
                        donor.area || "Area"
                    )},
                    ${escapeHtml(
                        donor.city || "City"
                    )}
                </p>

                <div class="profile-status ${
                    donor.available
                        ? "available"
                        : "unavailable"
                }">
                    ●
                    ${
                        donor.available
                            ? "Available for donation"
                            : "Currently unavailable"
                    }
                </div>

                <div class="profile-details">

                    <div class="profile-detail">
                        <span>🩸</span>
                        <div>
                            <strong>
                                ${escapeHtml(
                                    donor.bloodGroup || "—"
                                )}
                            </strong>
                            <small>Blood Group</small>
                        </div>
                    </div>

                    <div class="profile-detail">
                        <span>👤</span>
                        <div>
                            <strong>
                                ${escapeHtml(
                                    donor.age || "—"
                                )} years
                            </strong>
                            <small>Age</small>
                        </div>
                    </div>

                    <div class="profile-detail">
                        <span>⚧</span>
                        <div>
                            <strong>
                                ${escapeHtml(
                                    donor.gender ||
                                    "Not provided"
                                )}
                            </strong>
                            <small>Gender</small>
                        </div>
                    </div>

                    <div class="profile-detail">
                        <span>📍</span>
                        <div>
                            <strong>
                                ${escapeHtml(
                                    donor.city || "—"
                                )}
                            </strong>
                            <small>City</small>
                        </div>
                    </div>

                    <div class="profile-detail">
                        <span>🏠</span>
                        <div>
                            <strong>
                                ${escapeHtml(
                                    donor.area || "—"
                                )}
                            </strong>
                            <small>Area</small>
                        </div>
                    </div>

                    <div class="profile-detail">
                        <span>📅</span>
                        <div>
                            <strong>
                                ${escapeHtml(
                                    donor.lastDonation ||
                                    "Not provided"
                                )}
                            </strong>
                            <small>Last Donation</small>
                        </div>
                    </div>

                </div>

                <div class="profile-actions">

                    <button
                        type="button"
                        class="profile-request-btn"
                        ${
                            !donor.available
                                ? "disabled"
                                : ""
                        }
                    >
                        Request Blood
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal
        .querySelector(".profile-modal-close")
        ?.addEventListener(
            "click",
            () => modal.remove()
        );

    modal
        .querySelector(".profile-request-btn")
        ?.addEventListener(
            "click",
            () => {

                modal.remove();

                requestBlood(donor.id);
            }
        );

    const overlay =
        modal.querySelector(
            ".profile-modal-overlay"
        );

    overlay?.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                modal.remove();
            }

        }
    );
}


/* =========================================================
   SELECT DONOR
   ========================================================= */

function requestBlood(donorId) {

    const donor =
        donors.find(
            item =>
                Number(item.id) ===
                Number(donorId)
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

    selectedDonorId =
        Number(donor.id);

    const requestBloodGroup =
        $("requestBloodGroup");

    if (requestBloodGroup) {
        requestBloodGroup.value =
            donor.bloodGroup || "";
    }

    const requestSection =
        $("request");

    requestSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    showNotification(
        `Requesting blood from ${donor.name}.`,
        "success"
    );
}


/* =========================================================
   BLOOD REQUEST FORM
   ========================================================= */

const bloodRequestForm =
    $("bloodRequestForm");

if (bloodRequestForm) {

    bloodRequestForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const patientName =
                $("patientName")
                    ?.value
                    .trim();

            const bloodGroup =
                $("requestBloodGroup")
                    ?.value;

            const units =
                Number(
                    $("unitsRequired")?.value
                );

            const hospital =
                $("hospitalName")
                    ?.value
                    .trim();

            const city =
                $("requestCity")
                    ?.value
                    .trim();

            const phone =
                $("contactNumber")
                    ?.value
                    .trim();

            const urgency =
                $("urgency")?.value;

            const requiredDate =
                $("requiredDate")?.value;

            const message =
                $("requestMessage")
                    ?.value
                    .trim();

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

            if (units < 1) {

                showNotification(
                    "Units required must be at least 1.",
                    "error"
                );

                return;
            }

            if (!/^[0-9]{10}$/.test(phone)) {

                showNotification(
                    "Please enter a valid 10-digit contact number.",
                    "error"
                );

                return;
            }

            try {

                const donorIdForRequest =
                    selectedDonorId;

                const response =
                    await fetch(
                        "/api/blood-requests",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    donor_id:
                                        donorIdForRequest,

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
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Blood request submission failed."
                    );
                }


                /* Save request ID for requester tracking */

                if (data.requestId) {

                    localStorage.setItem(
                        "bloodconnect-last-request",
                        String(data.requestId)
                    );

                    sessionStorage.setItem(
                        "bloodconnect-last-request",
                        String(data.requestId)
                    );
                }


                showNotification(
                    donorIdForRequest
                        ? "Blood request sent to the selected donor successfully!"
                        : "Blood request submitted successfully!",
                    "success"
                );


                bloodRequestForm.reset();

                selectedDonorId = null;


                /*
                 * Show requester tracking section
                 */

                if (data.requestId) {

                    ensureRequesterStatusUI();

                    loadRequesterRequestStatus(
                        data.requestId
                    );
                }


            } catch (error) {

                console.error(
                    "Blood request error:",
                    error
                );

                showNotification(
                    error.message ||
                    "Unable to submit blood request.",
                    "error"
                );
            }

        }
    );
}


/* =========================================================
   DONOR REGISTRATION
   ========================================================= */

const donorRegistrationForm =
    $("donorRegistrationForm");

if (donorRegistrationForm) {

    donorRegistrationForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const name =
                $("donorName")
                    ?.value
                    .trim();

            const email =
                $("donorEmail")
                    ?.value
                    .trim();

            const password =
                $("donorPassword")
                    ?.value;

            const phone =
                $("donorPhone")
                    ?.value
                    .trim();

            const age =
                Number(
                    $("donorAge")?.value
                );

            const bloodGroup =
                $("donorBloodGroup")
                    ?.value;

            const gender =
                $("donorGender")?.value;

            const city =
                $("donorCity")
                    ?.value
                    .trim();

            const area =
                $("donorArea")
                    ?.value
                    .trim();

            const lastDonation =
                $("lastDonationDate")
                    ?.value;

            const availability =
                $("donorAvailability")
                    ?.value;

            const termsAccepted =
                $("donorTerms")
                    ?.checked;

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
                    "Please fill all required registration fields.",
                    "error"
                );

                return;
            }

            if (!/^[0-9]{10}$/.test(phone)) {

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

                            body:
                                JSON.stringify({

                                    name,
                                    email,
                                    password,
                                    phone,
                                    age,

                                    blood_group:
                                        bloodGroup,

                                    gender,
                                    city,
                                    area,

                                    last_donation_date:
                                        lastDonation ||
                                        null,

                                    availability

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
                    "Unable to register right now.",
                    "error"
                );
            }

        }
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

const loginForm = $("loginForm");
const loginSection = $("login");
const dashboard = $("dashboard");
const logoutBtn = $("logoutBtn");


/* Password show / hide */

const passwordToggle =
    $("passwordToggle");

const loginPassword =
    $("loginPassword");

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

            } else {

                loginPassword.type =
                    "password";

                passwordToggle.textContent =
                    "Show";
            }

        }
    );
}


/* =========================================================
   GET LOGGED IN DONOR
   ========================================================= */

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


/* =========================================================
   NAVBAR LOGIN STATE
   ========================================================= */

function updateNavbarForLoginState(
    isLoggedIn
) {

    document
        .querySelectorAll(
            ".nav-actions button, .nav-actions a"
        )
        .forEach(element => {

            const text =
                element.textContent
                    .trim()
                    .toLowerCase();

            if (
                text === "login" ||
                text === "dashboard"
            ) {

                element.textContent =
                    isLoggedIn
                        ? "Dashboard"
                        : "Login";

                element.setAttribute(
                    "href",
                    isLoggedIn
                        ? "#dashboard"
                        : "#login"
                );
            }
        });
}


/* =========================================================
   AVAILABILITY UI
   ========================================================= */

const availabilityToggle =
    $("availabilityToggle");

const availabilityStatus =
    $("dashboardAvailability");

const availabilityMessage =
    $("availabilityMessage");

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


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

function showDashboard(
    name,
    bloodGroup,
    availability = 1
) {

    if (!dashboard) {
        return;
    }

    const dashboardName =
        $("dashboardName");

    const sidebarName =
        $("sidebarName");

    const dashboardAvatar =
        $("dashboardAvatar");

    const dashboardBloodGroup =
        $("dashboardBloodGroup");

    if (dashboardName) {
        dashboardName.textContent = name;
    }

    if (sidebarName) {
        sidebarName.textContent = name;
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

    updateAvailabilityUI(
        Number(availability) === 1
    );

    dashboard.classList.add("show");

    if (loginSection) {
        loginSection.style.display = "none";
    }

    updateNavbarForLoginState(true);

    const donor =
        getLoggedInDonor();

    if (donor?.id) {

        ensureIncomingRequestsUI();

        loadIncomingBloodRequests(
            donor.id
        );
    }

    setTimeout(() => {

        dashboard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 150);
}


/* =========================================================
   LOGIN FORM
   ========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const email =
                $("loginEmail")
                    ?.value
                    .trim();

            const password =
                $("loginPassword")
                    ?.value;

            const rememberMe =
                $("rememberMe")
                    ?.checked;

            if (!email || !password) {

                showNotification(
                    "Please enter your email and password.",
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

                            body:
                                JSON.stringify({
                                    email,
                                    password
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
                        "Invalid email or password."
                    );
                }

                const donor =
                    data.donor || {};

                if (!donor.id) {

                    throw new Error(
                        "Donor information was not returned."
                    );
                }

                if (rememberMe) {

                    localStorage.setItem(
                        "bloodconnect-donor",
                        JSON.stringify(donor)
                    );

                    sessionStorage.removeItem(
                        "bloodconnect-donor"
                    );

                } else {

                    sessionStorage.setItem(
                        "bloodconnect-donor",
                        JSON.stringify(donor)
                    );

                    localStorage.removeItem(
                        "bloodconnect-donor"
                    );
                }

                showNotification(
                    "Login successful! Welcome back.",
                    "success"
                );

                setTimeout(() => {

                    showDashboard(
                        donor.name ||
                            "BloodConnect Donor",

                        donor.blood_group ||
                            donor.bloodGroup ||
                            "O+",

                        donor.availability
                    );

                }, 300);

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showNotification(
                    error.message ||
                    "Unable to login right now.",
                    "error"
                );
            }

        }
    );
}


/* =========================================================
   DONOR AVAILABILITY UPDATE
   ========================================================= */

if (availabilityToggle) {

    availabilityToggle.addEventListener(
        "change",
        async function () {

            const donor =
                getLoggedInDonor();

            if (!donor?.id) {

                this.checked =
                    !this.checked;

                showNotification(
                    "Please login again to update your availability.",
                    "error"
                );

                return;
            }

            const oldAvailability =
                Number(
                    donor.availability
                ) === 1
                    ? 1
                    : 0;

            const newAvailability =
                this.checked ? 1 : 0;

            try {

                const response =
                    await fetch(
                        `/api/donors/${donor.id}/availability`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
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

                donor.availability =
                    newAvailability;

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

                updateAvailabilityUI(
                    newAvailability === 1
                );

                showNotification(
                    newAvailability === 1
                        ? "You are now available for blood requests."
                        : "Your donor availability has been turned off.",
                    "success"
                );

            } catch (error) {

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


/* =========================================================
   INCOMING REQUEST STYLES
   ========================================================= */

function injectIncomingRequestStyles() {

    if ($("bcIncomingRequestStyles")) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "bcIncomingRequestStyles";

    style.textContent = `

        .bc-incoming-requests {
            margin: 24px 0;
            padding: 24px;
            border-radius: 20px;
            background: var(--card-bg, #ffffff);
            border: 1px solid var(--border, #e5e7eb);
            box-shadow: 0 12px 35px rgba(0,0,0,.06);
        }

        .bc-incoming-header {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            margin-bottom:20px;
        }

        .bc-incoming-kicker {
            margin:0 0 5px;
            font-size:12px;
            font-weight:800;
            letter-spacing:.08em;
            text-transform:uppercase;
            color:#ef4444;
        }

        .bc-incoming-title {
            margin:0;
            font-size:22px;
            color:var(--text,#111827);
        }

        .bc-incoming-count {
            min-width:40px;
            height:40px;
            padding:0 12px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border-radius:999px;
            background:#ef4444;
            color:#fff;
            font-weight:800;
        }

        .bc-request-list {
            display:grid;
            gap:14px;
        }

        .bc-request-item {
            display:grid;
            grid-template-columns:64px 1fr auto;
            gap:16px;
            align-items:center;
            padding:18px;
            border-radius:16px;
            border:1px solid var(--border,#e5e7eb);
            background:var(--surface,#fafafa);
        }

        .bc-request-blood {
            width:58px;
            height:58px;
            border-radius:16px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#fee2e2;
            color:#dc2626;
            font-size:17px;
            font-weight:900;
        }

        .bc-request-main strong {
            display:block;
            margin-bottom:6px;
            color:var(--text,#111827);
            font-size:16px;
        }

        .bc-request-meta {
            color:var(--muted,#64748b);
            font-size:13px;
            line-height:1.7;
        }

        .bc-request-message {
            margin-top:8px;
            color:var(--muted,#64748b);
            font-size:13px;
        }

        .bc-request-side {
            min-width:180px;
            text-align:right;
        }

        .bc-request-urgency {
            display:inline-flex;
            padding:5px 10px;
            border-radius:999px;
            font-size:11px;
            font-weight:800;
        }

        .bc-request-urgency.critical {
            background:#fee2e2;
            color:#b91c1c;
        }

        .bc-request-urgency.urgent {
            background:#ffedd5;
            color:#c2410c;
        }

        .bc-request-urgency.normal {
            background:#dcfce7;
            color:#15803d;
        }

        .bc-request-date {
            margin-top:7px;
            color:var(--muted,#64748b);
            font-size:11px;
        }

        .bc-accept-btn {
            width:100%;
            margin-top:12px;
            padding:11px 14px;
            border:0;
            border-radius:10px;
            background:#ef4444;
            color:#fff;
            font-weight:800;
            cursor:pointer;
            transition:.2s ease;
        }

        .bc-accept-btn:hover {
            transform:translateY(-1px);
            filter:brightness(.95);
        }

        .bc-accept-btn:disabled {
            opacity:.65;
            cursor:not-allowed;
            transform:none;
        }

        .bc-accepted-badge {
            display:inline-flex;
            align-items:center;
            justify-content:center;
            margin-top:12px;
            padding:9px 12px;
            border-radius:10px;
            background:#dcfce7;
            color:#15803d;
            font-size:12px;
            font-weight:800;
        }

        .bc-request-status {
            margin-top:10px;
            padding:9px 12px;
            border-radius:10px;
            font-size:12px;
            font-weight:800;
        }

        .bc-request-status.pending {
            background:#fef3c7;
            color:#92400e;
        }

        .bc-request-status.accepted {
            background:#dcfce7;
            color:#15803d;
        }

        .bc-request-empty {
            padding:35px 20px;
            text-align:center;
            color:var(--muted,#64748b);
            border:1px dashed var(--border,#cbd5e1);
            border-radius:16px;
        }

        .bc-request-empty strong {
            display:block;
            color:var(--text,#111827);
        }

        .bc-request-empty-icon {
            display:block;
            margin-bottom:8px;
            font-size:30px;
        }

        .bc-request-refresh {
            margin-top:10px;
            padding:9px 15px;
            border:0;
            border-radius:10px;
            background:#ef4444;
            color:#fff;
            cursor:pointer;
            font-weight:700;
        }

        .bc-requester-status {
            margin:24px 0;
            padding:22px;
            border-radius:18px;
            background:var(--card-bg,#fff);
            border:1px solid var(--border,#e5e7eb);
        }

        .bc-requester-status h3 {
            margin:0 0 5px;
            color:var(--text,#111827);
        }

        .bc-requester-status p {
            margin:5px 0;
            color:var(--muted,#64748b);
        }

        .bc-requester-status-card {
            margin-top:15px;
            padding:16px;
            border-radius:14px;
            background:var(--surface,#fafafa);
        }

        .bc-requester-accepted {
            margin-top:15px;
            padding:15px;
            border-radius:14px;
            background:#dcfce7;
            color:#166534;
        }

        .bc-requester-pending {
            margin-top:15px;
            padding:15px;
            border-radius:14px;
            background:#fef3c7;
            color:#92400e;
        }

        [data-theme="dark"] .bc-incoming-requests,
        [data-theme="dark"] .bc-requester-status {
            background:#111827;
            border-color:#273449;
        }

        [data-theme="dark"] .bc-request-item,
        [data-theme="dark"] .bc-requester-status-card {
            background:#172033;
            border-color:#334155;
        }

        [data-theme="dark"] .bc-incoming-title,
        [data-theme="dark"] .bc-request-main strong,
        [data-theme="dark"] .bc-request-empty strong,
        [data-theme="dark"] .bc-requester-status h3 {
            color:#f8fafc;
        }

        @media(max-width:700px) {

            .bc-incoming-requests,
            .bc-requester-status {
                padding:18px;
            }

            .bc-request-item {
                grid-template-columns:52px 1fr;
            }

            .bc-request-blood {
                width:50px;
                height:50px;
            }

            .bc-request-side {
                grid-column:2;
                min-width:0;
                text-align:left;
            }
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   DASHBOARD REQUEST CONTAINER
   ========================================================= */

function getRequestContainer() {

    if (!dashboard) {
        return null;
    }

    return (
        dashboard.querySelector(
            ".dashboard-content"
        ) ||
        dashboard.querySelector(
            ".dashboard-main"
        ) ||
        dashboard.querySelector(
            ".dashboard-body"
        ) ||
        dashboard
    );
}


/* =========================================================
   CREATE INCOMING REQUEST UI
   ========================================================= */

function ensureIncomingRequestsUI() {

    if (!dashboard) {
        return null;
    }

    injectIncomingRequestStyles();

    let section =
        $("bcIncomingRequests");

    if (section) {
        return section;
    }

    section =
        document.createElement("section");

    section.id =
        "bcIncomingRequests";

    section.className =
        "bc-incoming-requests";

    section.innerHTML = `

        <div class="bc-incoming-header">

            <div>

                <p class="bc-incoming-kicker">
                    Incoming Requests
                </p>

                <h3 class="bc-incoming-title">
                    People who need your blood
                </h3>

            </div>

            <span
                class="bc-incoming-count"
                id="bcIncomingRequestCount"
            >
                0
            </span>

        </div>

        <div
            class="bc-request-list"
            id="bcIncomingRequestList"
        >

            <div class="bc-request-empty">
                <span class="bc-request-empty-icon">
                    🩸
                </span>

                Loading your blood requests...
            </div>

        </div>
    `;

    const container =
        getRequestContainer();

    if (container) {

        const recentSection =
            Array.from(
                container.querySelectorAll(
                    "section, article, .card, .dashboard-card"
                )
            ).find(element =>
                element.textContent
                    .toLowerCase()
                    .includes("recent requests")
            );

        if (
            recentSection &&
            recentSection.parentElement === container
        ) {

            container.insertBefore(
                section,
                recentSection
            );

        } else {

            container.appendChild(section);
        }
    }

    return section;
}


/* =========================================================
   RENDER INCOMING REQUESTS
   ========================================================= */

function renderIncomingBloodRequests(
    requests
) {

    const section =
        ensureIncomingRequestsUI();

    if (!section) {
        return;
    }

    const list =
        $("bcIncomingRequestList");

    const count =
        $("bcIncomingRequestCount");

    const safeRequests =
        Array.isArray(requests)
            ? requests
            : [];

    if (count) {
        count.textContent =
            safeRequests.length;
    }

    if (!list) {
        return;
    }

    if (safeRequests.length === 0) {

        list.innerHTML = `

            <div class="bc-request-empty">

                <span class="bc-request-empty-icon">
                    💗
                </span>

                <strong>
                    No incoming requests yet
                </strong>

                <div style="margin-top:6px;">
                    When someone requests blood
                    from you, it will appear here.
                </div>

            </div>
        `;

        return;
    }

    list.innerHTML =
        safeRequests
            .map(request => {

                const urgency =
                    request.urgency ||
                    "Normal";

                const urgencyClass =
                    getUrgencyClass(
                        urgency
                    );

                const status =
                    request.status ||
                    "Pending";

                const isAccepted =
                    status === "Accepted";

                return `

                    <article
                        class="bc-request-item"
                    >

                        <div class="bc-request-blood">
                            ${escapeHtml(
                                request.blood_group ||
                                "—"
                            )}
                        </div>


                        <div class="bc-request-main">

                            <strong>
                                ${escapeHtml(
                                    request.patient_name ||
                                    "Patient"
                                )}
                            </strong>

                            <div class="bc-request-meta">

                                🏥
                                ${escapeHtml(
                                    request.hospital_name ||
                                    "Hospital not provided"
                                )}

                                <br>

                                📍
                                ${escapeHtml(
                                    request.city ||
                                    "Location not provided"
                                )}

                                &nbsp; • &nbsp;

                                💉
                                ${escapeHtml(
                                    request.units_required ||
                                    0
                                )}
                                unit(s)

                            </div>

                            <div class="bc-request-message">

                                ${
                                    request.message
                                        ? escapeHtml(
                                            request.message
                                        )
                                        : "No additional message provided."
                                }

                            </div>

                            <div
                                class="bc-request-status ${
                                    isAccepted
                                        ? "accepted"
                                        : "pending"
                                }"
                            >
                                ${
                                    isAccepted
                                        ? "✓ Request Accepted"
                                        : "Waiting for donor response"
                                }
                            </div>

                        </div>


                        <div class="bc-request-side">

                            <span
                                class="bc-request-urgency ${urgencyClass}"
                            >
                                ${escapeHtml(
                                    urgency
                                )}
                            </span>


                            <div class="bc-request-date">
                                Needed:
                                ${escapeHtml(
                                    formatRequestDate(
                                        request.required_date
                                    )
                                )}
                            </div>


                            <div class="bc-request-date">
                                ${escapeHtml(
                                    formatRequestDateTime(
                                        request.created_at
                                    )
                                )}
                            </div>


                            ${
                                isAccepted

                                    ? `

                                        <div
                                            class="bc-accepted-badge"
                                        >
                                            ✓ You accepted
                                        </div>

                                    `

                                    : `

                                        <button
                                            type="button"
                                            class="bc-accept-btn"
                                            data-request-id="${Number(
                                                request.id
                                            )}"
                                        >
                                            ❤️ I Can Donate
                                        </button>

                                    `
                            }

                        </div>

                    </article>
                `;

            })
            .join("");


    /*
     * Attach accept button events
     */

    list
        .querySelectorAll(".bc-accept-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const requestId =
                        Number(
                            button.dataset.requestId
                        );

                    acceptBloodRequest(
                        requestId,
                        button
                    );
                }
            );
        });
}


/* =========================================================
   LOAD INCOMING REQUESTS
   ========================================================= */

async function loadIncomingBloodRequests(
    donorId,
    silent = false
) {

    if (!donorId) {
        return;
    }

    ensureIncomingRequestsUI();

    const list =
        $("bcIncomingRequestList");

    try {

        if (!silent && list) {

            list.innerHTML = `

                <div class="bc-request-empty">

                    <span class="bc-request-empty-icon">
                        🩸
                    </span>

                    Loading your blood requests...

                </div>
            `;
        }

        const response =
            await fetch(
                `/api/blood-requests/donor/${encodeURIComponent(
                    donorId
                )}`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load your blood requests."
            );
        }

        incomingRequestsLoadedFor =
            Number(donorId);

        renderIncomingBloodRequests(
            data.requests || []
        );

    } catch (error) {

        console.error(
            "Incoming requests error:",
            error
        );

        if (list) {

            list.innerHTML = `

                <div class="bc-request-empty">

                    <span class="bc-request-empty-icon">
                        ⚠️
                    </span>

                    Unable to load your requests right now.

                    <div>

                        <button
                            type="button"
                            class="bc-request-refresh"
                        >
                            Try again
                        </button>

                    </div>

                </div>
            `;

            list
                .querySelector(
                    ".bc-request-refresh"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        loadIncomingBloodRequests(
                            donorId
                        );
                    }
                );
        }
    }
}


/* =========================================================
   ACCEPT BLOOD REQUEST
   ========================================================= */

async function acceptBloodRequest(
    requestId,
    button
) {

    const donor =
        getLoggedInDonor();

    if (!donor?.id) {

        showNotification(
            "Please login again to accept this request.",
            "error"
        );

        return;
    }

    if (!requestId) {
        return;
    }


    /*
     * Confirmation
     */

    const confirmed =
        window.confirm(
            "Are you sure you want to donate blood for this request?"
        );

    if (!confirmed) {
        return;
    }


    /*
     * Disable button
     */

    if (button) {

        button.disabled = true;

        button.textContent =
            "Accepting...";
    }


    try {

        const response =
            await fetch(
                `/api/blood-requests/${encodeURIComponent(
                    requestId
                )}/accept`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            donor_id:
                                Number(donor.id)
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
                "Unable to accept blood request."
            );
        }


        showNotification(
            "❤️ You accepted the blood request successfully!",
            "success"
        );


        /*
         * Refresh donor requests
         */

        await loadIncomingBloodRequests(
            donor.id,
            true
        );


        /*
         * Refresh requester tracking
         * in case this is the same browser.
         */

        const lastRequestId =
            localStorage.getItem(
                "bloodconnect-last-request"
            ) ||
            sessionStorage.getItem(
                "bloodconnect-last-request"
            );

        if (
            Number(lastRequestId) ===
            Number(requestId)
        ) {

            loadRequesterRequestStatus(
                requestId,
                true
            );
        }

    } catch (error) {

        console.error(
            "Accept blood request error:",
            error
        );

        if (button) {

            button.disabled = false;

            button.textContent =
                "❤️ I Can Donate";
        }

        showNotification(
            error.message ||
            "Unable to accept this request.",
            "error"
        );
    }
}


/* =========================================================
   REQUESTER STATUS UI
   ========================================================= */

function ensureRequesterStatusUI() {

    injectIncomingRequestStyles();

    let section =
        $("bcRequesterStatus");

    if (section) {
        return section;
    }

    section =
        document.createElement("section");

    section.id =
        "bcRequesterStatus";

    section.className =
        "bc-requester-status";

    section.innerHTML = `

        <h3>
            🩸 Your Blood Request
        </h3>

        <p>
            Track the response to your latest blood request.
        </p>

        <div
            id="bcRequesterStatusContent"
            class="bc-requester-status-card"
        >
            Checking request status...
        </div>

    `;

    const requestSection =
        $("request");

    if (requestSection?.parentElement) {

        requestSection.parentElement.insertBefore(
            section,
            requestSection.nextSibling
        );

    } else {

        document.body.appendChild(
            section
        );
    }

    return section;
}


/* =========================================================
   REQUESTER STATUS
   ========================================================= */

async function loadRequesterRequestStatus(
    requestId,
    silent = false
) {

    if (!requestId) {
        return;
    }

    const section =
        ensureRequesterStatusUI();

    const content =
        $("bcRequesterStatusContent");

    if (!content) {
        return;
    }

    if (!silent) {

        content.innerHTML =
            "Checking request status...";
    }

    try {

        const response =
            await fetch(
                `/api/blood-requests/${encodeURIComponent(
                    requestId
                )}`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to check request status."
            );
        }

        const request =
            data.request;


        /*
         * Pending
         */

        if (
            request.status !==
            "Accepted"
        ) {

            content.innerHTML = `

                <div class="bc-requester-pending">

                    ⏳

                    <strong>
                        Waiting for a donor
                    </strong>

                    <br>

                    Your request is still waiting
                    for a donor to accept it.

                </div>

                <div style="margin-top:12px;">
                    <strong>Request ID:</strong>
                    #${escapeHtml(request.id)}
                </div>

            `;

            return;
        }


        /*
         * Accepted
         */

        content.innerHTML = `

            <div class="bc-requester-accepted">

                ❤️

                <strong>
                    A donor has accepted your request!
                </strong>

                <br><br>

                Your blood request has been accepted.

            </div>


            <div
                style="
                    margin-top:15px;
                    display:grid;
                    gap:8px;
                "
            >

                <div>
                    <strong>Patient:</strong>
                    ${escapeHtml(
                        request.patient_name
                    )}
                </div>

                <div>
                    <strong>Blood Group:</strong>
                    ${escapeHtml(
                        request.blood_group
                    )}
                </div>

                <div>
                    <strong>Hospital:</strong>
                    ${escapeHtml(
                        request.hospital_name
                    )}
                </div>

                <div>
                    <strong>Units:</strong>
                    ${escapeHtml(
                        request.units_required
                    )}
                </div>

                ${
                    request.donor_name
                        ? `
                            <div>
                                <strong>Donor:</strong>
                                ${escapeHtml(
                                    request.donor_name
                                )}
                            </div>
                        `
                        : ""
                }

                ${
                    request.donor_phone
                        ? `
                            <div>
                                <strong>Donor Contact:</strong>
                                ${escapeHtml(
                                    request.donor_phone
                                )}
                            </div>
                        `
                        : ""
                }

                <div>
                    <strong>Status:</strong>
                    <span
                        style="
                            color:#16a34a;
                            font-weight:800;
                        "
                    >
                        ✓ Accepted
                    </span>
                </div>

            </div>
        `;
    } catch (error) {

        console.error(
            "Requester status error:",
            error
        );

        content.innerHTML = `

            <div class="bc-requester-pending">

                ⚠️

                Unable to check request status.

            </div>
        `;
    }
}


/* =========================================================
   DASHBOARD NAVIGATION
   ========================================================= */

function setupDashboardNavigation() {

    if (!dashboard) {
        return;
    }

    dashboard
        .querySelectorAll("a, button")
        .forEach(link => {

            const text =
                link.textContent
                    .trim()
                    .toLowerCase();

            if (
                text.includes("blood requests")
            ) {

                link.addEventListener(
                    "click",
                    event => {

                        const donor =
                            getLoggedInDonor();

                        if (!donor?.id) {
                            return;
                        }

                        event.preventDefault();

                        const section =
                            ensureIncomingRequestsUI();

                        loadIncomingBloodRequests(
                            donor.id
                        );

                        section?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                );
            }
        });
}


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            dashboard?.classList.remove(
                "show"
            );

            if (loginSection) {
                loginSection.style.display = "";
            }

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

            selectedDonorId = null;

            incomingRequestsLoadedFor = null;

            $("bcIncomingRequests")?.remove();

            updateNavbarForLoginState(
                false
            );

            showNotification(
                "You have been logged out.",
                "success"
            );

            setTimeout(() => {

                loginSection?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 200);
        }
    );
}


/* =========================================================
   BLOOD GROUP CARDS
   ========================================================= */

document
    .querySelectorAll(".blood-card")
    .forEach(card => {

        card.addEventListener(
            "click",
            () => {

                const groupElement =
                    card.querySelector("span");

                if (!groupElement) {
                    return;
                }

                const selectedGroup =
                    groupElement.textContent
                        .trim()
                        .replace("−", "-");

                const bloodGroupSelect =
                    $("bloodGroup");

                if (bloodGroupSelect) {
                    bloodGroupSelect.value =
                        selectedGroup;
                }

                $("find-donor")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            }
        );
    });


/* =========================================================
   SMOOTH NAVIGATION
   ========================================================= */

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
                    document.querySelector(
                        targetId
                    );

                if (!target) {
                    return;
                }

                event.preventDefault();

                if (
                    targetId === "#login"
                ) {

                    dashboard?.classList.remove(
                        "show"
                    );

                    if (loginSection) {
                        loginSection.style.display =
                            "";
                    }
                }

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    });


/* =========================================================
   STATISTICS COUNTER
   ========================================================= */

function animateCounter(
    element,
    target
) {

    if (!element) {
        return;
    }

    let current = 0;

    const duration = 1500;

    const step =
        target /
        (duration / 20);

    const counter =
        setInterval(() => {

            current += step;

            if (current >= target) {

                current = target;

                clearInterval(counter);
            }

            element.textContent =
                Math.floor(current)
                    .toLocaleString() +
                "+";

        }, 20);
}


const statsSection =
    document.querySelector(
        ".stats-section"
    );

let statsAnimated = false;

if (statsSection) {

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (
                        entry.isIntersecting &&
                        !statsAnimated
                    ) {

                        statsAnimated = true;

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
                            (stat, index) => {

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
                });

            },
            {
                threshold: 0.3
            }
        );

    observer.observe(statsSection);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatRequestDate(
    dateValue
) {

    if (!dateValue) {
        return "Not specified";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(dateValue);
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatRequestDateTime(
    dateValue
) {

    if (!dateValue) {
        return "";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(dateValue);
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   URGENCY CLASS
   ========================================================= */

function getUrgencyClass(
    urgency
) {

    const value =
        String(
            urgency || ""
        ).toLowerCase();

    if (
        value.includes("critical") ||
        value.includes("emergency")
    ) {
        return "critical";
    }

    if (
        value.includes("urgent")
    ) {
        return "urgent";
    }

    return "normal";
}


/* =========================================================
   RESTORE LOGIN SESSION
   ========================================================= */

function restoreLoggedInUser() {

    const donor =
        getLoggedInDonor();

    if (donor?.id) {

        updateNavbarForLoginState(
            true
        );

        showDashboard(
            donor.name ||
                "BloodConnect Donor",

            donor.blood_group ||
                donor.bloodGroup ||
                "O+",

            donor.availability
        );

    } else {

        updateNavbarForLoginState(
            false
        );
    }


    /*
     * Restore requester request status
     * after page refresh.
     */

    const lastRequestId =
        localStorage.getItem(
            "bloodconnect-last-request"
        ) ||
        sessionStorage.getItem(
            "bloodconnect-last-request"
        );

    if (lastRequestId) {

        ensureRequesterStatusUI();

        loadRequesterRequestStatus(
            lastRequestId,
            true
        );
    }
}


/* =========================================================
   AUTO REFRESH REQUEST STATUS
   ========================================================= */

let requesterStatusInterval = null;

function startRequesterStatusTracking(
    requestId
) {

    if (!requestId) {
        return;
    }

    if (requesterStatusInterval) {

        clearInterval(
            requesterStatusInterval
        );
    }

    requesterStatusInterval =
        setInterval(
            async () => {

                try {

                    const response =
                        await fetch(
                            `/api/blood-requests/${encodeURIComponent(
                                requestId
                            )}`
                        );

                    const data =
                        await response.json();

                    if (
                        response.ok &&
                        data.success
                    ) {

                        loadRequesterRequestStatus(
                            requestId,
                            true
                        );

                        if (
                            data.request?.status ===
                            "Accepted"
                        ) {

                            clearInterval(
                                requesterStatusInterval
                            );

                            requesterStatusInterval =
                                null;
                        }
                    }

                } catch (error) {

                    console.log(
                        "Status refresh skipped."
                    );
                }

            },
            10000
        );
}


/* =========================================================
   INITIAL PAGE LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupDashboardNavigation();

        restoreLoggedInUser();

        const lastRequestId =
            localStorage.getItem(
                "bloodconnect-last-request"
            ) ||
            sessionStorage.getItem(
                "bloodconnect-last-request"
            );

        if (lastRequestId) {

            startRequesterStatusTracking(
                lastRequestId
            );
        }

        console.log(
            "🩸 BloodConnect initialized successfully!"
        );
    }
);


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.showNotification =
    showNotification;

window.viewDonorProfile =
    viewDonorProfile;

window.requestBlood =
    requestBlood;

window.loadIncomingBloodRequests =
    loadIncomingBloodRequests;

window.showDashboard =
    showDashboard;

window.acceptBloodRequest =
    acceptBloodRequest;

window.loadRequesterRequestStatus =
    loadRequesterRequestStatus;


/* =========================================================
   FINAL
   ========================================================= */

console.log(
    "🩸 BLOODCONNECT SCRIPT.JS IS WORKING!"
);
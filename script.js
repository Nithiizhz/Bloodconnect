/* =====================================================
   BLOODCONNECT - MAIN SCRIPT.JS
   Complete Frontend + Blood Request Notification Flow
   ===================================================== */

let donors = [];
let selectedDonorId = null;

let incomingRequestsLoadedFor = null;

let requesterStatusTimer = null;
let requesterStatusRequestId = null;


/* =====================================================
   BASIC HELPER
   ===================================================== */

const $ = id => document.getElementById(id);


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   NOTIFICATION SYSTEM
   ===================================================== */

function showNotification(
    message,
    type = "success"
) {

    document
        .querySelectorAll(".notification")
        .forEach(
            notification => notification.remove()
        );


    const notification =
        document.createElement("div");


    notification.className =
        `notification ${type}`;


    notification.innerHTML = `

        <span class="notification-icon">

            ${
                type === "success"
                    ? "✓"
                    : "!"
            }

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


    document.body.appendChild(
        notification
    );


    notification
        .querySelector(
            ".notification-close"
        )
        ?.addEventListener(
            "click",
            () => notification.remove()
        );


    setTimeout(
        () => {

            if (
                !notification.isConnected
            ) {
                return;
            }


            notification.classList.add(
                "hide"
            );


            setTimeout(
                () => {
                    notification.remove();
                },
                300
            );

        },
        4000
    );
}


/* =====================================================
   LOGIN STORAGE
   ===================================================== */

function getLoggedInDonor() {

    try {

        const raw =
            localStorage.getItem(
                "bloodconnect-donor"
            ) ||
            sessionStorage.getItem(
                "bloodconnect-donor"
            );


        return raw
            ? JSON.parse(raw)
            : null;

    } catch (error) {

        console.error(
            "Saved donor data error:",
            error
        );

        return null;
    }
}


function saveDonor(
    donor,
    remember
) {

    const storage =
        remember
            ? localStorage
            : sessionStorage;


    const otherStorage =
        remember
            ? sessionStorage
            : localStorage;


    storage.setItem(
        "bloodconnect-donor",
        JSON.stringify(donor)
    );


    storage.setItem(
        "bloodconnect-user",
        JSON.stringify({
            id: donor.id,
            name: donor.name,
            email: donor.email,
            bloodGroup:
                donor.blood_group ||
                donor.bloodGroup
        })
    );


    otherStorage.removeItem(
        "bloodconnect-donor"
    );


    otherStorage.removeItem(
        "bloodconnect-user"
    );
}


/* =====================================================
   DATE HELPERS
   ===================================================== */

function formatRequestDate(
    value
) {

    if (!value) {
        return "Not specified";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
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
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
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


function getUrgencyClass(
    value
) {

    const urgency =
        String(value || "")
            .toLowerCase();


    if (
        urgency.includes("critical") ||
        urgency.includes("emergency")
    ) {
        return "critical";
    }


    if (
        urgency.includes("urgent")
    ) {
        return "urgent";
    }


    return "normal";
}


/* =====================================================
   THEME
   ===================================================== */

function applyTheme(
    theme
) {

    document.documentElement
        .setAttribute(
            "data-theme",
            theme
        );


    const icon =
        $("themeIcon");


    if (icon) {

        icon.textContent =
            theme === "dark"
                ? "☀️"
                : "🌙";
    }
}


function setupTheme() {

    const savedTheme =
        localStorage.getItem(
            "bloodconnect-theme"
        ) ||
        "light";


    applyTheme(
        savedTheme
    );


    const themeToggle =
        $("themeToggle");


    if (!themeToggle) {
        return;
    }


    themeToggle.addEventListener(
        "click",
        () => {

            const current =
                document.documentElement
                    .getAttribute(
                        "data-theme"
                    );


            const next =
                current === "dark"
                    ? "light"
                    : "dark";


            localStorage.setItem(
                "bloodconnect-theme",
                next
            );


            applyTheme(
                next
            );
        }
    );
}


/* =====================================================
   MOBILE MENU
   ===================================================== */

function setupMobileMenu() {

    const menuBtn =
        $("menuBtn");


    const navLinks =
        document.querySelector(
            ".nav-links"
        );


    const navActions =
        document.querySelector(
            ".nav-actions"
        );


    if (
        !menuBtn ||
        !navLinks ||
        !navActions
    ) {
        return;
    }


    menuBtn.addEventListener(
        "click",
        () => {

            const isOpen =
                navLinks.classList.toggle(
                    "mobile-open"
                );


            navActions.classList.toggle(
                "mobile-open",
                isOpen
            );


            menuBtn.innerHTML =
                isOpen
                    ? "✕"
                    : "☰";
        }
    );


    document
        .querySelectorAll(
            ".nav-links a"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        navLinks.classList.remove(
                            "mobile-open"
                        );


                        navActions.classList.remove(
                            "mobile-open"
                        );


                        menuBtn.innerHTML =
                            "☰";
                    }
                );
            }
        );
}


/* =====================================================
   DONOR SEARCH
   ===================================================== */

async function searchDonors(
    event
) {

    event.preventDefault();


    const bloodGroup =
        $("bloodGroup")
            ?.value;


    const location =
        $("location")
            ?.value
            .trim();


    if (
        !bloodGroup ||
        !location
    ) {

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
                .map(
                    donor => ({

                        id:
                            donor.id,

                        name:
                            donor.name,

                        bloodGroup:
                            donor.blood_group,

                        email:
                            donor.email,

                        phone:
                            donor.phone,

                        age:
                            donor.age,

                        gender:
                            donor.gender ||
                            "Not provided",

                        city:
                            donor.city,

                        area:
                            donor.area,

                        lastDonation:
                            donor.last_donation_date ||
                            "Not provided",

                        available:
                            Number(
                                donor.availability
                            ) === 1
                    })
                );


        displayDonors(
            donors,
            bloodGroup,
            location
        );


        showNotification(
            `Found ${donors.length} donor${donors.length === 1 ? "" : "s"} for ${bloodGroup} near ${location}.`,
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


/* =====================================================
   DISPLAY DONORS
   ===================================================== */

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


    resultsSection.classList.add(
        "show"
    );


    if (resultsSubtitle) {

        resultsSubtitle.textContent =
            `${bloodGroup} donors available near ${location}`;
    }


    if (resultsCount) {

        resultsCount.textContent =
            `${matchingDonors.length} donor${matchingDonors.length === 1 ? "" : "s"}`;
    }


    if (!donorResults) {
        return;
    }


    donorResults.innerHTML = "";


    if (
        matchingDonors.length === 0
    ) {

        noResults?.classList.add(
            "show"
        );


        donorResults.style.display =
            "none";


        return;
    }


    noResults?.classList.remove(
        "show"
    );


    donorResults.style.display =
        "grid";


    matchingDonors.forEach(
        donor => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "donor-card";


            const firstLetter =
                (
                    donor.name ||
                    "D"
                )
                    .charAt(0)
                    .toUpperCase();


            card.innerHTML = `

                <div class="donor-top">

                    <div class="donor-info">

                        <div class="donor-avatar">

                            ${escapeHtml(
                                firstLetter
                            )}

                        </div>


                        <div>

                            <div class="donor-name">

                                ${escapeHtml(
                                    donor.name
                                )}

                            </div>


                            <div class="donor-location">

                                📍

                                ${escapeHtml(
                                    donor.area ||
                                    "Area"
                                )},

                                ${escapeHtml(
                                    donor.city ||
                                    "City"
                                )}

                            </div>

                        </div>

                    </div>


                    <div
                        class="availability ${
                            donor.available
                                ? "available"
                                : "unavailable"
                        }"
                    >

                        <span
                            class="availability-dot"
                        ></span>


                        ${
                            donor.available
                                ? "Available"
                                : "Currently unavailable"
                        }

                    </div>

                </div>


                <div class="donor-details">

                    <div class="donor-detail">

                        <span class="detail-icon">
                            🩸
                        </span>

                        <div>

                            <strong>
                                ${escapeHtml(
                                    donor.bloodGroup ||
                                    "—"
                                )}
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
                                ${escapeHtml(
                                    donor.age ||
                                    "—"
                                )} years
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
                                ${escapeHtml(
                                    donor.lastDonation
                                )}
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
                                ${escapeHtml(
                                    donor.city ||
                                    "—"
                                )}
                            </strong>

                            <span>
                                Location
                            </span>

                        </div>

                    </div>

                </div>


                <div class="donor-actions">

                    <button
                        type="button"
                        class="view-profile-btn"
                        onclick="viewDonorProfile(${Number(
                            donor.id
                        )})"
                    >
                        View Profile
                    </button>


                    <button
                        type="button"
                        class="request-btn"
                        onclick="requestBlood(${Number(
                            donor.id
                        )})"
                        ${
                            donor.available
                                ? ""
                                : "disabled"
                        }
                    >
                        Request Blood
                    </button>

                </div>
            `;


            donorResults.appendChild(
                card
            );
        }
    );


    setTimeout(
        () => {

            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        },
        100
    );
}


/* =====================================================
   DONOR PROFILE
   ===================================================== */

function viewDonorProfile(
    donorId
) {

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
        document.createElement(
            "div"
        );


    modal.id =
        "donorProfileModal";


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
                        (
                            donor.name ||
                            "D"
                        )
                            .charAt(0)
                            .toUpperCase()
                    )}

                </div>


                <h2>
                    ${escapeHtml(
                        donor.name
                    )}
                </h2>


                <p class="profile-location">

                    📍

                    ${escapeHtml(
                        donor.area ||
                        "Area"
                    )},

                    ${escapeHtml(
                        donor.city ||
                        "City"
                    )}

                </p>


                <div
                    class="profile-status ${
                        donor.available
                            ? "available"
                            : "unavailable"
                    }"
                >

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
                                    donor.bloodGroup ||
                                    "—"
                                )}
                            </strong>

                            <small>
                                Blood Group
                            </small>

                        </div>

                    </div>


                    <div class="profile-detail">

                        <span>👤</span>

                        <div>

                            <strong>
                                ${escapeHtml(
                                    donor.age ||
                                    "—"
                                )} years
                            </strong>

                            <small>
                                Age
                            </small>

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

                            <small>
                                Gender
                            </small>

                        </div>

                    </div>


                    <div class="profile-detail">

                        <span>📍</span>

                        <div>

                            <strong>
                                ${escapeHtml(
                                    donor.city ||
                                    "—"
                                )}
                            </strong>

                            <small>
                                City
                            </small>

                        </div>

                    </div>


                    <div class="profile-detail">

                        <span>🏠</span>

                        <div>

                            <strong>
                                ${escapeHtml(
                                    donor.area ||
                                    "—"
                                )}
                            </strong>

                            <small>
                                Area
                            </small>

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

                            <small>
                                Last Donation
                            </small>

                        </div>

                    </div>

                </div>


                <div class="profile-actions">

                    <button
                        type="button"
                        class="profile-request-btn"
                        ${
                            donor.available
                                ? ""
                                : "disabled"
                        }
                    >
                        Request Blood
                    </button>

                </div>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    modal
        .querySelector(
            ".profile-modal-close"
        )
        ?.addEventListener(
            "click",
            () => modal.remove()
        );


    modal
        .querySelector(
            ".profile-request-btn"
        )
        ?.addEventListener(
            "click",
            () => {

                modal.remove();

                requestBlood(
                    donor.id
                );
            }
        );


    modal
        .querySelector(
            ".profile-modal-overlay"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.classList.contains(
                        "profile-modal-overlay"
                    )
                ) {

                    modal.remove();
                }
            }
        );
}


/* =====================================================
   REQUEST BLOOD
   ===================================================== */

function requestBlood(
    donorId
) {

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
            donor.bloodGroup ||
            "";
    }


    $("request")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    showNotification(
        `Requesting blood from ${donor.name}.`,
        "success"
    );
}


/* =====================================================
   BLOOD REQUEST FORM
   ===================================================== */

async function submitBloodRequest(
    event
) {

    event.preventDefault();


    /* =================================================
       GET FORM VALUES
       ================================================= */

    const patientName =
        $("patientName")
            ?.value
            .trim();


    const bloodGroup =
        $("requestBloodGroup")
            ?.value;


    const units =
        Number(
            $("unitsRequired")
                ?.value
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
        $("urgency")
            ?.value;


    const requiredDate =
        $("requiredDate")
            ?.value;


    const message =
        $("requestMessage")
            ?.value
            .trim();


    /* =================================================
       GET LOGGED-IN REQUESTER
       ================================================= */

    const loggedInDonor =
        getLoggedInDonor();


    if (
        !loggedInDonor ||
        !loggedInDonor.id
    ) {

        showNotification(
            "Please login before submitting a blood request.",
            "error"
        );

        return;
    }


    /*
     * THIS IS THE IMPORTANT PART
     *
     * The person who is currently logged in
     * is the requester.
     */

    const requesterId =
        Number(
            loggedInDonor.id
        );


    /* =================================================
       VALIDATION
       ================================================= */

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


    if (
        units < 1
    ) {

        showNotification(
            "Units required must be at least 1.",
            "error"
        );

        return;
    }


    if (
        !/^[0-9]{10}$/.test(
            phone
        )
    ) {

        showNotification(
            "Please enter a valid 10-digit contact number.",
            "error"
        );

        return;
    }


    /* =================================================
       MAKE SURE A DONOR WAS SELECTED
       ================================================= */

    if (
        !selectedDonorId
    ) {

        showNotification(
            "Please select a donor before submitting the request.",
            "error"
        );

        return;
    }


    /* =================================================
       SEND REQUEST TO BACKEND
       ================================================= */

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

                    body:
                        JSON.stringify({

                            /*
                             * REQUESTER
                             *
                             * This is the logged-in user.
                             *
                             * Example:
                             * Nithish = 1
                             * Digeesh = 2
                             */

                            requester_id:
                                requesterId,


                            /*
                             * SELECTED DONOR
                             */

                            donor_id:
                                Number(
                                    selectedDonorId
                                ),


                            /*
                             * PATIENT
                             */

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


        /* =================================================
           HANDLE BACKEND ERROR
           ================================================= */

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Blood request submission failed."
            );
        }


        /* =================================================
           SAVE REQUEST ID
           ================================================= */

        if (
            data.requestId
        ) {

            const requestId =
                String(
                    data.requestId
                );


            /*
             * Save for requester status.
             */

            localStorage.setItem(
                "bloodconnect-last-request",
                requestId
            );


            sessionStorage.setItem(
                "bloodconnect-last-request",
                requestId
            );


            /*
             * Notify other tabs.
             */

            localStorage.setItem(
                "bloodconnect-request-updated",
                `${requestId}-${Date.now()}`
            );


            /*
             * Show requester status UI.
             */

            ensureRequesterStatusUI();


            startRequesterStatusPolling(
                Number(
                    data.requestId
                )
            );
        }


        /* =================================================
           RESET FORM
           ================================================= */

        $("bloodRequestForm")
            ?.reset();


        selectedDonorId =
            null;


        /* =================================================
           SUCCESS MESSAGE
           ================================================= */

        showNotification(

            "Blood request sent to the selected donor successfully!",

            "success"
        );


        console.log(
            "Blood request created:",
            {
                requestId:
                    data.requestId,

                requesterId:
                    requesterId,

                donorId:
                    selectedDonorId,

                patientName:
                    patientName
            }
        );


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

/* =====================================================
   DONOR REGISTRATION
   ===================================================== */

async function submitRegistration(
    event
) {

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
            $("donorAge")
                ?.value
        );


    const bloodGroup =
        $("donorBloodGroup")
            ?.value;


    const gender =
        $("donorGender")
            ?.value;


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


    const terms =
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


    if (
        !/^[0-9]{10}$/.test(
            phone
        )
    ) {

        showNotification(
            "Please enter a valid 10-digit phone number.",
            "error"
        );

        return;
    }


    if (
        age < 18 ||
        age > 65
    ) {

        showNotification(
            "Donor age must be between 18 and 65.",
            "error"
        );

        return;
    }


    if (
        password.length < 6
    ) {

        showNotification(
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    if (!terms) {

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


        $("donorRegistrationForm")
            ?.reset();


        showNotification(
            `Welcome to BloodConnect, ${name}! Registration successful.`,
            "success"
        );


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


/* =====================================================
   LOGIN
   ===================================================== */

async function submitLogin(
    event
) {

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


    if (
        !email ||
        !password
    ) {

        showNotification(
            "Please enter your email and password.",
            "error"
        );

        return;
    }


    if (
        password.length < 6
    ) {

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
            data.donor ||
            {};


        saveDonor(
            donor,
            rememberMe
        );


        showNotification(
            "Login successful! Welcome back.",
            "success"
        );


        setTimeout(
            () => {

                showDashboard(

                    donor.name ||
                        "BloodConnect Donor",

                    donor.blood_group ||
                        "O+",

                    donor.availability
                );

            },
            300
        );


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


/* =====================================================
   NAVBAR LOGIN STATE
   ===================================================== */

function updateNavbarForLoginState(
    loggedIn
) {

    document
        .querySelectorAll(
            ".nav-actions a, .nav-actions button, a[href='#login']"
        )
        .forEach(
            element => {

                const text =
                    element.textContent
                        .trim()
                        .toLowerCase();


                if (
                    text !== "login" &&
                    text !== "dashboard"
                ) {
                    return;
                }


                element.textContent =
                    loggedIn
                        ? "Dashboard"
                        : "Login";


                element.setAttribute(
                    "href",
                    loggedIn
                        ? "#dashboard"
                        : "#login"
                );
            }
        );
}


/* =====================================================
   AVAILABILITY
   ===================================================== */

function updateAvailabilityUI(
    available
) {

    const toggle =
        $("availabilityToggle");


    const status =
        $("dashboardAvailability");


    const message =
        $("availabilityMessage");


    if (toggle) {

        toggle.checked =
            available;
    }


    if (status) {

        status.textContent =
            available
                ? "Available"
                : "Unavailable";


        status.style.color =
            available
                ? "var(--success)"
                : "var(--muted)";
    }


    if (message) {

        message.textContent =

            available

                ? "Your profile is currently visible to people searching for donors."

                : "Your profile is hidden from new donor searches.";
    }
}


async function updateAvailability(
    event
) {

    const donor =
        getLoggedInDonor();


    if (!donor?.id) {

        event.target.checked =
            !event.target.checked;


        showNotification(
            "Please login again to update your availability.",
            "error"
        );

        return;
    }


    const oldValue =
        Number(
            donor.availability
        ) === 1
            ? 1
            : 0;


    const newValue =
        event.target.checked
            ? 1
            : 0;


    try {

        const response =
            await fetch(
                `/api/donors/${encodeURIComponent(
                    donor.id
                )}/availability`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            availability:
                                newValue
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
            newValue;


        const storage =
            localStorage.getItem(
                "bloodconnect-donor"
            )
                ? localStorage
                : sessionStorage;


        storage.setItem(
            "bloodconnect-donor",
            JSON.stringify(
                donor
            )
        );


        updateAvailabilityUI(
            newValue === 1
        );


        showNotification(

            newValue === 1

                ? "You are now available for blood requests."

                : "Your donor availability has been turned off.",

            "success"
        );


    } catch (error) {

        event.target.checked =
            oldValue === 1;


        updateAvailabilityUI(
            oldValue === 1
        );


        showNotification(
            error.message ||
            "Unable to update availability.",
            "error"
        );
    }
}


/* =====================================================
   DASHBOARD
   ===================================================== */

function showDashboard(
    name,
    bloodGroup,
    availability = 1
) {

    const dashboard =
        $("dashboard");


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

        dashboardName.textContent =
            name;
    }


    if (sidebarName) {

        sidebarName.textContent =
            name;
    }


    if (dashboardAvatar) {

        dashboardAvatar.textContent =
            (
                name ||
                "D"
            )
                .charAt(0)
                .toUpperCase();
    }


    if (dashboardBloodGroup) {

        dashboardBloodGroup.textContent =
            bloodGroup ||
            "O+";
    }


    updateAvailabilityUI(
        Number(availability) === 1
    );


    dashboard.classList.add(
        "show"
    );


    const loginSection =
        $("login");


    if (loginSection) {

        loginSection.style.display =
            "none";
    }


    updateNavbarForLoginState(
        true
    );


    const donor =
        getLoggedInDonor();


    if (donor?.id) {

        startRequesterStatusPollingFromStorage();

        loadRequesterRequestsForDashboard(
            donor.id
        );
    }


    setTimeout(
        () => {

            dashboard.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        },
        150
    );
}


/* =====================================================
   REQUESTER STATUS CSS
   ===================================================== */

function injectRequesterStatusStyles() {

    if (
        $("bcRequesterStatusStyles")
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "bcRequesterStatusStyles";


    style.textContent = `

        .bc-requester-status {
            margin: 24px 0;
            padding: 22px;
            border-radius: 20px;
            background: var(--card-bg, #ffffff);
            border: 1px solid var(--border, #e5e7eb);
            box-shadow: 0 12px 35px rgba(0,0,0,.06);
        }

        .bc-requester-status-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 16px;
        }

        .bc-requester-kicker {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
            color: #ef4444;
        }

        .bc-requester-title {
            margin: 0;
            color: var(--text, #111827);
            font-size: 21px;
        }

        .bc-requester-badge {
            padding: 7px 12px;
            border-radius: 999px;
            background: #fef3c7;
            color: #92400e;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
        }

        .bc-requester-card {
            padding: 18px;
            border-radius: 16px;
            background: var(--surface, #fafafa);
            border: 1px solid var(--border, #e5e7eb);
        }

        .bc-requester-card.accepted {
            border-color: #86efac;
            background: #f0fdf4;
        }

        .bc-requester-card-title {
            margin-bottom: 8px;
            color: var(--text, #111827);
            font-size: 16px;
            font-weight: 800;
        }

        .bc-requester-meta {
            color: var(--muted, #64748b);
            font-size: 13px;
            line-height: 1.7;
        }

        .bc-requester-success {
            margin-top: 14px;
            padding: 13px 15px;
            border-radius: 12px;
            background: #dcfce7;
            color: #166534;
            font-weight: 700;
            line-height: 1.5;
        }

        .bc-requester-contact {
            display: inline-flex;
            margin-top: 10px;
            padding: 9px 13px;
            border-radius: 10px;
            background: #16a34a;
            color: white;
            text-decoration: none;
            font-weight: 800;
        }

        .bc-requester-notification {
            margin-top: 14px;
            padding: 15px 16px;
            border-radius: 14px;
            background: linear-gradient(
                135deg,
                #ecfdf5,
                #dcfce7
            );
            border: 1px solid #86efac;
            color: #166534;
            font-weight: 800;
        }

        [data-theme="dark"]
        .bc-requester-status {
            background: #111827;
            border-color: #273449;
        }

        [data-theme="dark"]
        .bc-requester-card {
            background: #172033;
            border-color: #334155;
        }

        [data-theme="dark"]
        .bc-requester-card.accepted {
            background: #10251a;
            border-color: #166534;
        }

        [data-theme="dark"]
        .bc-requester-title,

        [data-theme="dark"]
        .bc-requester-card-title {
            color: #f8fafc;
        }

        [data-theme="dark"]
        .bc-requester-meta {
            color: #94a3b8;
        }

        @media (max-width: 700px) {

            .bc-requester-status {
                padding: 18px;
            }

            .bc-requester-status-header {
                align-items: flex-start;
                flex-direction: column;
            }
        }
    `;


    document.head.appendChild(
        style
    );
}


/* =====================================================
   REQUESTER STATUS UI
   ===================================================== */

function getRequestContainer() {

    const dashboard =
        $("dashboard");


    if (!dashboard) {
        return null;
    }


    return (

        dashboard.querySelector(
            ".dashboard-content"
        )

        ||

        dashboard.querySelector(
            ".dashboard-main"
        )

        ||

        dashboard.querySelector(
            ".dashboard-body"
        )

        ||

        dashboard
    );
}


function ensureRequesterStatusUI() {

    if (!$("dashboard")) {
        return null;
    }


    injectRequesterStatusStyles();


    let section =
        $("bcRequesterStatus");


    if (section) {
        return section;
    }


    section =
        document.createElement(
            "section"
        );


    section.id =
        "bcRequesterStatus";


    section.className =
        "bc-requester-status";


    section.innerHTML = `

        <div class="bc-requester-status-header">

            <div>

                <p class="bc-requester-kicker">
                    Your Blood Request
                </p>

                <h3 class="bc-requester-title">
                    Request status
                </h3>

            </div>


            <span
                class="bc-requester-badge"
                id="bcRequesterBadge"
            >
                Checking...
            </span>

        </div>


        <div
            id="bcRequesterStatusCard"
            class="bc-requester-card"
        >

            <div class="bc-requester-card-title">
                Checking your latest request...
            </div>

        </div>
    `;


    const container =
        getRequestContainer();


    if (container) {

        const incoming =
            $("bcIncomingRequests");


        if (
            incoming &&
            incoming.parentElement ===
                container
        ) {

            container.insertBefore(
                section,
                incoming
            );

        } else {

            container.appendChild(
                section
            );
        }
    }


    return section;
}


/* =====================================================
   LAST REQUEST ID
   ===================================================== */

function getLastRequesterRequestId() {

    const value =

        localStorage.getItem(
            "bloodconnect-last-request"
        )

        ||

        sessionStorage.getItem(
            "bloodconnect-last-request"
        );


    const id =
        Number(value);


    return (

        Number.isInteger(id) &&
        id > 0

    )
        ? id
        : null;
}


/* =====================================================
   REQUEST STATUS RENDER
   ===================================================== */

function renderRequesterRequestStatus(
    request
) {

    const section =
        ensureRequesterStatusUI();


    const card =
        $("bcRequesterStatusCard");


    const badge =
        $("bcRequesterBadge");


    if (
        !section ||
        !card
    ) {
        return;
    }


    const status =
        request?.status ||
        "Pending";


    if (badge) {

        badge.textContent =
            status;
    }


    /* =================================================
       ACCEPTED
       ================================================= */

    if (
        status ===
        "Accepted"
    ) {

        card.className =
            "bc-requester-card accepted";


        const donorName =
            request.donor_name ||
            "A donor";


        const donorPhone =
            request.donor_phone ||
            "";


        card.innerHTML = `

            <div class="bc-requester-card-title">

                🩸 Your blood request has been accepted

            </div>


            <div class="bc-requester-meta">

                ${escapeHtml(
                    request.patient_name ||
                    "Patient"
                )}

                •
                ${escapeHtml(
                    request.blood_group ||
                    "—"
                )}

                •
                ${escapeHtml(
                    request.units_required ||
                    0
                )}
                unit(s)

                <br>

                ${escapeHtml(
                    request.hospital_name ||
                    "Hospital not provided"
                )}

                •
                ${escapeHtml(
                    request.city ||
                    "Location not provided"
                )}

            </div>


            <div class="bc-requester-notification">

                ✓

                ${escapeHtml(
                    donorName
                )}

                has accepted your blood request.


                ${
                    donorPhone

                        ? `
                            <br>

                            <a
                                class="bc-requester-contact"
                                href="tel:${escapeHtml(
                                    donorPhone
                                )}"
                            >
                                📞 Contact
                                ${escapeHtml(
                                    donorName
                                )}
                            </a>
                        `

                        : ""
                }

            </div>
        `;


        return;
    }


    /* =================================================
       PENDING
       ================================================= */

    card.className =
        "bc-requester-card";


    card.innerHTML = `

        <div class="bc-requester-card-title">

            ⏳ Waiting for donor response

        </div>


        <div class="bc-requester-meta">

            ${escapeHtml(
                request?.patient_name ||
                "Patient"
            )}

            •
            ${escapeHtml(
                request?.blood_group ||
                "—"
            )}

            •
            ${escapeHtml(
                request?.units_required ||
                0
            )}
            unit(s)

            <br>

            ${escapeHtml(
                request?.hospital_name ||
                "Hospital not provided"
            )}

            •
            ${escapeHtml(
                request?.city ||
                "Location not provided"
            )}

        </div>
    `;
}


/* =====================================================
   REQUEST ACCEPTED NOTIFICATION
   ===================================================== */

function notifyRequesterAccepted(
    request
) {

    if (
        !request ||
        request.status !==
            "Accepted" ||
        !request.id
    ) {
        return;
    }


    const notificationKey =
        `bloodconnect-accepted-notified-${request.id}`;


    /*
     * Prevent duplicate notifications.
     */

    if (
        localStorage.getItem(
            notificationKey
        )
    ) {
        return;
    }


    showNotification(
        `🩸 ${
            request.donor_name ||
            "A donor"
        } has accepted your blood request!`,
        "success"
    );


    localStorage.setItem(
        notificationKey,
        "true"
    );
}


/* =====================================================
   LOAD SINGLE REQUEST STATUS
   ===================================================== */

async function loadRequesterRequestStatus(
    requestId,
    silent = false
) {

    const id =
        Number(requestId);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        return null;
    }


    ensureRequesterStatusUI();


    try {

        const response =
            await fetch(
                `/api/blood-requests/${encodeURIComponent(
                    id
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
                "Unable to load request status."
            );
        }


        const request =
            data.request;


        const loggedInDonor =
            getLoggedInDonor();


        if (
            !loggedInDonor?.id ||
            Number(request?.requester_id) !==
            Number(loggedInDonor.id)
        ) {
            return null;
        }


        renderRequesterRequestStatus(
            request
        );


        /*
         * If donor accepted,
         * show notification and stop polling.
         */

        if (
            request?.status ===
            "Accepted"
        ) {

            notifyRequesterAccepted(
                request
            );


            stopRequesterStatusPolling();
        }


        return request;


    } catch (error) {

        console.error(
            "Requester status error:",
            error
        );


        if (!silent) {

            const card =
                $("bcRequesterStatusCard");


            if (card) {

                card.innerHTML = `

                    <div class="bc-requester-card-title">

                        Unable to check request status

                    </div>


                    <div class="bc-requester-meta">

                        ${escapeHtml(
                            error.message ||
                            "Please try again later."
                        )}

                    </div>
                `;
            }
        }


        return null;
    }
}


/* =====================================================
   LOAD REQUESTER REQUESTS FOR DASHBOARD
   ===================================================== */

async function loadRequesterRequestsForDashboard(
    requesterId
) {

    if (!requesterId) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/blood-requests/requester/${encodeURIComponent(
                    requesterId
                )}`
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {
            return;
        }


        const requests =
            Array.isArray(data.requests)
                ? data.requests
                : [];


        const latestRequest =
            requests.length
                ? requests[0]
                : null;


        if (!latestRequest?.id) {
            return;
        }


        localStorage.setItem(
            "bloodconnect-last-request",
            String(latestRequest.id)
        );


        sessionStorage.setItem(
            "bloodconnect-last-request",
            String(latestRequest.id)
        );


        ensureRequesterStatusUI();

        renderRequesterRequestStatus(
            latestRequest
        );


        if (latestRequest.status === "Pending") {
            startRequesterStatusPolling(
                Number(latestRequest.id)
            );
        }

    } catch (error) {

        console.error(
            "Requester dashboard requests error:",
            error
        );
    }
}


/* =====================================================
   REQUEST STATUS POLLING
   ===================================================== */

function stopRequesterStatusPolling() {

    if (
        requesterStatusTimer
    ) {

        clearInterval(
            requesterStatusTimer
        );
    }


    requesterStatusTimer =
        null;


    requesterStatusRequestId =
        null;
}


function startRequesterStatusPolling(
    requestId
) {

    const id =
        Number(requestId);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        return;
    }


    ensureRequesterStatusUI();


    /*
     * Don't create multiple timers
     * for the same request.
     */

    if (
        requesterStatusRequestId ===
            id &&
        requesterStatusTimer
    ) {
        return;
    }


    stopRequesterStatusPolling();


    requesterStatusRequestId =
        id;


    /*
     * Check immediately.
     */

    loadRequesterRequestStatus(
        id,
        true
    );


    /*
     * Then check every 5 seconds.
     */

    requesterStatusTimer =
        setInterval(
            () => {

                loadRequesterRequestStatus(
                    id,
                    true
                );

            },
            5000
        );
}


function startRequesterStatusPollingFromStorage() {

    const requestId =
        getLastRequesterRequestId();


    if (!requestId) {
        return;
    }


    startRequesterStatusPolling(
        requestId
    );
}


/* =====================================================
   🔥 CROSS-TAB REQUEST DETECTION
   ===================================================== */

function setupCrossTabRequestListener() {

    /*
     * localStorage "storage" event fires in
     * OTHER browser tabs of the same origin.
     *
     * This allows Digeesh's already-open tab
     * to detect a request created in another tab.
     */

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                "bloodconnect-last-request"
            ) {

                const requestId =
                    Number(
                        event.newValue
                    );


                if (
                    Number.isInteger(
                        requestId
                    ) &&
                    requestId > 0
                ) {

                    console.log(
                        "🩸 New BloodConnect request detected:",
                        requestId
                    );


                    ensureRequesterStatusUI();


                    startRequesterStatusPolling(
                        requestId
                    );


                    loadRequesterRequestStatus(
                        requestId
                    );
                }
            }


            /*
             * Additional event key.
             */

            if (
                event.key ===
                "bloodconnect-request-updated"
            ) {

                const requestId =
                    Number(
                        String(
                            event.newValue ||
                            ""
                        ).split(
                            "-"
                        )[0]
                    );


                if (
                    Number.isInteger(
                        requestId
                    ) &&
                    requestId > 0
                ) {

                    console.log(
                        "🔔 Blood request update detected:",
                        requestId
                    );


                    ensureRequesterStatusUI();


                    startRequesterStatusPolling(
                        requestId
                    );


                    loadRequesterRequestStatus(
                        requestId,
                        true
                    );
                }
            }
        }
    );
}


/* =====================================================
   INCOMING REQUEST CSS
   ===================================================== */

function injectIncomingRequestStyles() {

    if (
        $("bcIncomingRequestStyles")
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


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
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
        }

        .bc-incoming-kicker {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
            color: #ef4444;
        }

        .bc-incoming-title {
            margin: 0;
            font-size: 22px;
            color: var(--text, #111827);
        }

        .bc-incoming-count {
            min-width: 38px;
            height: 38px;
            padding: 0 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: #ef4444;
            color: white;
            font-weight: 800;
        }

        .bc-request-list {
            display: grid;
            gap: 14px;
        }

        .bc-request-item {
            display: grid;
            grid-template-columns: 64px 1fr auto;
            gap: 16px;
            align-items: center;
            padding: 18px;
            border-radius: 16px;
            border: 1px solid var(--border, #e5e7eb);
            background: var(--surface, #fafafa);
        }

        .bc-request-blood {
            width: 58px;
            height: 58px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fee2e2;
            color: #dc2626;
            font-size: 17px;
            font-weight: 900;
        }

        .bc-request-main strong {
            display: block;
            margin-bottom: 6px;
            color: var(--text, #111827);
            font-size: 16px;
        }

        .bc-request-meta {
            color: var(--muted, #64748b);
            font-size: 13px;
            line-height: 1.7;
        }

        .bc-request-message {
            margin-top: 8px;
            color: var(--muted, #64748b);
            font-size: 13px;
            line-height: 1.5;
        }

        .bc-request-side {
            min-width: 150px;
            text-align: right;
        }

        .bc-request-urgency {
            display: inline-flex;
            padding: 5px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
        }

        .bc-request-urgency.critical {
            background: #fee2e2;
            color: #b91c1c;
        }

        .bc-request-urgency.urgent {
            background: #ffedd5;
            color: #c2410c;
        }

        .bc-request-urgency.normal {
            background: #dcfce7;
            color: #15803d;
        }

        .bc-request-date {
            margin-top: 7px;
            color: var(--muted, #64748b);
            font-size: 11px;
        }

        .bc-request-accept {
            margin-top: 12px;
            padding: 10px 13px;
            border: 0;
            border-radius: 10px;
            background: #16a34a;
            color: white;
            cursor: pointer;
            font-weight: 800;
        }

        .bc-request-accept:hover {
            transform: translateY(-1px);
        }

        .bc-request-accept:disabled {
            opacity: .65;
            cursor: wait;
        }

        .bc-request-contact {
            display: block;
            margin-top: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
        }


        .bc-request-accepted {
            margin-top: 12px;
            padding: 10px 13px;
            border-radius: 10px;
            background: #dcfce7;
            color: #15803d;
            font-size: 12px;
            font-weight: 800;
        }

        .bc-request-empty {
            padding: 35px 20px;
            text-align: center;
            color: var(--muted, #64748b);
            border: 1px dashed var(--border, #cbd5e1);
            border-radius: 16px;
        }

        .bc-request-empty strong {
            display: block;
            color: var(--text, #111827);
        }

        .bc-request-empty-icon {
            display: block;
            margin-bottom: 8px;
            font-size: 30px;
        }

        .bc-request-refresh {
            margin-top: 10px;
            padding: 9px 15px;
            border: 0;
            border-radius: 10px;
            background: #ef4444;
            color: white;
            cursor: pointer;
            font-weight: 700;
        }

        [data-theme="dark"]
        .bc-incoming-requests {
            background: #111827;
            border-color: #273449;
        }

        [data-theme="dark"]
        .bc-request-item {
            background: #172033;
            border-color: #334155;
        }

        [data-theme="dark"]
        .bc-request-main strong,
        [data-theme="dark"]
        .bc-request-empty strong {
            color: #f8fafc;
        }

        [data-theme="dark"]
        .bc-request-meta,
        [data-theme="dark"]
        .bc-request-message,
        [data-theme="dark"]
        .bc-request-date,
        [data-theme="dark"]
        .bc-request-empty {
            color: #94a3b8;
        }

        @media (max-width: 700px) {

            .bc-incoming-requests {
                padding: 18px;
            }

            .bc-request-item {
                grid-template-columns: 52px 1fr;
            }

            .bc-request-blood {
                width: 50px;
                height: 50px;
            }

            .bc-request-side {
                grid-column: 2;
                min-width: 0;
                text-align: left;
            }
        }
    `;


    document.head.appendChild(
        style
    );
}


/* =====================================================
   INCOMING REQUEST UI
   ===================================================== */

function ensureIncomingRequestsUI() {

    const dashboard =
        $("dashboard");


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
        document.createElement(
            "section"
        );


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

        container.appendChild(
            section
        );
    }


    return section;
}


/* =====================================================
   RENDER INCOMING REQUESTS
   ===================================================== */

function renderIncomingBloodRequests(
    requests
) {

    ensureIncomingRequestsUI();


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


    if (
        safeRequests.length === 0
    ) {

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
            .map(
                request => {

                    const urgency =
                        request.urgency ||
                        "Normal";


                    const urgencyClass =
                        getUrgencyClass(
                            urgency
                        );


                    return `

                        <article
                            class="bc-request-item"
                        >

                            <div
                                class="bc-request-blood"
                            >

                                ${escapeHtml(
                                    request.blood_group ||
                                    "—"
                                )}

                            </div>


                            <div
                                class="bc-request-main"
                            >

                                <strong>

                                    ${escapeHtml(
                                        request.patient_name ||
                                        "Patient"
                                    )}

                                </strong>


                                <div
                                    class="bc-request-meta"
                                >

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


                                <div
                                    class="bc-request-message"
                                >

                                    ${escapeHtml(
                                        request.message ||
                                        "No additional message provided."
                                    )}

                                </div>

                            </div>


                            <div
                                class="bc-request-side"
                            >

                                <span
                                    class="bc-request-urgency ${urgencyClass}"
                                >

                                    ${escapeHtml(
                                        urgency
                                    )}

                                </span>


                                <div
                                    class="bc-request-date"
                                >

                                    Needed:

                                    ${escapeHtml(
                                        formatRequestDate(
                                            request.required_date
                                        )
                                    )}

                                </div>


                                <div
                                    class="bc-request-date"
                                >

                                    ${escapeHtml(
                                        formatRequestDateTime(
                                            request.created_at
                                        )
                                    )}

                                </div>


                                ${
    request.status ===
    "Accepted"

        ? `
            <div
                class="bc-request-accepted"
            >
                ✓ Request Accepted
            </div>

            <div
                class="bc-requester-info"
            >
                <strong>
                    Requester:
                    ${escapeHtml(
                        request.requester_name ||
                        "Requester"
                    )}
                </strong>

                ${
                    request.requester_phone
                        ? `
                            <br>

                            <a
                                class="bc-request-contact"
                                href="tel:${escapeHtml(
                                    request.requester_phone
                                )}"
                            >
                                📞 Contact
                                ${escapeHtml(
                                    request.requester_name ||
                                    "Requester"
                                )}
                            </a>
                        `
                        : `
                            <br>
                            <span>
                                Contact number unavailable
                            </span>
                        `
                }
            </div>
        `

        : `
            <button
                type="button"
                class="bc-request-accept"
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
                }
            )
            .join("");


    list
        .querySelectorAll(
            ".bc-request-accept"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const requestId =
                            Number(
                                button.dataset
                                    .requestId
                            );


                        acceptBloodRequest(
                            requestId,
                            button
                        );
                    }
                );
            }
        );
}


/* =====================================================
   LOAD INCOMING REQUESTS
   ===================================================== */

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

        if (
            !silent &&
            list
        ) {

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
            Number(
                donorId
            );


        const requests =
            data.requests ||
            [];


        if (!requests.length) {

            $("bcIncomingRequestsSection")?.remove();

            incomingRequestsLoadedFor = null;

            return;
        }


        renderIncomingBloodRequests(
            requests
        );


    } catch (error) {

        console.error(
            "Incoming blood requests error:",
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
                    () =>
                        loadIncomingBloodRequests(
                            donorId
                        )
                );
        }
    }
}


/* =====================================================
   ACCEPT BLOOD REQUEST
   ===================================================== */

async function acceptBloodRequest(
    requestId,
    button
) {

    const donor =
        getLoggedInDonor();


    if (!donor?.id) {

        showNotification(
            "Please login again before accepting a request.",
            "error"
        );

        return;
    }


    const id =
        Number(requestId);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        showNotification(
            "Invalid blood request.",
            "error"
        );

        return;
    }


    if (button) {

        button.disabled =
            true;


        button.textContent =
            "Accepting...";
    }


    try {

        const response =
            await fetch(
                `/api/blood-requests/${encodeURIComponent(
                    id
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
                                Number(
                                    donor.id
                                )
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


        /*
         * Tell requester tab that the request
         * has changed.
         *
         * Because localStorage is shared,
         * Digeesh's browser tab receives this.
         */

        localStorage.setItem(
            "bloodconnect-request-status-updated",
            `${id}-Accepted-${Date.now()}`
        );


        showNotification(
            "✓ Blood request accepted successfully!",
            "success"
        );


        await loadIncomingBloodRequests(
            donor.id,
            true
        );


    } catch (error) {

        console.error(
            "Accept blood request error:",
            error
        );


        showNotification(
            error.message ||
            "Unable to accept this blood request.",
            "error"
        );


        if (button) {

            button.disabled =
                false;


            button.textContent =
                "❤️ I Can Donate";
        }
    }
}


/* =====================================================
   🔔 CROSS-TAB ACCEPTANCE DETECTION
   ===================================================== */

function setupCrossTabAcceptanceListener() {

    window.addEventListener(
        "storage",
        event => {

            if (event.key !== "bloodconnect-request-status-updated") {
                return;
            }

            const raw = String(event.newValue || "");
            const parts = raw.split("-");
            const requestId = Number(parts[0]);
            const status = parts[1];

            if (
                !Number.isInteger(requestId) ||
                requestId <= 0 ||
                status !== "Accepted"
            ) {
                return;
            }

            const donor = getLoggedInDonor();

            if (!donor?.id) {
                return;
            }

            fetch(
                `/api/blood-requests/${encodeURIComponent(requestId)}`
            )
                .then(response => response.json())
                .then(data => {

                    if (!data?.success || !data.request) {
                        return;
                    }

                    const request = data.request;

                    if (
                        Number(request.requester_id) ===
                        Number(donor.id)
                    ) {
                        ensureRequesterStatusUI();
                        loadRequesterRequestStatus(requestId);
                        return;
                    }

                    if (
                        Number(request.donor_id) ===
                        Number(donor.id)
                    ) {
                        loadIncomingBloodRequests(
                            donor.id,
                            true
                        );
                    }
                })
                .catch(error =>
                    console.error(
                        "Cross-tab acceptance error:",
                        error
                    )
                );
        }
    );
}

/* =====================================================
   DASHBOARD NAVIGATION
   ===================================================== */

function setupDashboardNavigation() {

    const dashboard =
        $("dashboard");


    if (!dashboard) {
        return;
    }


    dashboard
        .querySelectorAll(
            "a, button"
        )
        .forEach(
            link => {

                const text =
                    link.textContent
                        .trim()
                        .toLowerCase();


                if (
                    !text.includes(
                        "blood requests"
                    )
                ) {
                    return;
                }


                link.addEventListener(
                    "click",
                    event => {

                        const donor =
                            getLoggedInDonor();


                        if (
                            !donor?.id
                        ) {
                            return;
                        }


                        event.preventDefault();


                        const section =
                            ensureIncomingRequestsUI();


                        loadIncomingBloodRequests(
                            donor.id
                        );


                        loadRequesterRequestsForDashboard(
                            donor.id
                        );


                        section
                            ?.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "start"
                            });
                    }
                );
            }
        );
}


/* =====================================================
   LOGOUT
   ===================================================== */

function logout() {

    $("dashboard")
        ?.classList.remove(
            "show"
        );


    if ($("login")) {

        $("login").style.display =
            "";
    }


    /*
     * Remove login identity.
     *
     * IMPORTANT:
     *
     * DO NOT remove
     * bloodconnect-last-request.
     *
     * The requester needs the request ID
     * even after donor logout.
     */

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


    stopRequesterStatusPolling();


    selectedDonorId =
        null;


    incomingRequestsLoadedFor =
        null;


    $("bcIncomingRequests")
        ?.remove();


    $("bcRequesterStatus")
        ?.remove();


    updateNavbarForLoginState(
        false
    );


    showNotification(
        "You have been logged out.",
        "success"
    );
}


/* =====================================================
   SMOOTH NAVIGATION
   ===================================================== */

function setupSmoothNavigation() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    event => {

                        const targetId =
                            link.getAttribute(
                                "href"
                            );


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
                            targetId ===
                            "#login"
                        ) {

                            $("dashboard")
                                ?.classList.remove(
                                    "show"
                                );


                            if ($("login")) {

                                $("login").style.display =
                                    "";
                            }
                        }


                        target.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "start"
                        });
                    }
                );
            }
        );
}


/* =====================================================
   BLOOD GROUP CARDS
   ===================================================== */

function setupBloodGroupCards() {

    document
        .querySelectorAll(
            ".blood-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        const group =
                            card
                                .querySelector(
                                    "span"
                                )
                                ?.textContent
                                .trim()
                                .replace(
                                    "−",
                                    "-"
                                );


                        if (
                            group &&
                            $("bloodGroup")
                        ) {

                            $("bloodGroup")
                                .value =
                                group;
                        }


                        $("find-donor")
                            ?.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "start"
                            });
                    }
                );
            }
        );
}


/* =====================================================
   PASSWORD TOGGLE
   ===================================================== */

function setupPasswordToggle() {

    const toggle =
        $("passwordToggle");


    const input =
        $("loginPassword");


    if (
        !toggle ||
        !input
    ) {
        return;
    }


    toggle.addEventListener(
        "click",
        () => {

            const show =
                input.type ===
                "password";


            input.type =
                show
                    ? "text"
                    : "password";


            toggle.textContent =
                show
                    ? "Hide"
                    : "Show";


            toggle.setAttribute(
                "aria-label",
                show
                    ? "Hide password"
                    : "Show password"
            );
        }
    );
}


/* =====================================================
   STATS
   ===================================================== */

function animateCounter(
    element,
    target
) {

    if (!element) {
        return;
    }


    let current =
        0;


    const step =
        target / 75;


    const timer =
        setInterval(
            () => {

                current +=
                    step;


                if (
                    current >=
                    target
                ) {

                    current =
                        target;


                    clearInterval(
                        timer
                    );
                }


                element.textContent =
                    `${Math.floor(
                        current
                    ).toLocaleString()}+`;

            },
            20
        );
}


function setupStats() {

    const section =
        document.querySelector(
            ".stats-section"
        );


    if (
        !section ||
        !("IntersectionObserver" in window)
    ) {
        return;
    }


    let animated =
        false;


    new IntersectionObserver(
        entries => {

            entries.forEach(
                entry => {

                    if (
                        !entry.isIntersecting ||
                        animated
                    ) {
                        return;
                    }


                    animated =
                        true;


                    const values = [
                        1250,
                        320,
                        28,
                        98
                    ];


                    document
                        .querySelectorAll(
                            ".stat-item strong"
                        )
                        .forEach(
                            (
                                element,
                                index
                            ) => {

                                if (
                                    values[index] !==
                                    undefined
                                ) {

                                    animateCounter(
                                        element,
                                        values[index]
                                    );
                                }
                            }
                        );
                }
            );

        },
        {
            threshold:
                0.3
        }
    ).observe(
        section
    );
}


/* =====================================================
   RESTORE LOGIN
   ===================================================== */

function restoreLoggedInUser() {

    const donor =
        getLoggedInDonor();


    if (
        !donor?.id
    ) {

        updateNavbarForLoginState(
            false
        );


        /*
         * Even if not logged in,
         * the browser may have a requester
         * blood request stored.
         */

        startRequesterStatusPollingFromStorage();


        return;
    }


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
}


/* =====================================================
   EVENTS
   ===================================================== */

function setupEvents() {

    $("donorSearchForm")
        ?.addEventListener(
            "submit",
            searchDonors
        );


    $("bloodRequestForm")
        ?.addEventListener(
            "submit",
            submitBloodRequest
        );


    $("donorRegistrationForm")
        ?.addEventListener(
            "submit",
            submitRegistration
        );


    $("loginForm")
        ?.addEventListener(
            "submit",
            submitLogin
        );


    $("availabilityToggle")
        ?.addEventListener(
            "change",
            updateAvailability
        );


    $("logoutBtn")
        ?.addEventListener(
            "click",
            logout
        );


    setupMobileMenu();

    setupTheme();

    setupPasswordToggle();

    setupSmoothNavigation();

    setupBloodGroupCards();

    setupDashboardNavigation();

    setupStats();


    /*
     * NEW:
     * Cross-tab request creation detection.
     */

    setupCrossTabRequestListener();


    /*
     * NEW:
     * Cross-tab acceptance detection.
     */

    setupCrossTabAcceptanceListener();
}


/* =====================================================
   GLOBAL FUNCTIONS
   ===================================================== */

window.showNotification =
    showNotification;


window.viewDonorProfile =
    viewDonorProfile;


window.requestBlood =
    requestBlood;


window.loadIncomingBloodRequests =
    loadIncomingBloodRequests;


window.loadRequesterRequestStatus =
    loadRequesterRequestStatus;


window.acceptBloodRequest =
    acceptBloodRequest;


window.loadRequesterRequestsForDashboard =
    loadRequesterRequestsForDashboard;


window.showDashboard =
    showDashboard;


/* =====================================================
   INITIALIZATION
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupEvents();


        restoreLoggedInUser();


        /*
         * Restore latest requester request
         * after page refresh.
         */

        startRequesterStatusPollingFromStorage();


        console.log(
            "🩸 BloodConnect initialized successfully!"
        );
    }
);


console.log(
    "🩸 BLOODCONNECT SCRIPT.JS IS WORKING!"
);